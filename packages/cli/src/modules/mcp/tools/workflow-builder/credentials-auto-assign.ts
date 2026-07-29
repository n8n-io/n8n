import type { AiGatewayConfigDto } from '@n8n/api-types';
import type { User } from '@n8n/db';
import type { INode, INodeParameters, INodeTypeDescription, IWorkflowBase } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { NodeTypes } from '@/node-types';
import type { AiGatewayService } from '@/services/ai-gateway.service';
import type { Telemetry } from '@/telemetry';

import {
	checkAiGatewayEligibility,
	type AiGatewayEligibilityReason,
} from './ai-gateway-eligibility';
import { MCP_CREDENTIALS_AUTOASSIGN_EVENT } from '../../mcp.constants';

/** Display name written into AI Gateway-managed credential sentinels. User-facing brand. */
const AI_GATEWAY_CREDENTIAL_NAME = 'n8n credits';

export interface CredentialAssignment {
	nodeName: string;
	credentialName: string;
	credentialType: string;
	source?: 'user' | 'aiGateway';
}

export type SlotSource = 'user' | 'aiGateway' | 'none';

export type ReasonNotAiGateway = AiGatewayEligibilityReason | 'notAvailable';

export interface SlotOutcome {
	nodeName: string;
	credentialType: string;
	source: SlotSource;
	hadUserCredential: boolean;
	aiGatewayAvailable: boolean;
	reasonNotAiGateway?: ReasonNotAiGateway;
}

export interface AutoAssignResult {
	assignments: CredentialAssignment[];
	skippedHttpNodes: string[];
	outcomes: SlotOutcome[];
}

/**
 * Telemetry payload for the `MCP credentials autoassign` event. Reuses `SlotSource`
 * and `ReasonNotAiGateway` so the tracked values stay aligned with the slot outcomes.
 */
export type McpCredentialsAutoassignEventPayload = {
	user_id: string;
	tool_name: 'create_workflow_from_code' | 'update_workflow';
	node_type: string;
	credential_type: string;
	source: SlotSource;
	had_user_credential: boolean;
	ai_gateway_available: boolean;
	reason_not_ai_gateway?: ReasonNotAiGateway;
};

const HTTP_NODE_TYPES = new Set([
	'n8n-nodes-base.httpRequest',
	'@n8n/n8n-nodes-langchain.toolHttpRequest',
	'n8n-nodes-base.httpRequestTool',
]);

/**
 * Normalizes n8n Connect (`__aiGatewayManaged`) markers on the given nodes.
 *
 * The marker is server-assigned, so it must correspond to an eligible slot. For every
 * marked credential — across all nodes and keys, including ones `autoPopulateNodeCredentials`
 * skips (HTTP/disabled nodes, undeclared keys) — the marker is kept (canonicalized to the
 * sentinel) when it still passes `checkAiGatewayEligibility`, and removed otherwise.
 */
export function reconcileAiGatewayMarkers(
	nodes: INode[],
	nodeTypes: NodeTypes,
	aiGatewayConfig: AiGatewayConfigDto | undefined,
): void {
	for (const node of nodes) {
		if (!node.credentials) continue;
		const credentials = node.credentials;

		const markerTypes = Object.keys(credentials).filter(
			(credentialType) => credentials[credentialType]?.__aiGatewayManaged,
		);
		if (markerTypes.length === 0) continue;

		const nodeParameters = aiGatewayConfig ? resolveNodeParameters(node, nodeTypes) : undefined;
		if (!aiGatewayConfig || !nodeParameters) {
			for (const credentialType of markerTypes) delete credentials[credentialType];
			continue;
		}

		for (const credentialType of markerTypes) {
			if (
				checkAiGatewayEligibility(node, credentialType, aiGatewayConfig, nodeParameters).eligible
			) {
				credentials[credentialType] = {
					id: null,
					name: AI_GATEWAY_CREDENTIAL_NAME,
					__aiGatewayManaged: true,
				};
			} else {
				delete credentials[credentialType];
			}
		}
	}
}

/** Resolves a node's parameters with defaults applied, or `undefined` if its type can't be resolved. */
function resolveNodeParameters(node: INode, nodeTypes: NodeTypes): INodeParameters | undefined {
	let description: INodeTypeDescription;
	try {
		description = nodeTypes.getByNameAndVersion(node.type, node.typeVersion).description;
	} catch {
		return undefined;
	}
	return (
		NodeHelpers.getNodeParameters(
			description.properties,
			node.parameters,
			true,
			false,
			node,
			description,
		) ?? node.parameters
	);
}

/**
 * Auto-populates missing credentials on workflow nodes.
 *
 * Resolution order per slot:
 * 1. Explicit credential id in the node — untouched
 * 2. First usable user credential of the matching type
 * 3. AI Gateway ("n8n Connect") sentinel when eligible and `aiGatewayService` is passed
 * 4. Leave empty
 *
 * HTTP Request nodes are skipped for security.
 *
 * When `aiGatewayService` is omitted, behavior is byte-for-byte pre-change:
 * only steps 1, 2, 4 run, and `outcomes` records
 * `reasonNotAiGateway: 'notAvailable'` for any unfilled slot.
 */
export async function autoPopulateNodeCredentials(
	workflow: IWorkflowBase,
	user: User,
	nodeTypes: NodeTypes,
	credentialsService: CredentialsService,
	projectId: string,
	aiGatewayService?: AiGatewayService,
): Promise<AutoAssignResult> {
	const usableCredentials = await credentialsService.getCredentialsAUserCanUseInAWorkflow(user, {
		projectId,
	});

	const credentialsByType = new Map<string, Array<{ id: string; name: string }>>();
	for (const cred of usableCredentials) {
		const list = credentialsByType.get(cred.type) ?? [];
		list.push({ id: cred.id, name: cred.name });
		credentialsByType.set(cred.type, list);
	}

	const availability = aiGatewayService
		? await aiGatewayService.isAvailable()
		: ({ available: false } as const);
	const aiGatewayConfig: AiGatewayConfigDto | undefined = availability.available
		? availability.config
		: undefined;

	reconcileAiGatewayMarkers(workflow.nodes, nodeTypes, aiGatewayConfig);

	const assignments: CredentialAssignment[] = [];
	const skippedHttpNodes: string[] = [];
	const outcomes: SlotOutcome[] = [];

	for (const node of workflow.nodes) {
		if (node.disabled) continue;

		if (HTTP_NODE_TYPES.has(node.type)) {
			skippedHttpNodes.push(node.name);
			continue;
		}

		let nodeTypeDescription: INodeTypeDescription;
		try {
			const nodeType = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			nodeTypeDescription = nodeType.description;
		} catch {
			continue;
		}

		const credentialDescriptions = nodeTypeDescription.credentials;
		if (!credentialDescriptions?.length) continue;

		// Resolve node parameters with defaults so displayOptions evaluation
		// works for parameters not explicitly set (e.g. "authentication" defaults to "oAuth2")
		const nodeParametersWithDefaults =
			NodeHelpers.getNodeParameters(
				nodeTypeDescription.properties,
				node.parameters,
				true, // returnDefaults
				false, // returnNoneDisplayed
				node,
				nodeTypeDescription,
			) ?? node.parameters;

		for (const credDesc of credentialDescriptions) {
			const shouldDisplay = NodeHelpers.displayParameter(
				nodeParametersWithDefaults,
				credDesc,
				node,
				nodeTypeDescription,
			);
			if (!shouldDisplay) continue;

			const existing = node.credentials?.[credDesc.name];
			if (existing?.id) continue;

			// Markers were validated by reconcileAiGatewayMarkers (eligible kept, rest
			// stripped), so an eligible n8n Connect request is honored ahead of the user's
			// own credentials.
			if (existing?.__aiGatewayManaged) continue;

			const userCandidates = credentialsByType.get(credDesc.name);
			const hadUserCredential = !!userCandidates?.length;

			if (hadUserCredential) {
				node.credentials = node.credentials ?? {};
				node.credentials[credDesc.name] = {
					id: userCandidates[0].id,
					name: userCandidates[0].name,
				};
				assignments.push({
					nodeName: node.name,
					credentialName: userCandidates[0].name,
					credentialType: credDesc.name,
					source: 'user',
				});
				outcomes.push({
					nodeName: node.name,
					credentialType: credDesc.name,
					source: 'user',
					hadUserCredential: true,
					aiGatewayAvailable: !!aiGatewayConfig,
				});
				continue;
			}

			if (aiGatewayConfig) {
				const eligibility = checkAiGatewayEligibility(
					node,
					credDesc.name,
					aiGatewayConfig,
					nodeParametersWithDefaults,
				);
				if (eligibility.eligible) {
					node.credentials = node.credentials ?? {};
					node.credentials[credDesc.name] = {
						id: null,
						name: AI_GATEWAY_CREDENTIAL_NAME,
						__aiGatewayManaged: true,
					};
					assignments.push({
						nodeName: node.name,
						credentialName: AI_GATEWAY_CREDENTIAL_NAME,
						credentialType: credDesc.name,
						source: 'aiGateway',
					});
					outcomes.push({
						nodeName: node.name,
						credentialType: credDesc.name,
						source: 'aiGateway',
						hadUserCredential: false,
						aiGatewayAvailable: true,
					});
					continue;
				}
				outcomes.push({
					nodeName: node.name,
					credentialType: credDesc.name,
					source: 'none',
					hadUserCredential: false,
					aiGatewayAvailable: true,
					reasonNotAiGateway: eligibility.reason,
				});
				continue;
			}

			outcomes.push({
				nodeName: node.name,
				credentialType: credDesc.name,
				source: 'none',
				hadUserCredential: false,
				aiGatewayAvailable: false,
				reasonNotAiGateway: 'notAvailable',
			});
		}
	}

	return { assignments, skippedHttpNodes, outcomes };
}

/**
 * Emits telemetry for each slot outcome:
 *
 * - `MCP credentials autoassign` — MCP-specific detail (tool, reason a slot did not
 *   use n8n Connect, gateway availability) for every outcome.
 * - `Node credential assigned` — the cross-surface attribution funnel shared with
 *   the canvas and Instance AI, for every slot that actually received a credential.
 *   The actor is `mcp`; `credential_kind` maps the slot's origin (`aiGateway` → n8n
 *   Connect, `user` → BYOK).
 */
export function trackAutoassignOutcomes(
	telemetry: Telemetry,
	userId: string,
	toolName: 'create_workflow_from_code' | 'update_workflow',
	outcomes: SlotOutcome[],
	nodesByName?: Map<string, string>,
	workflowId?: string,
): void {
	for (const outcome of outcomes) {
		const nodeType = nodesByName?.get(outcome.nodeName) ?? outcome.nodeName;
		const payload: McpCredentialsAutoassignEventPayload = {
			user_id: userId,
			tool_name: toolName,
			node_type: nodeType,
			credential_type: outcome.credentialType,
			source: outcome.source,
			had_user_credential: outcome.hadUserCredential,
			ai_gateway_available: outcome.aiGatewayAvailable,
			...(outcome.reasonNotAiGateway ? { reason_not_ai_gateway: outcome.reasonNotAiGateway } : {}),
		};
		telemetry.track(MCP_CREDENTIALS_AUTOASSIGN_EVENT, payload);

		if (outcome.source !== 'none') {
			telemetry.track('Node credential assigned', {
				credential_type: outcome.credentialType,
				node_type: nodeType,
				workflow_id: workflowId ?? '',
				credential_kind: outcome.source === 'aiGateway' ? 'n8n_connect' : 'own',
				source: 'mcp',
			});
		}
	}
}

/**
 * Strip newCredential() stubs from parsed SDK code.
 * The SDK's newCredential() serializes to undefined via toJSON(), so after
 * deepCopy the credentials object may contain entries like { slackApi: undefined }.
 * These would fail the credential permission check, so we remove them here.
 */
export function stripNullCredentialStubs(nodes: INode[]): void {
	for (const node of nodes) {
		if (node.credentials) {
			for (const key of Object.keys(node.credentials)) {
				// Loose equality to catch both null and undefined stubs
				// eslint-disable-next-line eqeqeq
				if (node.credentials[key] == null) {
					delete node.credentials[key];
				}
			}
			if (Object.keys(node.credentials).length === 0) {
				node.credentials = undefined;
			}
		}
	}
}
