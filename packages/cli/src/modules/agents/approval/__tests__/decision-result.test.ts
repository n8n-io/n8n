import type { IRunData, ITaskData, IDataObject } from 'n8n-workflow';

import { collectAgentDecision } from '../decision-result';

function output(json: IDataObject): ITaskData {
	return {
		startTime: 0,
		executionIndex: 0,
		executionTime: 0,
		source: [],
		data: { main: [[{ json }]] },
	};
}

describe('collectAgentDecision', () => {
	it.each([true, false])('reads approved=%s from a terminal item', (approved) => {
		expect(collectAgentDecision({ Review: [output({ approved })] }, {})).toEqual({ approved });
	});

	it('accepts an existing send-and-wait response', () => {
		expect(collectAgentDecision({ Slack: [output({ data: { approved: true } })] }, {})).toEqual({
			approved: true,
		});
	});

	it('excludes the trigger and intermediate node outputs', () => {
		const runData: IRunData = {
			Trigger: [output({ requestId: 'request' })],
			Review: [output({ approved: false })],
		};
		expect(
			collectAgentDecision(runData, {
				Trigger: { main: [[{ node: 'Review', type: 'main', index: 0 }]] },
			}),
		).toEqual({ approved: false });
	});

	it.each([{}, { approved: 'yes' }, { data: { approved: 1 } }])(
		'rejects invalid decisions: %j',
		(value) => {
			expect(() => collectAgentDecision({ Review: [output(value)] }, {})).toThrow();
		},
	);

	it('rejects two terminal branches', () => {
		expect(() =>
			collectAgentDecision(
				{ A: [output({ approved: true })], B: [output({ approved: true })] },
				{},
			),
		).toThrow('one terminal node');
	});

	it('rejects multiple result items and repeated terminal runs', () => {
		expect(() =>
			collectAgentDecision(
				{ Review: [output({ approved: true }), output({ approved: false })] },
				{},
			),
		).toThrow('exactly one');
	});
});
