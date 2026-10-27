import { credentialRequestSchema, instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { z } from 'zod';

import type { InstanceAiContext } from '../types';

/** Suspend payload of the credentials tool: a superset that covers delete and setup. */
export const credentialsSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
	credentialRequests: z.array(credentialRequestSchema).optional(),
	projectId: z.string().optional(),
	requireUserSelection: z.boolean().optional(),
	credentialFlow: z.object({ stage: z.enum(['generic', 'finalize']) }).optional(),
});

export const credentialsResumeSchema = z.object({
	approved: z.boolean(),
	credentials: z.record(z.string()).optional(),
	autoSetup: z.object({ credentialType: z.string(), attemptId: z.string().optional() }).optional(),
});

export type CredentialsResumeData = z.infer<typeof credentialsResumeSchema>;

export interface CredentialToolContext {
	resumeData: CredentialsResumeData | undefined;
	suspend: (payload: z.infer<typeof credentialsSuspendSchema>) => Promise<never>;
}

/** Hands credential creation to the browser tools when the user asks for automatic setup. */
export async function startBrowserCredentialSetup(
	context: InstanceAiContext,
	{ credentialType, attemptId }: { credentialType: string; attemptId?: string },
) {
	context.browserCredentialSetup?.markPending(credentialType, attemptId);
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
