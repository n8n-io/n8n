import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createDeleteCredentialTool(context: InstanceAiContext) {
	return createTool({
		id: 'delete-credential',
		description: 'Permanently delete a credential by ID. Irreversible.',
		inputSchema: z.object({
			credentialId: z.string().describe('ID of the credential to delete'),
			credentialName: z
				.string()
				.optional()
				.describe('Name of the credential (for confirmation message)'),
		}),
		outputSchema: z.object({
			success: z.boolean(),
			denied: z.boolean().optional(),
			reason: z.string().optional(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: instanceAiConfirmationSeveritySchema,
		}),
		resumeSchema: z.object({
			approved: z.boolean(),
		}),
		execute: async (input, ctx) => {
			const { resumeData, suspend } = ctx?.agent ?? {};

			const needsApproval = context.permissions?.deleteCredential !== 'always_allow';

			// State 1: First call — suspend for confirmation (unless always_allow)
			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				await suspend?.({
					requestId: nanoid(),
					message: `Delete credential "${input.credentialName ?? input.credentialId}"? This cannot be undone.`,
					severity: 'destructive' as const,
				});
				// suspend() never resolves — this line is unreachable but satisfies the type checker
				return { success: false };
			}

			// State 2: Denied
			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return { success: false, denied: true, reason: 'User denied the action' };
			}

			// State 3: Approved or always_allow — execute
			await context.credentialService.delete(input.credentialId);
			return { success: true };
		},
	});
}
