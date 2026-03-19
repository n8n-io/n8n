import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createSetupCredentialsTool(context: InstanceAiContext) {
	return createTool({
		id: 'setup-credentials',
		description:
			'Open the n8n credential setup UI for the user to select existing credentials or ' +
			'create new ones directly in their browser. Use this when setting up credentials for ' +
			'workflow integrations, or when the user asks to set up/add/create a credential. ' +
			'The user handles secrets through the UI — you never see sensitive data. ' +
			'Returns a mapping of credential type to selected credential ID. ' +
			'When the result contains needsBrowserSetup=true, delegate to a browser agent ' +
			'with the provided docsUrl and credentialType.',
		inputSchema: z.object({
			credentials: z
				.array(
					z.object({
						credentialType: z
							.string()
							.describe('n8n credential type name (e.g. "slackApi", "gmailOAuth2Api")'),
						reason: z.string().optional().describe('Why this credential is needed (shown to user)'),
					}),
				)
				.describe('List of credentials to set up'),
			projectId: z
				.string()
				.optional()
				.describe('Project ID to scope credential creation to. Defaults to personal project.'),
			credentialFlow: z
				.object({
					stage: z.enum(['generic', 'finalize']),
				})
				.optional()
				.describe(
					'Credential flow stage. "finalize" renders post-verification picker with "Apply credentials" / "Later" buttons.',
				),
		}),
		outputSchema: z.object({
			success: z.boolean(),
			credentials: z.record(z.string()).optional(),
			reason: z.string().optional(),
			needsBrowserSetup: z.boolean().optional(),
			credentialType: z.string().optional(),
			docsUrl: z.string().optional(),
			requiredFields: z
				.array(
					z.object({
						name: z.string(),
						displayName: z.string(),
						type: z.string(),
						required: z.boolean(),
						description: z.string().optional(),
					}),
				)
				.optional(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: instanceAiConfirmationSeveritySchema,
			credentialRequests: z.array(
				z.object({
					credentialType: z.string(),
					reason: z.string(),
					existingCredentials: z.array(z.object({ id: z.string(), name: z.string() })),
				}),
			),
			projectId: z.string().optional(),
			credentialFlow: z.object({ stage: z.enum(['generic', 'finalize']) }).optional(),
		}),
		resumeSchema: z.object({
			approved: z.boolean(),
			credentials: z.record(z.string()).optional(),
			autoSetup: z.object({ credentialType: z.string() }).optional(),
		}),
		execute: async (input, ctx) => {
			const { resumeData, suspend } = ctx?.agent ?? {};
			const isFinalize = input.credentialFlow?.stage === 'finalize';

			// State 1: First call — look up existing credentials per type and suspend
			if (resumeData === undefined || resumeData === null) {
				const credentialRequests = await Promise.all(
					input.credentials.map(async (req) => {
						const existing = await context.credentialService.list({ type: req.credentialType });
						return {
							credentialType: req.credentialType,
							reason: req.reason ?? `Required for ${req.credentialType}`,
							existingCredentials: existing.map((c) => ({ id: c.id, name: c.name })),
						};
					}),
				);

				const typeNames = input.credentials.map((c) => c.credentialType).join(', ');
				await suspend?.({
					requestId: nanoid(),
					message: isFinalize
						? `Your workflow is verified. Add credentials to make it production-ready: ${typeNames}`
						: input.credentials.length === 1
							? `Select or create a ${typeNames} credential`
							: `Select or create credentials: ${typeNames}`,
					severity: 'info' as const,
					credentialRequests,
					...(input.projectId ? { projectId: input.projectId } : {}),
					...(input.credentialFlow ? { credentialFlow: input.credentialFlow } : {}),
				});
				// suspend() never resolves
				return { success: false };
			}

			// State 2: Not approved — user clicked "Later" / deferred.
			if (!resumeData.approved) {
				return {
					success: false,
					reason: 'User deferred credential setup.',
				};
			}

			// State 4: User requested automatic browser-assisted setup
			if (resumeData.autoSetup) {
				const { credentialType } = resumeData.autoSetup;
				const docsUrl =
					(await context.credentialService.getDocumentationUrl?.(credentialType)) ?? undefined;
				const requiredFields =
					(await context.credentialService.getCredentialFields?.(credentialType)) ?? undefined;
				return {
					success: false,
					needsBrowserSetup: true,
					credentialType,
					docsUrl,
					requiredFields,
				};
			}

			// State 5: Approved with credential selections
			return {
				success: true,
				credentials: resumeData.credentials,
			};
		},
	});
}
