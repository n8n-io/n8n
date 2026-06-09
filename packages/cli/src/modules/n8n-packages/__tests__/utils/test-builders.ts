import { createWorkflow } from '@n8n/backend-test-utils';
import type { CredentialsEntity, Project, WorkflowEntity } from '@n8n/db';

interface BuildWorkflowReferencingCredentialByIdOptions {
	name: string;
	project: Project;
	credentialId: string;
	credentialName: string;
	credentialType: string;
}

/**
 * Creates a one-node workflow whose HTTP Request node references a credential
 * by id without requiring the credential row to exist. Useful for orphan and
 * forbidden-access cases.
 */
export async function buildWorkflowReferencingCredentialById({
	name,
	project,
	credentialId,
	credentialName,
	credentialType,
}: BuildWorkflowReferencingCredentialByIdOptions): Promise<WorkflowEntity> {
	return await createWorkflow(
		{
			name,
			nodes: [
				{
					id: 'n1',
					name: 'HTTP',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
					credentials: {
						[credentialType]: { id: credentialId, name: credentialName },
					},
				},
			],
			connections: {},
		},
		project,
	);
}

interface BuildWorkflowReferencingCredentialOptions {
	name: string;
	project: Project;
	credential: Pick<CredentialsEntity, 'id' | 'name' | 'type'>;
}

/**
 * Convenience wrapper around `buildWorkflowReferencingCredentialById` for the
 * common case of pointing at an already-saved credential.
 */
export async function buildWorkflowReferencingCredential({
	name,
	project,
	credential,
}: BuildWorkflowReferencingCredentialOptions): Promise<WorkflowEntity> {
	return await buildWorkflowReferencingCredentialById({
		name,
		project,
		credentialId: credential.id,
		credentialName: credential.name,
		credentialType: credential.type,
	});
}
