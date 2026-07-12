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

interface BuildWorkflowReferencingVariablesOptions {
	name: string;
	project: Project;
	variableNames: string[];
	/** Places the workflow inside a folder, so folder-with-workflows export can pick it up. */
	parentFolder?: Folder;
}

/**
 * Creates a one-node workflow whose Set node references the given variables via
 * `$vars.<name>` expressions. The variable rows do not need to exist.
 */
export async function buildWorkflowReferencingVariables({
	name,
	project,
	variableNames,
	parentFolder,
}: BuildWorkflowReferencingVariablesOptions): Promise<WorkflowEntity> {
	return await createWorkflow(
		{
			name,
			nodes: [
				{
					id: 'n1',
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [0, 0],
					parameters: {
						assignments: {
							assignments: variableNames.map((variableName, index) => ({
								id: `a${index}`,
								name: `field${index}`,
								type: 'string',
								// Legacy keys that aren't valid identifiers are only reachable via brackets.
								value: /^[A-Za-z_][A-Za-z0-9_]*$/.test(variableName)
									? `={{ $vars.${variableName} }}`
									: `={{ $vars['${variableName}'] }}`,
							})),
						},
					},
				},
			],
			connections: {},
			parentFolder,
		},
		project,
	);
}
