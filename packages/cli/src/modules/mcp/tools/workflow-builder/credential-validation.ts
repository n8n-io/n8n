import type { User } from '@n8n/db';
import type { INode, INodeTypeDescription, IWorkflowBase } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import type { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { NodeTypes } from '@/node-types';

import type { PartialUpdateOperation } from './workflow-operations';

export interface CredentialValidationFailure {
	ok: false;
	opIndex: number;
	error: string;
}

export interface CredentialValidationSuccess {
	ok: true;
}

export type CredentialValidationResult = CredentialValidationSuccess | CredentialValidationFailure;

export interface WorkflowCredentialValidationFailure {
	ok: false;
	error: string;
}

export type WorkflowCredentialValidationResult =
	| CredentialValidationSuccess
	| WorkflowCredentialValidationFailure;

interface NodeMeta {
	type: string;
	typeVersion: number;
	/**
	 * Node parameters, used to resolve the predefined (`nodeCredentialType`) and
	 * generic (`genericAuthType`) credential mechanisms that nodes like HTTP
	 * Request use instead of declaring service credentials statically.
	 */
	parameters?: Record<string, unknown>;
}

/**
 * Whether the node type exposes a `credentialsSelect` property with the given
 * name. Only nodes that declare such a selector (e.g. HTTP Request) genuinely
 * support binding arbitrary credential types through the `nodeCredentialType`
 * (predefined) / `genericAuthType` (generic) parameters. Gating on the property
 * stops an arbitrary node from "accepting" a credential just by carrying one of
 * those parameter values.
 */
function declaresCredentialSelect(
	description: INodeTypeDescription,
	propertyName: 'nodeCredentialType' | 'genericAuthType',
): boolean {
	return (
		description.properties?.some(
			(p) => p.name === propertyName && p.type === 'credentialsSelect',
		) ?? false
	);
}

/**
 * Whether a node accepts a given credential key.
 *
 * A node's statically-declared `credentials` only cover a subset of what some
 * nodes can actually use. HTTP Request (and similar) attach service-specific
 * credentials at runtime via the `nodeCredentialType` (predefined) and
 * `genericAuthType` (generic) parameters, which never appear in
 * `description.credentials`. We honor those parameters — like the runtime gate
 * (`CredentialsPermissionChecker.getActiveCredentialTypes`) — but only when the
 * node actually declares the matching `credentialsSelect` selector, so a node
 * can't be made to "accept" a credential just by carrying the parameter.
 */
function nodeAcceptsCredentialKey(
	description: INodeTypeDescription,
	parameters: Record<string, unknown> | undefined,
	credentialKey: string,
): boolean {
	if (description.credentials?.some((c) => c.name === credentialKey)) {
		return true;
	}

	const nodeCredentialType = parameters?.nodeCredentialType;
	if (
		typeof nodeCredentialType === 'string' &&
		nodeCredentialType === credentialKey &&
		declaresCredentialSelect(description, 'nodeCredentialType')
	) {
		return true;
	}

	const genericAuthType = parameters?.genericAuthType;
	if (
		typeof genericAuthType === 'string' &&
		genericAuthType === credentialKey &&
		declaresCredentialSelect(description, 'genericAuthType')
	) {
		return true;
	}

	return false;
}

/**
 * Scope used to determine which credentials are reachable from a workflow.
 * For an existing workflow we scope by `workflowId` (covering every project the
 * workflow is shared into); for a not-yet-saved workflow we scope by the target
 * `projectId`.
 */
export type CredentialProjectScope = { workflowId: string } | { projectId: string };

/**
 * Classification of a credential id relative to the workflow's project scope:
 * - `usable`: reachable from the workflow's project (mirrors the runtime gate).
 * - `cross-project`: the user can see it, but it lives in a project the
 *   workflow can't use, so execution would reject it.
 * - `not-found`: the credential doesn't exist or the user can't access it.
 */
type CredentialClassification =
	| { status: 'usable'; type: string }
	| { status: 'cross-project'; type: string }
	| { status: 'not-found' };

type CredentialClassifier = (credentialId: string) => Promise<CredentialClassification>;

const fail = (opIndex: number, message: string): CredentialValidationFailure => ({
	ok: false,
	opIndex,
	error: `Operation ${opIndex} failed: ${message}`,
});

/**
 * Build a classifier that mirrors the runtime credential permission gate
 * (`CredentialsPermissionChecker`): a credential is only "usable" if it is
 * reachable from the workflow's project(s), not merely accessible to the
 * calling user.
 *
 * The user-scoped `getOne` lookup is used purely as a fallback to tell a
 * genuinely missing credential apart from one that exists but belongs to a
 * different project, so we can return an actionable error message.
 */
async function buildProjectCredentialClassifier(
	user: User,
	scope: CredentialProjectScope,
	credentialsService: CredentialsService,
): Promise<CredentialClassifier> {
	const usable = await credentialsService.getCredentialsAUserCanUseInAWorkflow(user, scope);
	const usableTypeById = new Map<string, string>();
	for (const credential of usable) {
		usableTypeById.set(credential.id, credential.type);
	}

	const fallbackCache = new Map<string, CredentialClassification>();

	return async (credentialId: string): Promise<CredentialClassification> => {
		const usableType = usableTypeById.get(credentialId);
		if (usableType !== undefined) {
			return { status: 'usable', type: usableType };
		}

		const cached = fallbackCache.get(credentialId);
		if (cached) return cached;

		let classification: CredentialClassification;
		try {
			const credential = await credentialsService.getOne(user, credentialId, false);
			classification = { status: 'cross-project', type: credential.type };
		} catch (error) {
			if (error instanceof NotFoundError) {
				classification = { status: 'not-found' };
			} else {
				throw error;
			}
		}
		fallbackCache.set(credentialId, classification);
		return classification;
	};
}

/**
 * Lazily build the project credential classifier so callers that never touch a
 * credential reference don't pay for the (potentially expensive) credential
 * lookup. The classifier is memoised on first use.
 */
function createLazyClassifier(
	user: User,
	scope: CredentialProjectScope,
	credentialsService: CredentialsService,
): () => Promise<CredentialClassifier> {
	let classifierPromise: Promise<CredentialClassifier> | undefined;
	return async () => {
		classifierPromise ??= buildProjectCredentialClassifier(user, scope, credentialsService);
		return await classifierPromise;
	};
}

/**
 * Turn a credential classification into a human-readable reason, or `null` when
 * the reference is valid. Shared between the create and update validation paths
 * so both surface identical wording.
 */
function describeCredentialProblem(
	classification: CredentialClassification,
	credentialId: string,
	credentialKey: string,
): string | null {
	if (classification.status === 'not-found') {
		return `credential '${credentialId}' not found or not accessible`;
	}
	if (classification.status === 'cross-project') {
		return `credential '${credentialId}' is not usable in this workflow's project. Omit it so a credential from the project is auto-assigned, share the credential with the project, or use a credential that belongs to the project`;
	}
	if (classification.type !== credentialKey) {
		return `credential '${credentialId}' is type '${classification.type}' but '${credentialKey}' is expected`;
	}
	return null;
}

/**
 * Determine which credential types a node actively uses, mirroring the runtime
 * `CredentialsPermissionChecker.getActiveCredentialTypes`. Returns `null` when
 * the node type can't be resolved, signalling that every credential reference
 * should be checked as a safe fallback.
 */
function computeActiveCredentialTypes(node: INode, nodeTypes: NodeTypes): Set<string> | null {
	let description: INodeTypeDescription;
	try {
		description = nodeTypes.getByNameAndVersion(node.type, node.typeVersion).description;
	} catch {
		return null;
	}

	const activeTypes = new Set<string>();

	for (const credDef of description.credentials ?? []) {
		if (NodeHelpers.displayParameter(node.parameters, credDef, node, description)) {
			activeTypes.add(credDef.name);
		}
	}

	// Nodes using a predefined credential type (e.g. HTTP Request) declare the
	// active credential via the nodeCredentialType parameter rather than the
	// static credentials array.
	const { nodeCredentialType } = node.parameters;
	if (typeof nodeCredentialType === 'string' && nodeCredentialType) {
		activeTypes.add(nodeCredentialType);
	}

	// Generic credential types (e.g. HTTP Request with
	// authentication=genericCredentialType) live in genericAuthType.
	const { genericAuthType } = node.parameters;
	if (typeof genericAuthType === 'string' && genericAuthType) {
		activeTypes.add(genericAuthType);
	}

	return activeTypes;
}

/**
 * Validate every credential reference introduced by the batch against the
 * credentials reachable from the workflow's project and against the target
 * node-type's declared credential keys.
 *
 * Only credentials touched by ops in this batch are checked — pre-existing
 * credential references on nodes the agent didn't touch are left alone, so a
 * pre-existing invalid reference can't block an unrelated edit.
 *
 * The check is project-scoped to match the runtime permission gate, so a
 * credential that is accessible to the user but not reachable from the
 * workflow's project is rejected here instead of failing only at execution.
 *
 * The check is non-destructive: it only does DB reads and node-type lookups.
 * On the first failure we stop and return the offending op index so the
 * handler can surface it via the standard `Operation N failed: ...` envelope.
 */
export async function validateCredentialReferences(
	operations: PartialUpdateOperation[],
	existingWorkflow: IWorkflowBase,
	user: User,
	credentialsService: CredentialsService,
	nodeTypes: NodeTypes,
	scope: CredentialProjectScope,
): Promise<CredentialValidationResult> {
	const nameToNodeMeta = new Map<string, NodeMeta>();
	for (const node of existingWorkflow.nodes) {
		nameToNodeMeta.set(node.name, {
			type: node.type,
			typeVersion: node.typeVersion,
			parameters: node.parameters,
		});
	}

	const getClassifier = createLazyClassifier(user, scope, credentialsService);

	const checkCredentialReference = async (
		opIndex: number,
		nodeMeta: NodeMeta,
		credentialKey: string,
		credentialId: string,
	): Promise<CredentialValidationFailure | null> => {
		let description;
		try {
			description = nodeTypes.getByNameAndVersion(nodeMeta.type, nodeMeta.typeVersion).description;
		} catch {
			return null;
		}

		if (!nodeAcceptsCredentialKey(description, nodeMeta.parameters, credentialKey)) {
			return fail(
				opIndex,
				`node type '${nodeMeta.type}' does not accept credential '${credentialKey}'`,
			);
		}

		const classify = await getClassifier();
		const classification = await classify(credentialId);
		const problem = describeCredentialProblem(classification, credentialId, credentialKey);
		if (problem) return fail(opIndex, problem);

		return null;
	};

	for (let i = 0; i < operations.length; i++) {
		const op = operations[i];

		if (op.type === 'addNode') {
			const nodeMeta: NodeMeta = {
				type: op.node.type,
				typeVersion: op.node.typeVersion,
				parameters: op.node.parameters,
			};
			if (op.node.credentials) {
				for (const [key, value] of Object.entries(op.node.credentials)) {
					if (!value.id) continue;
					const failure = await checkCredentialReference(i, nodeMeta, key, value.id);
					if (failure) return failure;
				}
			}
			nameToNodeMeta.set(op.node.name, nodeMeta);
		} else if (op.type === 'renameNode') {
			const meta = nameToNodeMeta.get(op.oldName);
			if (meta) {
				nameToNodeMeta.delete(op.oldName);
				nameToNodeMeta.set(op.newName, meta);
			}
		} else if (op.type === 'removeNode') {
			nameToNodeMeta.delete(op.nodeName);
		} else if (op.type === 'updateNodeParameters') {
			// Keep tracked parameters current so a credential bound later in the
			// same batch is validated against the node's updated configuration
			// rather than its pre-batch state.
			const meta = nameToNodeMeta.get(op.nodeName);
			if (meta) {
				meta.parameters = op.replace
					? { ...op.parameters }
					: { ...(meta.parameters ?? {}), ...op.parameters };
			}
		} else if (op.type === 'setNodeParameter') {
			// Only the top-level auth selectors decide which credential a node
			// accepts (see nodeAcceptsCredentialKey); other paths don't affect it.
			const meta = nameToNodeMeta.get(op.nodeName);
			if (meta && (op.path === '/nodeCredentialType' || op.path === '/genericAuthType')) {
				meta.parameters = { ...(meta.parameters ?? {}), [op.path.slice(1)]: op.value };
			}
		} else if (op.type === 'setNodeCredential') {
			const meta = nameToNodeMeta.get(op.nodeName);
			if (!meta) continue;
			const failure = await checkCredentialReference(i, meta, op.credentialKey, op.credentialId);
			if (failure) return failure;
		}
	}

	return { ok: true };
}

/**
 * Validate every credential reference already present on a set of workflow
 * nodes against the credentials reachable from the target project.
 *
 * Used by the create-from-code path, where explicit credential ids baked into
 * the generated SDK code bypass auto-assignment (which only fills *missing*
 * credentials). Without this check, an id pointing at a credential in another
 * project would be written verbatim and only fail at execution time.
 *
 * Mirrors the runtime permission gate: disabled nodes are skipped, and only
 * credential types the node actively uses are checked, so we don't block on a
 * binding the node wouldn't actually load.
 */
export async function validateWorkflowCredentialReferences(
	nodes: INode[],
	user: User,
	credentialsService: CredentialsService,
	nodeTypes: NodeTypes,
	projectId: string,
): Promise<WorkflowCredentialValidationResult> {
	const getClassifier = createLazyClassifier(user, { projectId }, credentialsService);

	for (const node of nodes) {
		if (node.disabled || !node.credentials) continue;

		const activeTypes = computeActiveCredentialTypes(node, nodeTypes);

		for (const [credentialKey, ref] of Object.entries(node.credentials)) {
			const credentialId = ref?.id;
			if (!credentialId) continue;
			// Skip credentials the node's current configuration doesn't load.
			if (activeTypes !== null && !activeTypes.has(credentialKey)) continue;

			const classify = await getClassifier();
			const classification = await classify(credentialId);
			const problem = describeCredentialProblem(classification, credentialId, credentialKey);
			if (problem) {
				return { ok: false, error: `Node "${node.name}": ${problem}` };
			}
		}
	}

	return { ok: true };
}
