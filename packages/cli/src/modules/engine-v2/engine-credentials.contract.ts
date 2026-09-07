import { WorkflowExecuteModeList } from 'n8n-workflow';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { z } from 'zod';

/**
 * Body of `POST /internal/credentials/resolve`: the data plane asks the control
 * plane for the decrypted data of one credential that a step it runs needs.
 *
 * The one definition of the body's shape. `ResolveCredentialRequest` is
 * inferred from it, so the client and the controller cannot disagree.
 */
export const resolveCredentialRequestSchema = z.object({
	/** The credential as the v1 node references it. */
	credential: z.object({
		id: z.string().min(1),
		name: z.string().min(1),
		type: z.string().min(1),
	}),
	execution: z.object({
		/** An engine execution id. No control plane execution row exists for it. */
		executionId: z.string().min(1),
		workflowId: z.string().min(1),
		/** The v1 mode, which `CredentialsHelper.getDecrypted` reads. */
		mode: z.enum(WorkflowExecuteModeList),
	}),
	/** Who the execution runs for. Both are unknown until the host supplies them at start. */
	context: z.object({
		userId: z.string().min(1).optional(),
		projectId: z.string().min(1).optional(),
	}),
	consumer: z.object({
		/** The node type that will use the credential. */
		nodeType: z.string().min(1),
	}),
});

export type ResolveCredentialRequest = z.infer<typeof resolveCredentialRequestSchema>;

/** Response of `POST /internal/credentials/resolve`. */
export interface ResolveCredentialResponse {
	data: ICredentialDataDecryptedObject;
}
