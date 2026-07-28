import type { WorkflowCredentialRequirement } from '../credential/credential.types';
import type { WorkflowDataTableRequirement } from '../data-table/data-table.types';
import { mergeRequirements } from '../requirements.types';
import type { WorkflowVariableRequirement } from '../variable/variable.types';
import type { WorkflowNodeTypeSource } from '../workflow/node-type-usage';

function cred(credentialId: string, workflowId: string): WorkflowCredentialRequirement {
	return {
		workflowId,
		credentialId,
		credentialName: `Cred ${credentialId}`,
		credentialType: 'httpHeaderAuth',
	};
}

function variable(variableName: string, workflowId: string): WorkflowVariableRequirement {
	return { workflowId, variableName };
}

function dataTable(dataTableId: string, workflowId: string): WorkflowDataTableRequirement {
	return { workflowId, dataTableId };
}

function nodeTypeSource(workflowId: string): WorkflowNodeTypeSource {
	return { workflowId, nodes: [] };
}

describe('mergeRequirements', () => {
	it('concatenates credential requirements across parts, preserving order', () => {
		const merged = mergeRequirements(
			{
				credentials: [cred('c1', 'w1')],
				dataTables: [dataTable('dt1', 'w1')],
				variables: [variable('V1', 'w1')],
				nodeTypes: [nodeTypeSource('w1')],
			},
			{
				credentials: [cred('c2', 'w2'), cred('c3', 'w3')],
				dataTables: [dataTable('dt2', 'w2')],
				variables: [variable('V2', 'w2')],
				nodeTypes: [nodeTypeSource('w2')],
			},
		);

		expect(merged.credentials).toEqual([cred('c1', 'w1'), cred('c2', 'w2'), cred('c3', 'w3')]);
		expect(merged.dataTables).toEqual([dataTable('dt1', 'w1'), dataTable('dt2', 'w2')]);
		expect(merged.variables).toEqual([variable('V1', 'w1'), variable('V2', 'w2')]);
		expect(merged.nodeTypes).toEqual([nodeTypeSource('w1'), nodeTypeSource('w2')]);
	});

	it('skips undefined parts so optional export results can be passed directly', () => {
		const merged = mergeRequirements(
			undefined,
			{
				credentials: [cred('c1', 'w1')],
				dataTables: [dataTable('dt1', 'w1')],
				variables: [variable('V1', 'w1')],
				nodeTypes: [nodeTypeSource('w1')],
			},
			undefined,
		);

		expect(merged.credentials).toEqual([cred('c1', 'w1')]);
		expect(merged.dataTables).toEqual([dataTable('dt1', 'w1')]);
		expect(merged.variables).toEqual([variable('V1', 'w1')]);
		expect(merged.nodeTypes).toEqual([nodeTypeSource('w1')]);
	});

	it('returns empty requirement lists when given no parts', () => {
		expect(mergeRequirements()).toEqual({
			credentials: [],
			dataTables: [],
			variables: [],
			nodeTypes: [],
		});
	});
});
