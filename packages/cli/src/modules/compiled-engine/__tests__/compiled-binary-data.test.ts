import { createRunExecutionData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { BinaryDataMover } from '../compiled-binary-data';
import { moveRunBinaryData, runtimeLocationId } from '../compiled-binary-data';

function runWith(ids: string[]) {
	return createRunExecutionData({
		resultData: {
			runData: {
				A: [
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 0,
						source: [],
						data: {
							main: [
								ids.map((id) => ({
									json: {},
									binary: { data: { id, data: 'filesystem-v2', mimeType: 'text/plain' } },
								})),
							],
						},
					},
				],
			},
		},
	});
}

describe('moveRunBinaryData', () => {
	it('renames each file of the runtime location once and updates every reference', async () => {
		const mover = mock<BinaryDataMover>();
		const id = 'filesystem-v2:workflows/wf1/executions/wfrt-7/binary_data/f1';
		const other = 'filesystem-v2:workflows/wf1/executions/55/binary_data/f2';
		const data = runWith([id, id, other]);

		await moveRunBinaryData(mover, data, 'wf1', '7', '120');

		expect(mover.rename).toHaveBeenCalledTimes(1);
		expect(mover.rename).toHaveBeenCalledWith(
			'workflows/wf1/executions/wfrt-7/binary_data/f1',
			'workflows/wf1/executions/120/binary_data/f1',
		);
		const items = data.resultData.runData.A[0].data?.main[0] ?? [];
		expect(items.map((i) => i.binary?.data.id)).toEqual([
			'filesystem-v2:workflows/wf1/executions/120/binary_data/f1',
			'filesystem-v2:workflows/wf1/executions/120/binary_data/f1',
			other,
		]);
		expect(mover.deleteMany).toHaveBeenCalledWith([
			{ type: 'execution', workflowId: 'wf1', executionId: runtimeLocationId('7') },
		]);
	});
});
