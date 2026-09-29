import { mock } from 'vitest-mock-extended';

import type { N8nClient } from '../clients/n8n-client';
import { applyExternalRename } from '../harness/chat-loop';
import type { EvalLogger } from '../harness/logger';
import { buildConversationMetrics } from '../outcome/event-parser';
import type { CapturedEvent } from '../types';
import { EXTERNAL_EDIT_EVENT } from '../types';

const logger = mock<EvalLogger>();

function savedBuild(workflowId: string): CapturedEvent {
	return {
		timestamp: 1,
		type: 'tool-result',
		data: {
			payload: {
				toolName: 'build-workflow',
				result: { success: true, workflowId, workflowName: 'Daily digest' },
			},
		},
	};
}

function externalEditEvents(events: CapturedEvent[]) {
	return events.filter((e) => e.type === EXTERNAL_EDIT_EVENT).map((e) => e.data.payload);
}

describe('applyExternalRename', () => {
	it('renames the last saved workflow and records the edit as applied', async () => {
		const client = mock<N8nClient>();
		client.getWorkflow.mockResolvedValue({ id: 'wf-1', name: 'Daily digest' } as never);
		client.updateWorkflow.mockResolvedValue({} as never);
		const events: CapturedEvent[] = [
			{ timestamp: 0, type: 'run-start', data: { type: 'run-start' } },
			savedBuild('wf-1'),
		];

		await applyExternalRename({ client, events, logger }, 'Daily digest (renamed in another tab)');

		expect(client.updateWorkflow).toHaveBeenCalledWith('wf-1', {
			name: 'Daily digest (renamed in another tab)',
		});
		expect(externalEditEvents(events)).toEqual([
			{
				kind: 'rename',
				workflowId: 'wf-1',
				from: 'Daily digest',
				to: 'Daily digest (renamed in another tab)',
				applied: true,
			},
		]);
		// The metrics the judge reads carry the same fact, in the turn it followed.
		expect(buildConversationMetrics(events).externalEdits).toEqual([
			expect.objectContaining({ turn: 1, applied: true, workflowId: 'wf-1' }),
		]);
	});

	it('records a skipped rename when no workflow was saved yet', async () => {
		const client = mock<N8nClient>();
		const events: CapturedEvent[] = [];

		await applyExternalRename({ client, events, logger }, 'Renamed');

		expect(client.updateWorkflow).not.toHaveBeenCalled();
		expect(externalEditEvents(events)).toEqual([
			expect.objectContaining({ kind: 'rename', to: 'Renamed', applied: false }),
		]);
	});

	it('records a skipped rename when the workflow already carries the name', async () => {
		const client = mock<N8nClient>();
		client.getWorkflow.mockResolvedValue({ id: 'wf-1', name: 'Renamed' } as never);
		const events: CapturedEvent[] = [savedBuild('wf-1')];

		await applyExternalRename({ client, events, logger }, 'Renamed');

		expect(client.updateWorkflow).not.toHaveBeenCalled();
		expect(externalEditEvents(events)).toEqual([
			expect.objectContaining({
				workflowId: 'wf-1',
				applied: false,
				reason: 'it is already named "Renamed"',
			}),
		]);
	});

	it('records a failed rename instead of throwing', async () => {
		const client = mock<N8nClient>();
		client.getWorkflow.mockResolvedValue({ id: 'wf-1', name: 'Daily digest' } as never);
		client.updateWorkflow.mockRejectedValue(new Error('403'));
		const events: CapturedEvent[] = [savedBuild('wf-1')];

		await expect(
			applyExternalRename({ client, events, logger }, 'Renamed'),
		).resolves.toBeUndefined();
		expect(externalEditEvents(events)).toEqual([
			expect.objectContaining({ workflowId: 'wf-1', applied: false, reason: '403' }),
		]);
	});
});
