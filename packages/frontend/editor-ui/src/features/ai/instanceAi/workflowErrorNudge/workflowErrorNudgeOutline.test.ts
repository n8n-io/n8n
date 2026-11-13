import { buildNudgeOutline } from './workflowErrorNudgeOutline';

describe('buildNudgeOutline', () => {
	it('follows a pill when every computed corner radius is 9999px', () => {
		const outline = buildNudgeOutline({
			width: 160,
			height: 28,
			radius: 9999,
			bottomRadius: 9999,
			stroke: 2,
		});

		expect(outline?.d).toBe(
			'M 14 0 H 146 A 14 14 0 0 1 160 14 V 14 A 14 14 0 0 1 146 28 H 14 A 14 14 0 0 1 0 14 V 14 A 14 14 0 0 1 14 0',
		);
		expect(outline?.stroke).toBe(2);
		expect(outline?.pad).toBe(1);
	});

	it('keeps a flat bottom when the computed bottom radius is 0', () => {
		const outline = buildNudgeOutline({
			width: 160,
			height: 28,
			radius: 8,
			bottomRadius: 0,
			stroke: 2,
		});

		expect(outline?.d).toBe('M 8 0 H 152 A 8 8 0 0 1 160 8 V 28 H 0 V 8 A 8 8 0 0 1 8 0');
	});
});
