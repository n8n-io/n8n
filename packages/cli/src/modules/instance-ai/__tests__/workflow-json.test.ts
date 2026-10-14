import type { WorkflowSuggestionBaseline } from '@n8n/api-types';
import type { INode } from 'n8n-workflow';

import { toWorkflowJSON } from '../workflow-json';

const node: INode = {
	id: 'node-id',
	name: 'Node',
	type: 'n8n-nodes-base.noOp',
	typeVersion: 1,
	position: [100, 200],
	parameters: { secret: 'parameter' },
	credentials: { service: { id: 'credential-id', name: 'Credential' } },
	continueOnFail: true,
	retryOnFail: true,
	maxTries: 3,
};

const original: WorkflowSuggestionBaseline['original'] = {
	name: 'Captured name',
	nodes: [node],
	connections: {},
	settings: { timezone: 'Europe/Prague' },
	nodeGroups: [],
};

it('converts a supplied snapshot with node identity, settings, and legacy options', () => {
	const converted = toWorkflowJSON({ ...original, id: 'workflow-id' });
	expect(converted).toMatchObject({
		id: 'workflow-id',
		name: 'Captured name',
		settings: original.settings,
		nodeGroups: [],
		nodes: [
			{
				id: 'node-id',
				parameters: node.parameters,
				credentials: node.credentials,
				onError: 'continueRegularOutput',
				retryOnFail: true,
				maxTries: 3,
			},
		],
	});
});

it('redacts parameters while retaining credential references', () => {
	const converted = toWorkflowJSON({ ...original, id: 'workflow-id' }, { redactParameters: true });
	expect(converted.nodes[0]).toMatchObject({ parameters: {}, credentials: node.credentials });
	expect(original.nodes[0].parameters).toEqual({ secret: 'parameter' });
});

it('preserves historical graph substitution and explicit error behavior', () => {
	const converted = toWorkflowJSON(
		{ ...original, id: 'workflow-id' },
		{
			graph: {
				nodes: [{ ...node, name: 'Historical node', onError: 'stopWorkflow' }],
				connections: {},
				nodeGroups: [],
			},
		},
	);
	expect(converted.name).toBe(original.name);
	expect(converted.settings).toEqual(original.settings);
	expect(converted.nodes[0]).toMatchObject({ name: 'Historical node', onError: 'stopWorkflow' });
});
