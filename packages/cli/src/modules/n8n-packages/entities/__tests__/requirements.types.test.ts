import type { WorkflowCredentialRequirement } from '../credential/credential.types';
import type { WorkflowDataTableRequirement } from '../data-table/data-table.types';
import { mergeRequirements } from '../requirements.types';

function cred(credentialId: string, workflowId: string): WorkflowCredentialRequirement {
	return {
		workflowId,
		credentialId,
		credentialName: `Cred ${credentialId}`,
		credentialType: 'httpHeaderAuth',
	};
}

function dataTable(dataTableId: string, workflowId: string): WorkflowDataTableRequirement {
	return { workflowId, dataTableId };
}

describe('mergeRequirements', () => {
	it('concatenates each requirement type across parts, preserving order', () => {
		const merged = mergeRequirements(
			{ credentials: [cred('c1', 'w1')], dataTables: [dataTable('dt1', 'w1')] },
			{
				credentials: [cred('c2', 'w2'), cred('c3', 'w3')],
				dataTables: [dataTable('dt2', 'w2')],
			},
		);

		expect(merged.credentials).toEqual([cred('c1', 'w1'), cred('c2', 'w2'), cred('c3', 'w3')]);
		expect(merged.dataTables).toEqual([dataTable('dt1', 'w1'), dataTable('dt2', 'w2')]);
	});

	it('skips undefined parts so optional export results can be passed directly', () => {
		const merged = mergeRequirements(
			undefined,
			{ credentials: [cred('c1', 'w1')], dataTables: [dataTable('dt1', 'w1')] },
			undefined,
		);

		expect(merged.credentials).toEqual([cred('c1', 'w1')]);
		expect(merged.dataTables).toEqual([dataTable('dt1', 'w1')]);
	});

	it('returns empty requirement lists when given no parts', () => {
		expect(mergeRequirements()).toEqual({ credentials: [], dataTables: [] });
	});
});
