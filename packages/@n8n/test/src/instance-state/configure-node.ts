import type { INodeParameters } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import { WorkflowTestError } from '../errors';
import type { NodeDefinition, NodeReference } from '../workflow-set';
import { configureCredentials, type CredentialsByKey } from './credentials';

export interface NodeConfiguration {
	parameters?: INodeParameters;
	credentials?: CredentialsByKey;
}

export function configureNode(
	node: NodeReference,
	{ parameters, credentials }: NodeConfiguration,
): void {
	const definition = node.workflow.definition.nodes.find(({ name }) => name === node.name);
	if (!definition) {
		throw new WorkflowTestError(
			'NODE_NOT_FOUND',
			`Workflow "${node.workflow.name}" has no node "${node.name}".`,
		);
	}

	if (credentials) assertCredentialKeys(node, definition, Object.keys(credentials));
	if (parameters) Object.assign(definition.parameters, deepCopy(parameters));
	if (credentials) configureCredentials(node.workflow, node.name, credentials);
}

function assertCredentialKeys(node: NodeReference, definition: NodeDefinition, keys: string[]) {
	const known = Object.values(definition.credentials ?? {}).flatMap((details) => [
		details?.name,
		details?.id,
	]);
	const unknown = keys.find((key) => !known.includes(key));
	if (unknown === undefined) return;

	const names = Object.values(definition.credentials ?? {}).map((details) => details?.name);
	throw new WorkflowTestError(
		'CREDENTIAL_NOT_FOUND',
		`Node "${node.name}" uses no credential with the name or ID "${unknown}". Credentials: ${names.join(', ') || 'none'}.`,
		{ workflow: node.workflow.name, node: node.name },
	);
}
