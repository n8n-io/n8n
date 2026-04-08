/**
 * setup-workflow tool — thin suspend/resume state machine.
 * All setup logic lives in setup-workflow.service.ts.
 */
import { createTool } from '@mastra/core/tools';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { setupSuspendSchema, setupResumeSchema } from './setup-workflow.schema';
import {
	analyzeWorkflow,
	applyNodeCredentials,
	applyNodeParameters,
	applyNodeChanges,
	buildCompletedReport,
} from './setup-workflow.service';
import type { InstanceAiContext } from '../../types';

export const setupWorkflowInputSchema = z.object({
	workflowId: z.string().describe('ID of the workflow to set up'),
	projectId: z.string().optional().describe('Project ID to scope credential creation to'),
});

export function createSetupWorkflowTool(context: InstanceAiContext) {
	let currentRequestId: string | null = null;
	let preTestSnapshot: WorkflowJSON | null = null;

	return createTool({
		id: 'setup-workflow',
		description:
			'Open the workflow setup UI for the user to configure credentials, parameters, and ' +
			'test triggers for all nodes in a workflow. Always use this instead of setup-credentials ' +
			'when a workflowId is available. The user handles setup through the UI — you never see ' +
			'sensitive data. Returns success when the user applies changes.',
		inputSchema: setupWorkflowInputSchema,
		outputSchema: z.object({
			success: z.boolean(),
			deferred: z.boolean().optional(),
			partial: z.boolean().optional(),
			reason: z.string().optional(),
			error: z.string().optional(),
			completedNodes: z
				.array(
					z.object({
						nodeName: z.string(),
						credentialType: z.string().optional(),
						parametersSet: z.array(z.string()).optional(),
					}),
				)
				.optional(),
			skippedNodes: z
				.array(
					z.object({
						nodeName: z.string(),
						credentialType: z.string().optional(),
					}),
				)
				.optional(),
			failedNodes: z
				.array(
					z.object({
						nodeName: z.string(),
						error: z.string(),
					}),
				)
				.optional(),
			updatedNodes: z
				.array(
					z.object({
						id: z.string(),
						name: z.string().optional(),
						type: z.string(),
						typeVersion: z.number(),
						position: z.tuple([z.number(), z.number()]),
						parameters: z.record(z.unknown()).optional(),
						credentials: z
							.record(z.object({ id: z.string().optional(), name: z.string() }))
							.optional(),
						disabled: z.boolean().optional(),
					}),
				)
				.optional(),
			updatedConnections: z.record(z.unknown()).optional(),
		}),
		suspendSchema: setupSuspendSchema,
		resumeSchema: setupResumeSchema,
		execute: async (input: z.infer<typeof setupWorkflowInputSchema>, ctx) => {
			const resumeData = ctx?.agent?.resumeData as z.infer<typeof setupResumeSchema> | undefined;
			const suspend = ctx?.agent?.suspend;

			// State 1: Analyze workflow and suspend for user setup
			if (resumeData === undefined || resumeData === null) {
				const setupRequests = await analyzeWorkflow(context, input.workflowId);

				if (setupRequests.length === 0) {
					return { success: true, reason: 'No nodes require setup.' };
				}

				currentRequestId = nanoid();

				await suspend?.({
					requestId: currentRequestId,
					message: 'Configure credentials for your workflow',
					severity: 'info' as const,
					setupRequests,
					workflowId: input.workflowId,
					...(input.projectId ? { projectId: input.projectId } : {}),
				});
				return { success: false };
			}

			// State 2: User declined — revert any trigger-test changes
			if (!resumeData.approved) {
				if (preTestSnapshot) {
					await context.workflowService.updateFromWorkflowJSON(input.workflowId, preTestSnapshot);
					preTestSnapshot = null;
				}
				return {
					success: true,
					deferred: true,
					reason: 'User skipped workflow setup for now.',
				};
			}

			// State 3: Test trigger — persist changes, run, re-suspend with result
			if (resumeData.action === 'test-trigger' && resumeData.testTriggerNode) {
				preTestSnapshot ??= await context.workflowService.getAsWorkflowJSON(input.workflowId);

				const applyFailures: Array<{ nodeName: string; error: string }> = [];
				if (resumeData.credentials) {
					const credResult = await applyNodeCredentials(
						context,
						input.workflowId,
						resumeData.credentials,
					);
					applyFailures.push(...credResult.failed);
				}
				if (resumeData.nodeParameters) {
					const paramResult = await applyNodeParameters(
						context,
						input.workflowId,
						resumeData.nodeParameters,
					);
					applyFailures.push(...paramResult.failed);
				}

				if (applyFailures.length > 0) {
					return {
						success: false,
						error: `Failed to apply setup before trigger test: ${applyFailures.map((f) => `${f.nodeName}: ${f.error}`).join('; ')}`,
						failedNodes: applyFailures,
					};
				}

				let triggerTestResult: {
					status: 'success' | 'error' | 'listening';
					error?: string;
				};
				try {
					const result = await context.executionService.run(input.workflowId, undefined, {
						timeout: 30_000,
						triggerNodeName: resumeData.testTriggerNode,
					});
					if (result.status === 'success') {
						triggerTestResult = { status: 'success' };
					} else if (result.status === 'waiting') {
						triggerTestResult = { status: 'listening' as const };
					} else {
						triggerTestResult = {
							status: 'error',
							error: result.error ?? 'Trigger test failed',
						};
					}
				} catch (error) {
					triggerTestResult = {
						status: 'error',
						error: error instanceof Error ? error.message : 'Trigger test failed',
					};
				}

				const refreshedRequests = await analyzeWorkflow(context, input.workflowId, {
					[resumeData.testTriggerNode]: triggerTestResult,
				});

				// Generate a new requestId so the frontend doesn't filter it
				// as already-resolved from the previous suspend cycle
				currentRequestId = nanoid();

				await suspend?.({
					requestId: currentRequestId,
					message: 'Configure credentials for your workflow',
					severity: 'info' as const,
					setupRequests: refreshedRequests,
					workflowId: input.workflowId,
					...(input.projectId ? { projectId: input.projectId } : {}),
				});
				return { success: false };
			}

			// State 4: Apply — save credentials and parameters atomically
			try {
				preTestSnapshot = null;

				const applyResult = await applyNodeChanges(
					context,
					input.workflowId,
					resumeData.credentials,
					resumeData.nodeParameters,
				);

				const failedNodes = applyResult.failed.length > 0 ? applyResult.failed : undefined;

				// Fetch updated workflow to include in response so the frontend can refresh the canvas
				const updatedWorkflow = await context.workflowService.getAsWorkflowJSON(input.workflowId);
				const updatedNodes = updatedWorkflow.nodes.map((node) => ({
					id: node.id,
					name: node.name,
					type: node.type,
					typeVersion: node.typeVersion,
					position: node.position,
					parameters: node.parameters as Record<string, unknown> | undefined,
					credentials: node.credentials,
					disabled: node.disabled,
				}));
				const updatedConnections = updatedWorkflow.connections as Record<string, unknown>;

				// Re-analyze to determine if any nodes still need setup.
				// Filter by needsAction to distinguish "render this card" from
				// "this still requires user intervention".
				const remainingRequests = await analyzeWorkflow(context, input.workflowId);
				const pendingRequests = remainingRequests.filter((r) => r.needsAction);
				const completedNodes = buildCompletedReport(
					resumeData.credentials,
					resumeData.nodeParameters,
				);

				// Detect credentials that were applied but failed testing.
				// Move them from completedNodes to failedNodes so the LLM knows
				// the credential is invalid rather than seeing it in both lists.
				const credTestFailures: Array<{ nodeName: string; error: string }> = [];
				for (const req of remainingRequests) {
					if (
						req.credentialTestResult &&
						!req.credentialTestResult.success &&
						req.credentialType &&
						resumeData.credentials?.[req.node.name]?.[req.credentialType]
					) {
						credTestFailures.push({
							nodeName: req.node.name,
							error: `Credential test failed for ${req.credentialType}: ${req.credentialTestResult.message ?? 'Invalid credentials'}`,
						});
					}
				}

				const credFailedNodeNames = new Set(credTestFailures.map((f) => f.nodeName));
				const validCompletedNodes = completedNodes.filter(
					(n) => !credFailedNodeNames.has(n.nodeName),
				);
				const allFailedNodes = [...(failedNodes ?? []), ...credTestFailures];
				const mergedFailedNodes = allFailedNodes.length > 0 ? allFailedNodes : undefined;

				if (pendingRequests.length > 0) {
					const skippedNodes = pendingRequests.map((r) => ({
						nodeName: r.node.name,
						credentialType: r.credentialType,
					}));
					return {
						success: true,
						partial: true,
						reason: `Applied setup for ${String(validCompletedNodes.length)} node(s), ${String(pendingRequests.length)} node(s) still need configuration.`,
						completedNodes: validCompletedNodes,
						skippedNodes,
						failedNodes: mergedFailedNodes,
						updatedNodes,
						updatedConnections,
					};
				}

				return {
					success: true,
					completedNodes: validCompletedNodes,
					failedNodes: mergedFailedNodes,
					updatedNodes,
					updatedConnections,
				};
			} catch (error) {
				return {
					success: false,
					error: `Workflow apply failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				};
			}
		},
	});
}
