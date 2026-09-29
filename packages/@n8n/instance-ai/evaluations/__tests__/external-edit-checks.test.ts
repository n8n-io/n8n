import { mock } from 'vitest-mock-extended';

import type { N8nClient } from '../clients/n8n-client';
import {
	externalRenameSurvivedExpectation,
	runExternalEditChecks,
} from '../harness/external-edit-checks';
import type { EvalLogger } from '../harness/logger';
import type { ExternalEditFact } from '../types';

const logger = mock<EvalLogger>();

function applied(to: string, workflowId = 'wf-1'): ExternalEditFact {
	return { turn: 1, kind: 'rename', workflowId, from: 'Old name', to, applied: true };
}

describe('runExternalEditChecks', () => {
	it('passes when the renamed workflow still carries the external name', async () => {
		const client = mock<N8nClient>();
		client.getWorkflow.mockResolvedValue({ id: 'wf-1', name: 'Renamed elsewhere' } as never);

		const verdicts = await runExternalEditChecks({
			client,
			edits: [applied('Renamed elsewhere')],
			logger,
		});

		expect(verdicts).toEqual([
			expect.objectContaining({
				expectation: externalRenameSurvivedExpectation('Renamed elsewhere'),
				pass: true,
			}),
		]);
		expect(client.getWorkflow).toHaveBeenCalledWith('wf-1');
	});

	it('fails when the save reverted the external name', async () => {
		const client = mock<N8nClient>();
		client.getWorkflow.mockResolvedValue({ id: 'wf-1', name: 'Old name' } as never);

		const [verdict] = await runExternalEditChecks({
			client,
			edits: [applied('Renamed elsewhere')],
			logger,
		});

		expect(verdict.pass).toBe(false);
		expect(verdict.incomplete).toBeUndefined();
		expect(verdict.reason).toContain('overwrote state it never read');
	});

	it('reports an edit the harness never applied as incomplete framework work, not an agent miss', async () => {
		const client = mock<N8nClient>();

		const [verdict] = await runExternalEditChecks({
			client,
			edits: [
				{ turn: 1, kind: 'rename', to: 'Renamed elsewhere', applied: false, reason: 'no save yet' },
			],
			logger,
		});

		expect(verdict).toMatchObject({
			pass: false,
			incomplete: true,
			attribution: 'framework_issue',
		});
		expect(verdict.reason).toContain('no save yet');
		expect(client.getWorkflow).not.toHaveBeenCalled();
	});

	it('treats a failed read as incomplete rather than a failed agent', async () => {
		const client = mock<N8nClient>();
		client.getWorkflow.mockRejectedValue(new Error('404'));

		const [verdict] = await runExternalEditChecks({
			client,
			edits: [applied('Renamed elsewhere')],
			logger,
		});

		expect(verdict).toMatchObject({
			pass: false,
			incomplete: true,
			attribution: 'framework_issue',
		});
	});
});
