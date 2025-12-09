import { NodeConnectionTypes, LoggerProxy } from 'n8n-workflow';
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
	/** Whether any HITL tools are awaiting approval (need another cycle) */
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
	return !!hitl?.isHitlTool;
}

/**
 * Extract approval status from HITL response data
 * SendAndWait webhook returns { data: { approved: boolean } }
 */
function getApprovalStatus(
	actionResponse: ExecuteNodeResult<RequestResponseMetadata>,
): boolean | undefined {
	const data = actionResponse.data?.data?.ai_tool?.[0]?.[0]?.json;
	// Check for approval data in various possible locations
	if (typeof data === 'object' && data !== null) {
		// Direct approval field
		if ('approved' in data && typeof data.approved === 'boolean') {
			return data.approved;
		}
		// Nested in data object (webhook response format)
		const nestedData = (data as IDataObject).data as IDataObject | undefined;
		if (nestedData && 'approved' in nestedData && typeof nestedData.approved === 'boolean') {
			return nestedData.approved;
		}
	}
	return undefined;
}

/**
 * Process HITL (Human-in-the-Loop) tool responses.
 *
 * When the Agent receives responses from HITL tools:
 * 1. Check if the response indicates approval or denial
 * 2. If approved: Generate EngineRequest for the gated tool (originalSourceNodeName)
 * 3. If denied: Modify response to indicate denial so Agent knows not to retry
 *
 * This enables the flow:
 * Agent calls tool → HITL intercepts → sendAndWait → User approves →
 * Agent generates new request for gated tool → Gated tool executes → Result to Agent
 *
 * @param response - The engine response containing tool call results
 * @param itemIndex - The current item index
 * @returns Processing result with pending requests and modified response
 */
export function processHitlResponses(
	response: EngineResponse<RequestResponseMetadata> | undefined,
	itemIndex: number,
): HitlProcessingResult {
	LoggerProxy.debug('[HITL] processHitlResponses called', {
		hasResponse: !!response,
		actionResponseCount: response?.actionResponses?.length ?? 0,
		itemIndex,
	});

	if (!response || !response.actionResponses || response.actionResponses.length === 0) {
		return {
			processedResponse: response ?? { actionResponses: [], metadata: {} },
			hasApprovedHitlTools: false,
		};
	}

	// Debug: log action structure
	for (const actionResponse of response.actionResponses) {
		LoggerProxy.debug('[HITL] Inspecting actionResponse', {
			hasAction: !!actionResponse.action,
			actionKeys: actionResponse.action ? Object.keys(actionResponse.action) : [],
			actionMetadata: actionResponse.action?.metadata,
			dataKeys: actionResponse.data ? Object.keys(actionResponse.data) : [],
		});
	}

	const pendingGatedToolActions: EngineRequest<RequestResponseMetadata>['actions'] = [];
	const processedActionResponses: ExecuteNodeResult<RequestResponseMetadata>[] = [];
	let hasApprovedHitlTools = false;

	for (const actionResponse of response.actionResponses) {
		if (!isHitlActionResponse(actionResponse)) {
			// Not an HITL tool, pass through unchanged
			processedActionResponses.push(actionResponse);
			continue;
		}

		const hitl = actionResponse.action.metadata.hitl as HitlMetadata;
		const approved = getApprovalStatus(actionResponse);

		LoggerProxy.debug('[HITL] Processing HITL tool response', {
			toolName: hitl.toolName,
			originalSourceNodeName: hitl.originalSourceNodeName,
			approved,
			itemIndex,
		});

		if (approved === true) {
			// Approved! Generate EngineRequest for the gated tool
			hasApprovedHitlTools = true;

			LoggerProxy.debug('[HITL] Tool approved - generating request for gated tool', {
				gatedToolNodeName: hitl.originalSourceNodeName,
				originalInput: hitl.originalInput,
			});

			pendingGatedToolActions.push({
				actionType: 'ExecutionNodeAction' as const,
				nodeName: hitl.originalSourceNodeName,
				input: hitl.originalInput,
				type: NodeConnectionTypes.AiTool,
				id: `hitl_approved_${actionResponse.action.id}`,
				metadata: {
					itemIndex,
					// Mark this as a follow-up from HITL approval
					hitlApprovalFollowUp: {
						originalHitlActionId: actionResponse.action.id,
						hitlToolName: hitl.toolName,
						hitlNodeName: actionResponse.action.nodeName, // HITL node name for logs panel
						// HITL node's run index - typically 0 for first execution
						// This ensures gated tools appear under the correct HITL run in logs
						hitlNodeRunIndex: 0,
					},
				},
			});

			// Don't include the HITL response in processed responses
			// The gated tool's response will replace it
		} else if (approved === false) {
			// Denied - modify the response to clearly indicate denial
			LoggerProxy.debug('[HITL] Tool denied by human reviewer', {
				toolName: hitl.toolName,
			});

			const modifiedResponse: ExecuteNodeResult<RequestResponseMetadata> = {
				...actionResponse,
				data: {
					...actionResponse.data,
					data: {
						ai_tool: [
							[
								{
									json: {
										response: `Tool "${hitl.toolName}" execution was denied by human reviewer. Do not attempt this tool call again.`,
										approved: false,
										deniedTool: hitl.toolName,
									},
								},
							],
						],
					},
				},
			};
			processedActionResponses.push(modifiedResponse);
		} else {
			// Unknown approval status - pass through with warning
			LoggerProxy.warn('[HITL] Could not determine approval status from HITL response', {
				toolName: hitl.toolName,
				responseData: actionResponse.data,
			});
			processedActionResponses.push(actionResponse);
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
