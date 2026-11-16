import type {
	IConnection,
	IConnections,
	INode,
	INodeCredentials,
	IWorkflowBase,
	IWorkflowSettings,
	OnError,
} from 'n8n-workflow';
import { deepCopy, isNodeConnectionType } from 'n8n-workflow';

import { WorkflowTestError } from '../errors';
import type { ConnectionDefinition, NodeDefinition, WorkflowDefinition } from '../workflow-set';

const ON_ERROR_VALUES: readonly string[] = [
	'continueErrorOutput',
	'continueRegularOutput',
	'stopWorkflow',
] satisfies OnError[];

export function toWorkflowData(definition: WorkflowDefinition): IWorkflowBase {
	const { id = '', name, nodes, connections, settings } = deepCopy(definition);
	const now = new Date();
	return {
		id,
		name,
		active: true,
		isArchived: false,
		activeVersionId: null,
		createdAt: now,
		updatedAt: now,
		nodes: nodes.map((node) => toNode(name, node)),
		connections: toConnections(name, connections),
		settings: toSettings(name, settings),
	};
}

function toNode(
	workflow: string,
	{ position, onError, credentials, ...node }: NodeDefinition,
): INode {
	if (onError !== undefined && !isOnError(onError)) {
		throw invalid(workflow, `Node "${node.name}" has the unknown onError value "${onError}"`);
	}
	return {
		...node,
		position: [position[0], position[1]],
		onError,
		...(credentials && { credentials: toCredentials(credentials) }),
		// The engine reads 0 as its 1000 ms default, so the smallest positive delay skips the wait.
		...(node.retryOnFail && { waitBetweenTries: Number.MIN_VALUE }),
	};
}

function toCredentials(credentials: NonNullable<NodeDefinition['credentials']>): INodeCredentials {
	return Object.fromEntries(
		Object.entries(credentials).flatMap(([type, details]) => (details ? [[type, details]] : [])),
	);
}

function isOnError(value: string): value is OnError {
	return ON_ERROR_VALUES.includes(value);
}

function toConnections(
	workflow: string,
	connections: WorkflowDefinition['connections'],
): IConnections {
	const toConnection = ({ node, type, index }: ConnectionDefinition): IConnection => {
		if (!isNodeConnectionType(type)) {
			throw invalid(workflow, `The connection to "${node}" has the unknown type "${type}"`);
		}
		return { node, type, index };
	};

	return Object.fromEntries(
		Object.entries(connections).map(([source, byType]) => [
			source,
			Object.fromEntries(
				Object.entries(byType).map(([type, outputs]) => [
					type,
					outputs.map((output) => output?.map(toConnection) ?? null),
				]),
			),
		]),
	);
}

function toSettings(
	workflow: string,
	settings: WorkflowDefinition['settings'] = {},
): IWorkflowSettings {
	const { timezone, executionOrder } = settings;
	if (executionOrder !== undefined && executionOrder !== 'v0' && executionOrder !== 'v1') {
		throw invalid(workflow, `The execution order "${executionOrder}" is unknown`);
	}
	return { timezone, executionOrder };
}

function invalid(workflow: string, message: string) {
	return new WorkflowTestError('INVALID_WORKFLOW', `${message}.`, { workflow });
}
