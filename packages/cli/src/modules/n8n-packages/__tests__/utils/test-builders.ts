import { createWorkflow, createWorkflowHistory, setActiveVersion } from '@n8n/backend-test-utils';
import type { CredentialsEntity, Folder, Project, WorkflowEntity } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode, IWorkflowSettings } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

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

interface BuildWorkflowCallingSubWorkflowOptions {
	name: string;
	project: Project;
	subWorkflowId: string;
	parentFolder?: Folder;
}

export async function buildWorkflowCallingSubWorkflow({
	name,
	project,
	subWorkflowId,
	parentFolder,
}: BuildWorkflowCallingSubWorkflowOptions): Promise<WorkflowEntity> {
	return await createWorkflow(
		{
			name,
			nodes: [executeWorkflowNode(subWorkflowId)],
			connections: {},
			parentFolder,
		},
		project,
	);
}

interface BuildWorkflowUsingErrorWorkflowOptions {
	name: string;
	project: Project;
	errorWorkflowId: string;
	parentFolder?: Folder;
}

export async function buildWorkflowUsingErrorWorkflow({
	name,
	project,
	errorWorkflowId,
	parentFolder,
}: BuildWorkflowUsingErrorWorkflowOptions): Promise<WorkflowEntity> {
	return await createWorkflow(
		{
			name,
			nodes: [],
			connections: {},
			settings: { errorWorkflow: errorWorkflowId },
			parentFolder,
		},
		project,
	);
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

export function noOpNode(name: string): INode {
	return {
		id: name,
		name,
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
}

export function credentialNode(credential: Pick<CredentialsEntity, 'id' | 'name' | 'type'>): INode {
	return {
		id: `http-${credential.id}`,
		name: `HTTP ${credential.name}`,
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		credentials: { [credential.type]: { id: credential.id, name: credential.name } },
	};
}

interface BuildVersionedWorkflowOptions {
	name: string;
	project: Project;
	versions: INode[][];
	publishedVersion?: number;
	settings?: IWorkflowSettings;
	parentFolder?: Folder;
}

/**
 * Snapshots each version into workflow history and leaves the workflow row holding
 * the last one, so the row is the draft and any earlier version can be published.
 */
export async function buildVersionedWorkflow(
	options: BuildVersionedWorkflowOptions,
): Promise<{ workflow: WorkflowEntity; versionIds: string[] }> {
	const [firstVersion, ...laterVersions] = options.versions;
	const workflow = await createWorkflow(
		{
			name: options.name,
			nodes: firstVersion,
			connections: {},
			parentFolder: options.parentFolder,
			// An explicit `undefined` would override the default `{}` and persist as null.
			...(options.settings ? { settings: options.settings } : {}),
		},
		options.project,
	);
	await createWorkflowHistory(workflow);
	const versionIds = [workflow.versionId];

	for (const nodes of laterVersions) {
		workflow.versionId = uuid();
		workflow.nodes = nodes;
		await Container.get(WorkflowRepository).update(workflow.id, {
			versionId: workflow.versionId,
			nodes,
		});
		await createWorkflowHistory(workflow);
		versionIds.push(workflow.versionId);
	}

	if (options.publishedVersion !== undefined) {
		const activeVersionId = versionIds[options.publishedVersion];
		await setActiveVersion(workflow.id, activeVersionId);
		workflow.activeVersionId = activeVersionId;
	}

	return { workflow, versionIds };
}

export function executeWorkflowNode(workflowId: string): INode {
	return {
		id: `execute-${workflowId}`,
		name: `Execute ${workflowId}`,
		type: 'n8n-nodes-base.executeWorkflow',
		typeVersion: 1,
		position: [0, 0],
		parameters: {
			workflowId: { __rl: true, mode: 'list', value: workflowId },
		},
	};
}
