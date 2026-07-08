/**
 * Apply Workflow Credentials Tool
 *
 * Atomically applies real credentials to nodes that were mocked during build.
 * Uses the mockedCredentialsByNode mapping from the build outcome to target
 * only the right nodes.
 */

import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { assignCredentialToNode, resolveCredentialForApply } from './credential-utils';
import { reconcileSimulationPlan } from './reconcile-simulation-plan';
import { buildCredentialMap } from './resolve-credentials';
import { refreshWorkflowSourceFileBindingFromSave } from './workflow-file-bindings';
import type { OrchestrationContext } from '../../types';

export const applyWorkflowCredentialsInputSchema = z.object({
	workItemId: z.string().describe('The work item ID from the build (wi_XXXXXXXX)'),
	workflowId: z.string().describe('The workflow ID to update'),
	credentials: z.record(z.string()).describe('Map of credentialType → credentialId to apply'),
});

export function createApplyWorkflowCredentialsTool(context: OrchestrationContext) {
	return new Tool('apply-workflow-credentials')
		.description(
			'Apply real credentials to a workflow that was built with mocked credentials. ' +
				'Only updates nodes that were mocked — never overwrites existing real credentials.',
		)
		.input(applyWorkflowCredentialsInputSchema)
		.output(
			z.object({
				success: z.boolean(),
				appliedNodes: z.array(z.string()).optional(),
				error: z.string().optional(),
			}),
		)
		.handler(async (input: z.infer<typeof applyWorkflowCredentialsInputSchema>) => {
			if (!context.workflowTaskService || !context.domainContext) {
				return { success: false, error: 'Credential application support not available.' };
			}

			const buildOutcome = await context.workflowTaskService.getBuildOutcome(input.workItemId);
			if (!buildOutcome?.mockedCredentialsByNode) {
				return {
					success: false,
					error: `No mocked credential mapping found for work item ${input.workItemId}.`,
				};
			}

			const { mockedCredentialsByNode } = buildOutcome;
			const { workflowService } = context.domainContext;

			// Load the workflow
			let json;
			try {
				json = await workflowService.getAsWorkflowJSON(input.workflowId);
			} catch {
				return { success: false, error: `Workflow ${input.workflowId} not found.` };
			}

			const appliedNodes: string[] = [];

			for (const node of json.nodes ?? []) {
				const nodeName = node.name ?? '';
				const mockedTypes = mockedCredentialsByNode[nodeName];
				if (!mockedTypes?.length) continue;

				node.credentials ??= {};

				for (const credType of mockedTypes) {
					const credId = input.credentials[credType];
					if (!credId) continue;

					const resolved = await resolveCredentialForApply(credType, credId, context.domainContext);
					if (!resolved.resolved) return { success: false, error: resolved.error };
					assignCredentialToNode(node, credType, resolved.credential);
				}
				appliedNodes.push(nodeName);
			}

			if (appliedNodes.length === 0) {
				return { success: true, appliedNodes: [] };
			}

			// Save the workflow with applied credentials
			try {
				const saved = await workflowService.updateFromWorkflowJSON(input.workflowId, json);
				await refreshWorkflowSourceFileBindingFromSave(context.domainContext, input.workflowId, {
					versionId: saved.versionId,
					checksum: saved.checksum,
				});
			} catch (error) {
				return {
					success: false,
					error: `Failed to save workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
				};
			}

			// Refresh the simulation plan so the next verification executes the
			// now-credentialed nodes instead of replaying the build-time mock.
			// Best-effort: verify-built-workflow reconciles again on its own.
			try {
				const availableCredentials = await buildCredentialMap(
					context.domainContext.credentialService,
				);
				const patch = await reconcileSimulationPlan({
					buildOutcome,
					workflow: json,
					availableCredentials,
				});
				if (patch) {
					await context.workflowTaskService.updateBuildOutcome(input.workItemId, {
						...patch,
						verificationPinData: undefined,
					});
				}
			} catch {
				// intentional: plan refresh is advisory
			}

			return { success: true, appliedNodes };
		})
		.build();
}
