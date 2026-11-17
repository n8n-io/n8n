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

	it.each(['ai_languageModel', 'ai_tool'] as const)(
		'ignores %s sub-node data when reading a workflow decision',
		(connection) => {
			const runData: IRunData = {
				Review: [output({ approved: true })],
				Helper: [
					{ ...output({}), data: { [connection]: [[{ json: { response: 'Review context' } }]] } },
				],
			};
			expect(
				collectAgentDecision(runData, {
					Helper: { [connection]: [[{ node: 'Review', type: connection, index: 0 }]] },
				}),
			).toEqual({ approved: true });
			expect(collectAgentDecision(runData)).toEqual({ approved: true });
		},
	);

	it('excludes a connected AI helper that records main output', () => {
		expect(
			collectAgentDecision(
				{
					Review: [output({ approved: true })],
					Tool: [output({ response: 'Review context' })],
				},
				{
					Tool: { ai_tool: [[{ node: 'Review', type: 'ai_tool', index: 0 }]] },
				},
			),
		).toEqual({ approved: true });
	});

	it('ignores a terminal branch that produced no items', () => {
		const runData: IRunData = {
			Empty: [{ ...output({}), data: { main: [[]] } }],
			Review: [output({ approved: false })],
		};
		expect(collectAgentDecision(runData, {})).toEqual({ approved: false });
	});

	it.each([{}, { approved: 'yes' }, { data: { approved: 1 } }])(
		'rejects invalid decisions: %j',
		(value) => {
			expect(() => collectAgentDecision({ Review: [output(value)] }, {})).toThrow();
		},
	);

	it('reads the decision from an unconnected output when the connected output is empty', () => {
		const runData: IRunData = {
			Trigger: [output({ requestId: 'request' })],
			If: [{ ...output({}), data: { main: [[], [{ json: { approved: true } }]] } }],
			Notify: [],
		};
		expect(
			collectAgentDecision(runData, {
				Trigger: { main: [[{ node: 'If', type: 'main', index: 0 }]] },
				If: { main: [[{ node: 'Notify', type: 'main', index: 0 }]] },
			}),
		).toEqual({ approved: true });
	});

	it('excludes items from a connected output of the same node', () => {
		const runData: IRunData = {
			If: [
				{
					...output({}),
					data: { main: [[{ json: { approved: false } }], [{ json: { approved: true } }]] },
				},
			],
			Log: [{ ...output({}), data: { main: [[]] } }],
		};
		expect(
			collectAgentDecision(runData, {
				If: { main: [[{ node: 'Log', type: 'main', index: 0 }]] },
			}),
		).toEqual({ approved: true });
	});

	it('keeps the reason and limits it to 1000 characters', () => {
		expect(
			collectAgentDecision({ Review: [output({ approved: false, reason: 'Too risky' })] }, {}),
		).toEqual({ approved: false, reason: 'Too risky' });
		const result = collectAgentDecision(
			{ Review: [output({ approved: true, reason: 'x'.repeat(1500) })] },
			{},
		);
		expect(result).toEqual({ approved: true, reason: 'x'.repeat(1000) });
	});

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
