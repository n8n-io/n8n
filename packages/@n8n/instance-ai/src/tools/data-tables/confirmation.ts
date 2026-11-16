/** Suspend and resume contract shared by the data table write tools. */
import {
	buildDataTablesSessionGrantKey,
	instanceAiApprovalDetailsSchema,
	instanceAiApprovalResumeSchema,
	instanceAiConfirmationSeveritySchema,
} from '@n8n/api-types';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const confirmationSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	approvalDetails: instanceAiApprovalDetailsSchema.optional(),
	resourceName: z.string().optional(),
	severity: instanceAiConfirmationSeveritySchema,
});

export const confirmationResumeSchema = instanceAiApprovalResumeSchema;

export type ConfirmationSuspendPayload = z.infer<typeof confirmationSuspendSchema>;

export type ResumeData = z.infer<typeof confirmationResumeSchema>;

export interface ConfirmationToolContext {
	resumeData: ResumeData | undefined;
	suspend: (payload: ConfirmationSuspendPayload) => Promise<never>;
}

export function hasSessionGrant(context: InstanceAiContext, action: string): boolean {
	return context.sessionApprovedToolKeys?.has(buildDataTablesSessionGrantKey(action)) === true;
}

export async function persistSessionGrantIfRequested(
	context: InstanceAiContext,
	action: string,
	resumeData: ResumeData | undefined,
): Promise<void> {
	if (resumeData?.approved && resumeData.scope === 'session') {
		await context.grantSessionToolApproval?.(buildDataTablesSessionGrantKey(action));
	}
}
