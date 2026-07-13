import { createWorkflow } from '@n8n/backend-test-utils';
import type { CredentialsEntity, Folder, Project, WorkflowEntity } from '@n8n/db';

interface BuildWorkflowReferencingCredentialByIdOptions {
	name: string;
	project: Project;
	credentialId: string;
	credentialName: string;
	credentialType: string;
	/** Places the workflow inside a folder, so folder-with-workflows export can pick it up. */
	parentFolder?: Folder;
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
	parentFolder,
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
			parentFolder,
		},
		project,
	);
}

interface BuildWorkflowReferencingCredentialOptions {
	name: string;
	project: Project;
	credential: Pick<CredentialsEntity, 'id' | 'name' | 'type'>;
	/** Places the workflow inside a folder, so folder-with-workflows export can pick it up. */
	parentFolder?: Folder;
}

/**
 * Convenience wrapper around `buildWorkflowReferencingCredentialById` for the
 * common case of pointing at an already-saved credential.
 */
export async function buildWorkflowReferencingCredential({
	name,
	project,
	credential,
	parentFolder,
}: BuildWorkflowReferencingCredentialOptions): Promise<WorkflowEntity> {
	return await buildWorkflowReferencingCredentialById({
		name,
		project,
		credentialId: credential.id,
		credentialName: credential.name,
		credentialType: credential.type,
		parentFolder,
	});
}

interface BuildWorkflowReferencingDataTablesOptions {
	name: string;
	project: Project;
	references: Array<{ dataTableId: string; mode?: 'id' | 'list' }>;
	parentFolder?: Folder;
}

export async function buildWorkflowReferencingDataTables({
	name,
	project,
	references,
	parentFolder,
}: BuildWorkflowReferencingDataTablesOptions): Promise<WorkflowEntity> {
	return await createWorkflow(
		{
			name,
			nodes: references.map((reference, index) => ({
				id: `n${index + 1}`,
				name: `Data table ${index + 1}`,
				type: 'n8n-nodes-base.dataTable',
				typeVersion: 1,
				position: [index * 100, 0],
				parameters: {
					dataTableId: { __rl: true, mode: reference.mode ?? 'id', value: reference.dataTableId },
				},
			})),
			connections: {},
			parentFolder,
		},
		project,
	);
}
