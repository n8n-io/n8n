/**
 * Setup workflow service — encapsulates all logic for analyzing workflow nodes,
 * building setup requests, sorting by execution order, and applying user changes.
 *
 * Separated from the tool definition so the tool stays a thin suspend/resume
 * state machine, and this logic is testable independently.
 */
import { hasPlaceholderDeep } from '@n8n/utils';
import type { IDataObject, NodeJSON, DisplayOptions } from '@n8n/workflow-sdk';
import { matchesDisplayOptions } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';

import type { SetupRequest } from './setup-workflow.schema';
import type { InstanceAiContext } from '../../types';

// ── Credential cache ────────────────────────────────────────────────────────

/** Cache for deduplicating credential fetches across nodes with the same types. */
export interface CredentialCache {
	/** Credential list promises, keyed by credential type. */
	lists: Map<string, Promise<Array<{ id: string; name: string }>>>;
	/** Testability check promises, keyed by credential type. */
	testability: Map<string, Promise<boolean>>;
	/** Credential test result promises, keyed by credential ID. */
	tests: Map<string, Promise<{ success: boolean; message?: string }>>;
}

export function createCredentialCache(): CredentialCache {
	return { lists: new Map(), testability: new Map(), tests: new Map() };
}

// ── Node analysis ───────────────────────────────────────────────────────────

/**
 * Build setup request(s) from a single WorkflowJSON node.
 * Detects credential types, auto-selects the most recent credential,
 * tests testable credentials, determines trigger eligibility, and
 * computes parameter issues with editable parameter definitions.
 */
export async function buildSetupRequests(
	context: InstanceAiContext,
	node: NodeJSON,
	triggerTestResult?: { status: 'success' | 'error' | 'listening'; error?: string },
	cache?: CredentialCache,
): Promise<SetupRequest[]> {
	if (!node.name) return [];
	if (node.disabled) return [];

	const typeVersion = node.typeVersion ?? 1;
	const parameters = (node.parameters as Record<string, unknown>) ?? {};

	const nodeDesc = await context.nodeService
		.getDescription(node.type, typeVersion)
		.catch(() => undefined);

	const isTrigger = nodeDesc?.group?.includes('trigger') ?? false;
	const isTestable =
		isTrigger &&
		((nodeDesc?.webhooks !== undefined && nodeDesc.webhooks.length > 0) ||
			nodeDesc?.polling === true ||
			nodeDesc?.triggerPanel !== undefined);

	// Compute parameter issues
	let parameterIssues: Record<string, string[]> = {};
	if (context.nodeService.getParameterIssues) {
		parameterIssues = await context.nodeService
			.getParameterIssues(node.type, typeVersion, parameters)
			.catch(() => ({}));
	}

	// Also treat placeholder values as parameter issues so the setup wizard surfaces them
	for (const [paramName, paramValue] of Object.entries(parameters)) {
		if (!parameterIssues[paramName] && hasPlaceholderDeep(paramValue)) {
			parameterIssues[paramName] = ['Contains a placeholder value - please provide the real value'];
		}
	}

	// Build editable parameter definitions for parameters that have issues
	let editableParameters: SetupRequest['editableParameters'];
	if (Object.keys(parameterIssues).length > 0 && nodeDesc?.properties) {
		editableParameters = [];
		for (const paramName of Object.keys(parameterIssues)) {
			const prop = nodeDesc.properties.find((p) => p.name === paramName);
			if (!prop) continue;
			editableParameters.push({
				name: prop.name,
				displayName: prop.displayName,
				type: prop.type,
				...(prop.required !== undefined ? { required: prop.required } : {}),
				...(prop.default !== undefined ? { default: prop.default } : {}),
				...(prop.options
					? {
							options: prop.options as SetupRequest['editableParameters'] extends Array<infer T>
								? T extends { options?: infer O }
									? O
									: never
								: never,
						}
					: {}),
			});
		}
	}

	let credentialTypes: string[] = [];
	if (context.nodeService.getNodeCredentialTypes) {
		credentialTypes = await context.nodeService
			.getNodeCredentialTypes(
				node.type,
				typeVersion,
				parameters,
				node.credentials as Record<string, unknown> | undefined,
			)
			.catch(() => []);
	}

	// Fallback: if dynamic detection returned nothing, check the node description's
	// static credentials list and already-assigned credentials on the node.
	// This catches cases where getNodeCredentialTypes fails silently (e.g. node
	// lookup miss) or isn't available.
	if (credentialTypes.length === 0) {
		const nodeCredTypes = node.credentials ? Object.keys(node.credentials) : [];
		if (nodeCredTypes.length > 0) {
			credentialTypes = nodeCredTypes;
		} else if (nodeDesc?.credentials) {
			// Only include credentials whose displayOptions match the current parameters.
			// Mirrors the evaluation in instance-ai.adapter.service.ts getNodeCredentialTypes().
			credentialTypes = nodeDesc.credentials
				.filter((c: { name?: string; displayOptions?: unknown }) => {
					if (!c.displayOptions) return true;
					return matchesDisplayOptions(
						{ parameters, nodeVersion: typeVersion },
						c.displayOptions as DisplayOptions,
					);
				})
				.map((c: { name?: string }) => c.name)
				.filter((n): n is string => n !== undefined);
		}
	}

	// Dynamic credential resolution for nodes that use genericCredentialType
	// or predefinedCredentialType (e.g. HTTP Request). The credential type name
	// is stored in the node parameters rather than the description's credentials array.
	if (credentialTypes.length === 0) {
		const authentication = parameters.authentication;
		if (
			authentication === 'genericCredentialType' &&
			typeof parameters.genericAuthType === 'string'
		) {
			credentialTypes = [parameters.genericAuthType];
		} else if (
			authentication === 'predefinedCredentialType' &&
			typeof parameters.nodeCredentialType === 'string'
		) {
			credentialTypes = [parameters.nodeCredentialType];
		}
	}

	const nodeId = node.id ?? nanoid();
	const nodePosition: [number, number] = node.position ?? [0, 0];
	const hasParamIssues = Object.keys(parameterIssues).length > 0;

	const requests: SetupRequest[] = [];
	const processedCredTypes = credentialTypes.length > 0 ? credentialTypes : [undefined];

	for (const credentialType of processedCredTypes) {
		let existingCredentials: Array<{ id: string; name: string }> = [];
		let isAutoApplied = false;
		let credentialTestResult: { success: boolean; message?: string } | undefined;
		const nodeCredentials = node.credentials
			? Object.fromEntries(
					Object.entries(node.credentials)
						.filter(([, v]) => v.id !== undefined)
						.map(([k, v]) => [k, { id: v.id!, name: v.name }]),
				)
			: undefined;

		if (credentialType) {
			// Use cache to avoid duplicate fetches for the same credential type across nodes
			let listPromise = cache?.lists.get(credentialType);
			if (!listPromise) {
				listPromise = context.credentialService
					.list({ type: credentialType })
					.then((creds) => creds.map((c) => ({ id: c.id, name: c.name })));
				cache?.lists.set(credentialType, listPromise);
			}
			const sortedCreds = await listPromise;
			existingCredentials = sortedCreds.map((c) => ({ id: c.id, name: c.name }));

			const existingOnNode = node.credentials?.[credentialType];
			if (!existingOnNode?.id && existingCredentials.length > 0) {
				isAutoApplied = true;
				if (nodeCredentials) {
					nodeCredentials[credentialType] = {
						id: existingCredentials[0].id,
						name: existingCredentials[0].name,
					};
				}
			}

			const credToTest =
				existingOnNode?.id ?? (isAutoApplied ? existingCredentials[0]?.id : undefined);
			if (credToTest) {
				let testabilityPromise = cache?.testability.get(credentialType);
				if (!testabilityPromise) {
					testabilityPromise = context.credentialService.isTestable
						? context.credentialService.isTestable(credentialType).catch(() => true)
						: Promise.resolve(true);
					cache?.testability.set(credentialType, testabilityPromise);
				}
				const canTest = await testabilityPromise;

				if (canTest) {
					let testPromise = cache?.tests.get(credToTest);
					if (!testPromise) {
						testPromise = context.credentialService.test(credToTest).catch((testError) => ({
							success: false,
							message: testError instanceof Error ? testError.message : 'Test failed',
						}));
						cache?.tests.set(credToTest, testPromise);
					}
					credentialTestResult = await testPromise;
				}
			}
		}

		if (!credentialType && !isTrigger && !hasParamIssues) continue;
		if (!credentialType && isTrigger && !isTestable && !hasParamIssues) continue;

		// Determine whether this request still needs user intervention.
		// A credential request needs action if no credential is set or the test failed.
		// A parameter request needs action if issues remain.
		// A trigger-only request (no credential, no param issues) never blocks apply.
		let needsAction = false;
		if (credentialType) {
			const existingOnNode = node.credentials?.[credentialType];
			const hasValidCredential =
				existingOnNode?.id !== undefined &&
				(credentialTestResult === undefined || credentialTestResult.success);
			needsAction = !hasValidCredential;
		}
		if (hasParamIssues) {
			needsAction = true;
		}

		const request: SetupRequest = {
			node: {
				name: node.name,
				type: node.type,
				typeVersion,
				parameters,
				position: nodePosition,
				id: nodeId,
				...(nodeCredentials && Object.keys(nodeCredentials).length > 0
					? {
							credentials:
								isAutoApplied && credentialType && existingCredentials.length > 0
									? {
											...nodeCredentials,
											[credentialType]: {
												id: existingCredentials[0].id,
												name: existingCredentials[0].name,
											},
										}
									: nodeCredentials,
						}
					: isAutoApplied && credentialType && existingCredentials.length > 0
						? {
								credentials: {
									[credentialType]: {
										id: existingCredentials[0].id,
										name: existingCredentials[0].name,
									},
								},
							}
						: {}),
			},
			...(credentialType ? { credentialType } : {}),
			...(existingCredentials.length > 0 ? { existingCredentials } : {}),
			isTrigger,
			...(isTestable ? { isTestable } : {}),
			...(isAutoApplied ? { isAutoApplied } : {}),
			...(credentialTestResult ? { credentialTestResult } : {}),
			...(triggerTestResult ? { triggerTestResult } : {}),
			...(hasParamIssues ? { parameterIssues } : {}),
			...(editableParameters && editableParameters.length > 0 ? { editableParameters } : {}),
			needsAction,
		};

		requests.push(request);
	}

	return requests;
}

// ── Execution order ─────────────────────────────────────────────────────────

/**
 * Sort setup requests by execution order derived from workflow connections,
 * then mark the first trigger in the result.
 *
 * Algorithm: DFS from each trigger (sorted left-to-right by X position),
 * following outgoing connections. Nodes not reachable from any trigger go last.
 */
export function sortByExecutionOrder(
	requests: SetupRequest[],
	connections: Record<string, unknown>,
): void {
	// Build main outgoing adjacency (source -> destinations via 'main' outputs)
	const mainOutgoing = new Map<string, string[]>();
	// Build non-main incoming adjacency (destination -> sources via non-main inputs)
	// Non-main connections represent AI sub-nodes (tools, memory, models) attached to agent nodes
	const nonMainIncoming = new Map<string, string[]>();

	for (const [sourceName, nodeConns] of Object.entries(connections)) {
		if (typeof nodeConns !== 'object' || nodeConns === null) continue;
		for (const [connType, outputs] of Object.entries(nodeConns as Record<string, unknown>)) {
			if (!Array.isArray(outputs)) continue;
			for (const slot of outputs) {
				if (!Array.isArray(slot)) continue;
				for (const conn of slot) {
					if (typeof conn !== 'object' || conn === null || !('node' in conn)) continue;
					const destName = (conn as { node: string }).node;

					if (connType === 'main') {
						const existing = mainOutgoing.get(sourceName) ?? [];
						if (!existing.includes(destName)) existing.push(destName);
						mainOutgoing.set(sourceName, existing);
					} else {
						// Non-main connection: source is an AI sub-node of destination
						const existing = nonMainIncoming.get(destName) ?? [];
						if (!existing.includes(sourceName)) existing.push(sourceName);
						nonMainIncoming.set(destName, existing);
					}
				}
			}
		}
	}

	const triggerRequests = requests
		.filter((r) => r.isTrigger)
		.sort((a, b) => a.node.position[0] - b.node.position[0]);

	const visited = new Set<string>();
	const executionOrder: string[] = [];

	function dfs(nodeName: string): void {
		if (visited.has(nodeName)) return;
		visited.add(nodeName);

		// Visit AI sub-nodes BEFORE the parent (non-main incoming connections)
		const subNodes = nonMainIncoming.get(nodeName) ?? [];
		for (const subNode of subNodes) {
			dfs(subNode);
		}

		executionOrder.push(nodeName);

		// Follow main outgoing connections
		const children = mainOutgoing.get(nodeName) ?? [];
		for (const child of children) {
			dfs(child);
		}
	}

	for (const trigger of triggerRequests) {
		dfs(trigger.node.name);
	}

	const orderMap = new Map<string, number>();
	for (let i = 0; i < executionOrder.length; i++) {
		orderMap.set(executionOrder[i], i);
	}

	requests.sort((a, b) => {
		const aOrder = orderMap.get(a.node.name) ?? Number.MAX_SAFE_INTEGER;
		const bOrder = orderMap.get(b.node.name) ?? Number.MAX_SAFE_INTEGER;
		if (aOrder !== bOrder) return aOrder - bOrder;
		return a.node.position[0] - b.node.position[0] || a.node.position[1] - b.node.position[1];
	});

	const firstTrigger = requests.find((r) => r.isTrigger);
	if (firstTrigger) {
		firstTrigger.isFirstTrigger = true;
	}
}

// ── Workflow mutation ───────────────────────────────────────────────────────

/** Result of applying credentials or parameters to workflow nodes. */
export interface ApplyResult {
	applied: string[];
	failed: Array<{ nodeName: string; error: string }>;
}

/** Apply per-node credentials from resume data to a workflow. */
export async function applyNodeCredentials(
	context: InstanceAiContext,
	workflowId: string,
	nodeCredentials: Record<string, Record<string, string>>,
): Promise<ApplyResult> {
	const result: ApplyResult = { applied: [], failed: [] };
	const workflowJson = await context.workflowService.getAsWorkflowJSON(workflowId);

	for (const node of workflowJson.nodes) {
		if (!node.name) continue;
		const credsMap = nodeCredentials[node.name];
		if (!credsMap) continue;

		let nodeSucceeded = true;
		for (const [credType, credId] of Object.entries(credsMap)) {
			try {
				const cred = await context.credentialService.get(credId);
				if (cred) {
					node.credentials = {
						...node.credentials,
						[credType]: { id: cred.id, name: cred.name },
					};
				} else {
					nodeSucceeded = false;
					result.failed.push({
						nodeName: node.name,
						error: `Credential ${credId} (type: ${credType}) not found — it may have been deleted`,
					});
				}
			} catch (error) {
				nodeSucceeded = false;
				result.failed.push({
					nodeName: node.name,
					error: `Failed to resolve credential ${credId} (type: ${credType}): ${error instanceof Error ? error.message : 'Unknown error'}`,
				});
			}
		}
		if (nodeSucceeded) {
			result.applied.push(node.name);
		}
	}

	try {
		await context.workflowService.updateFromWorkflowJSON(workflowId, workflowJson);
	} catch (error) {
		// If the final save fails, mark all previously-applied nodes as failed
		const saveError = `Failed to save workflow after credential apply: ${error instanceof Error ? error.message : 'Unknown error'}`;
		for (const nodeName of result.applied) {
			result.failed.push({ nodeName, error: saveError });
		}
		result.applied = [];
	}

	return result;
}

/** Apply per-node parameter values from resume data to a workflow. */
export async function applyNodeParameters(
	context: InstanceAiContext,
	workflowId: string,
	nodeParameters: Record<string, Record<string, unknown>>,
): Promise<ApplyResult> {
	const result: ApplyResult = { applied: [], failed: [] };
	const workflowJson = await context.workflowService.getAsWorkflowJSON(workflowId);

	for (const node of workflowJson.nodes) {
		if (!node.name) continue;
		const params = nodeParameters[node.name];
		if (!params) continue;

		try {
			node.parameters = {
				...(node.parameters ?? {}),
				...params,
			} as IDataObject;
			result.applied.push(node.name);
		} catch (error) {
			result.failed.push({
				nodeName: node.name,
				error: `Failed to merge parameters: ${error instanceof Error ? error.message : 'Unknown error'}`,
			});
		}
	}

	try {
		await context.workflowService.updateFromWorkflowJSON(workflowId, workflowJson);
	} catch (error) {
		const saveError = `Failed to save workflow after parameter apply: ${error instanceof Error ? error.message : 'Unknown error'}`;
		for (const nodeName of result.applied) {
			result.failed.push({ nodeName, error: saveError });
		}
		result.applied = [];
	}

	return result;
}

/**
 * Atomically apply both credentials and parameters to a workflow in a single
 * load-mutate-save cycle, avoiding partial-success overwrite windows.
 */
export async function applyNodeChanges(
	context: InstanceAiContext,
	workflowId: string,
	nodeCredentials?: Record<string, Record<string, string>>,
	nodeParameters?: Record<string, Record<string, unknown>>,
): Promise<ApplyResult> {
	const result: ApplyResult = { applied: [], failed: [] };
	const workflowJson = await context.workflowService.getAsWorkflowJSON(workflowId);
	const appliedNodes = new Set<string>();

	for (const node of workflowJson.nodes) {
		if (!node.name) continue;

		// Apply credentials
		const credsMap = nodeCredentials?.[node.name];
		if (credsMap) {
			let nodeSucceeded = true;
			for (const [credType, credId] of Object.entries(credsMap)) {
				try {
					const cred = await context.credentialService.get(credId);
					if (cred) {
						node.credentials = {
							...node.credentials,
							[credType]: { id: cred.id, name: cred.name },
						};
					} else {
						nodeSucceeded = false;
						result.failed.push({
							nodeName: node.name,
							error: `Credential ${credId} (type: ${credType}) not found — it may have been deleted`,
						});
					}
				} catch (error) {
					nodeSucceeded = false;
					result.failed.push({
						nodeName: node.name,
						error: `Failed to resolve credential ${credId} (type: ${credType}): ${error instanceof Error ? error.message : 'Unknown error'}`,
					});
				}
			}
			if (nodeSucceeded) appliedNodes.add(node.name);
		}

		// Apply parameters
		const params = nodeParameters?.[node.name];
		if (params) {
			try {
				node.parameters = {
					...(node.parameters ?? {}),
					...params,
				} as IDataObject;
				appliedNodes.add(node.name);
			} catch (error) {
				result.failed.push({
					nodeName: node.name,
					error: `Failed to merge parameters: ${error instanceof Error ? error.message : 'Unknown error'}`,
				});
			}
		}
	}

	// Single save for all changes
	try {
		await context.workflowService.updateFromWorkflowJSON(workflowId, workflowJson);
		result.applied = [...appliedNodes];
	} catch (error) {
		const saveError = `Failed to save workflow: ${error instanceof Error ? error.message : 'Unknown error'}`;
		for (const nodeName of appliedNodes) {
			result.failed.push({ nodeName, error: saveError });
		}
		result.applied = [];
	}

	return result;
}

// ── Partial-apply reporting ──────────────────────────────────────────────────

/** Build a report of nodes that received credentials or parameters. */
export function buildCompletedReport(
	appliedCredentials?: Record<string, Record<string, string>>,
	appliedParameters?: Record<string, Record<string, unknown>>,
): Array<{ nodeName: string; credentialType?: string; parametersSet?: string[] }> {
	const byNode = new Map<string, { credentialTypes: string[]; parameterNames: string[] }>();

	if (appliedCredentials) {
		for (const [nodeName, credMap] of Object.entries(appliedCredentials)) {
			for (const credType of Object.keys(credMap)) {
				let entry = byNode.get(nodeName);
				if (!entry) {
					entry = { credentialTypes: [], parameterNames: [] };
					byNode.set(nodeName, entry);
				}
				entry.credentialTypes.push(credType);
			}
		}
	}

	if (appliedParameters) {
		for (const [nodeName, params] of Object.entries(appliedParameters)) {
			let entry = byNode.get(nodeName);
			if (!entry) {
				entry = { credentialTypes: [], parameterNames: [] };
				byNode.set(nodeName, entry);
			}
			entry.parameterNames.push(...Object.keys(params));
		}
	}

	const result: Array<{ nodeName: string; credentialType?: string; parametersSet?: string[] }> = [];
	for (const [nodeName, entry] of byNode) {
		if (entry.credentialTypes.length > 0) {
			for (const credType of entry.credentialTypes) {
				result.push({
					nodeName,
					credentialType: credType,
					...(entry.parameterNames.length > 0 ? { parametersSet: entry.parameterNames } : {}),
				});
			}
		} else if (entry.parameterNames.length > 0) {
			result.push({ nodeName, parametersSet: entry.parameterNames });
		}
	}
	return result;
}

// ── Full workflow analysis ──────────────────────────────────────────────────

/**
 * Analyze all nodes in a workflow and produce sorted setup requests.
 * This is the main entry point — combines buildSetupRequests + sort + filter.
 */
export async function analyzeWorkflow(
	context: InstanceAiContext,
	workflowId: string,
	triggerResults?: Record<string, { status: 'success' | 'error' | 'listening'; error?: string }>,
): Promise<SetupRequest[]> {
	const workflowJson = await context.workflowService.getAsWorkflowJSON(workflowId);

	const cache = createCredentialCache();
	const allRequestArrays = await Promise.all(
		workflowJson.nodes.map(async (node) => {
			return await buildSetupRequests(context, node, triggerResults?.[node.name ?? ''], cache);
		}),
	);

	const setupRequests = allRequestArrays
		.flat()
		.filter(
			(req) =>
				req.credentialType !== undefined ||
				req.isTrigger ||
				(req.parameterIssues && Object.keys(req.parameterIssues).length > 0),
		);

	sortByExecutionOrder(
		setupRequests,
		workflowJson.connections as unknown as Record<string, unknown>,
	);

	return setupRequests;
}
