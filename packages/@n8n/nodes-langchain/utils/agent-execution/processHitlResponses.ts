import { NodeConnectionTypes } from 'n8n-workflow';
import type { EngineResponse, EngineRequest, IDataObject, ExecuteNodeResult } from 'n8n-workflow';

import type { RequestResponseMetadata } from './types';

/**
 * HITL metadata type (extracted from RequestResponseMetadata for convenience)
 */
type HitlMetadata = NonNullable<RequestResponseMetadata['hitl']>;

/**
 * Result of processing HITL responses
 */
export interface HitlProcessingResult {
	/** If we need to execute gated tools, this contains the EngineRequest */
	pendingGatedToolRequest?: EngineRequest<RequestResponseMetadata>;
	/** Modified response with HITL approvals/denials properly formatted */
	processedResponse: EngineResponse<RequestResponseMetadata>;
	/** Whether any HITL tools were approved and need gated tool execution */
	hasApprovedHitlTools: boolean;
}

/**
 * Check if an action response is from an HITL tool
 */
function isHitlActionResponse(
	actionResponse: ExecuteNodeResult<RequestResponseMetadata>,
): actionResponse is ExecuteNodeResult<RequestResponseMetadata> & {
	action: { metadata: RequestResponseMetadata & { hitl: HitlMetadata } };
} {
	const hitl = (actionResponse.action?.metadata as { hitl?: HitlMetadata } | undefined)?.hitl;
	return hitl !== undefined;
}

/**
 * Type guard to check if data contains an approval field
 */
function isApprovalData(data: unknown): data is { approved: boolean } {
	return (
		typeof data === 'object' &&
		data !== null &&
		'approved' in data &&
		typeof (data as Record<string, unknown>).approved === 'boolean'
	);
}

/**
 * Extract approval status from HITL response data.
 * SendAndWait webhook returns { approved: boolean } or { data: { approved: boolean } }
 */
function getApprovalStatus(
	actionResponse: ExecuteNodeResult<RequestResponseMetadata>,
): boolean | undefined {
	const json = actionResponse.data?.data?.ai_tool?.[0]?.[0]?.json;

	if (isApprovalData(json)) {
		return json.approved;
	}

	const nestedData = (json as IDataObject | undefined)?.data;
	if (isApprovalData(nestedData)) {
		return nestedData.approved;
	}

	return undefined;
}

function getDenialMessage(toolName: string, toolId: string): string {
	return `User rejected the tool call for ${toolName} with id ${toolId}. STOP what you are doing and wait for the user to tell you how to proceed. The tool is still available if needed.`;
}

/**
 * Process HITL (Human-in-the-Loop) tool responses.
 *
 * When the Agent receives responses from HITL tools:
 * 1. Check if the response indicates approval or denial
 * 2. If approved: Generate EngineRequest for the gated tool
 * 3. If denied: Modify response to indicate denial so Agent knows not to retry
 *
 * This enables the flow:
 * Agent calls tool → HITL intercepts → sendAndWait → User approves →
 * Agent generates new request for gated tool → Gated tool executes → Result to Agent
 */
export function processHitlResponses(
	response: EngineResponse<RequestResponseMetadata> | undefined,
	itemIndex: number,
): HitlProcessingResult {
	if (!response || !response.actionResponses || response.actionResponses.length === 0) {
		return {
			processedResponse: response ?? { actionResponses: [], metadata: {} },
			hasApprovedHitlTools: false,
		};
	}

	const pendingGatedToolActions: EngineRequest<RequestResponseMetadata>['actions'] = [];
	const processedActionResponses: Array<ExecuteNodeResult<RequestResponseMetadata>> = [];
	let hasApprovedHitlTools = false;

	for (const actionResponse of response.actionResponses) {
		if (!isHitlActionResponse(actionResponse)) {
			// Not an HITL tool, pass through unchanged
			processedActionResponses.push(actionResponse);
			continue;
		}

		const { hitl } = actionResponse.action.metadata;
		const approved = getApprovalStatus(actionResponse);
		const toolName = hitl.gatedToolNodeName;
		const toolId = actionResponse.action.id;
		if (approved === true) {
			hasApprovedHitlTools = true;

			const input =
				typeof hitl.originalInput === 'object'
					? { tool: hitl.toolName, ...hitl.originalInput }
					: { tool: hitl.toolName, input: hitl.originalInput };

			pendingGatedToolActions.push({
				actionType: 'ExecutionNodeAction' as const,
				nodeName: hitl.gatedToolNodeName,
				input,
				type: NodeConnectionTypes.AiTool,
				id: toolId,
				metadata: {
					itemIndex,
					// Set the parent node to the HITL node for proper log tree structure
					parentNodeName: actionResponse.action.nodeName,
				},
			});
		} else {
			const modifiedResponse: ExecuteNodeResult<RequestResponseMetadata> = {
				...actionResponse,
				data: {
					...actionResponse.data,
					data: {
						ai_tool: [
							[
								{
									json: {
										id: toolId,
										response: getDenialMessage(toolName, toolId),
										approved: false,
									},
								},
							],
						],
					},
				},
			};
			processedActionResponses.push(modifiedResponse);
		}
	}

	const result: HitlProcessingResult = {
		processedResponse: {
			...response,
			actionResponses: processedActionResponses,
		},
		hasApprovedHitlTools,
	};

	if (pendingGatedToolActions.length > 0) {
		result.pendingGatedToolRequest = {
			actions: pendingGatedToolActions,
			metadata: {
				previousRequests: response.metadata?.previousRequests,
			},
		};
	}

	return result;
}
