import { outputsOfV1Engine } from './verify.ts';

const inputs = [{ position: 1, $binary: { data: {} } }, { position: 2 }];

describe('the outputs that the v1 engine makes from the output of a node', () => {
	it('keeps the items of the node under "continue on fail"', () => {
		const raw = [[{ json: { id: 1 }, paired: 0 }, { json: { error: 'bad' } }]];
		expect(outputsOfV1Engine(raw, 'continueRegularOutput', inputs)).toEqual({
			outputs: [[{ id: 1 }, { error: 'bad' }]],
		});
	});

	it('gives the message of an item that carries an error', () => {
		const raw = [[{ json: { id: 1 }, error: 'bad', paired: 0 }]];
		expect(outputsOfV1Engine(raw, 'continueRegularOutput', inputs)).toEqual({
			outputs: [[{ error: 'bad' }]],
		});
		expect(outputsOfV1Engine(raw, 'continueErrorOutput', inputs)).toEqual({
			outputs: [[], [{ error: 'bad' }]],
			pairing: undefined,
		});
	});

	it('moves a paired error item to the error output, in the json of its input item', () => {
		const raw = [
			[
				{ json: { error: 'bad', message: 'm' }, paired: 1 },
				{ json: { error: 'bad', id: 1 }, paired: 0 },
				{ json: { error: '' }, paired: 0 },
			],
		];
		expect(outputsOfV1Engine(raw, 'continueErrorOutput', inputs)).toEqual({
			outputs: [
				[{ error: 'bad', id: 1 }, { error: '' }],
				[{ position: 2, error: 'bad', message: 'm' }],
			],
			pairing: 'item',
		});
	});

	it('pairs an error item without a paired item by position, as v1 does', () => {
		const error = { json: { error: 'bad' } };
		const ok = { json: { id: 1 }, paired: 0 };
		expect(outputsOfV1Engine([[error, error]], 'continueErrorOutput', inputs)).toEqual({
			outputs: [
				[],
				[
					{ position: 1, error: 'bad' },
					{ position: 2, error: 'bad' },
				],
			],
			pairing: 'position',
		});
		expect(outputsOfV1Engine([[ok, ok, error]], 'continueErrorOutput', inputs)).toEqual({
			outputs: [[{ id: 1 }, { id: 1 }], [{ error: 'bad' }]],
			pairing: 'position',
		});
		expect(outputsOfV1Engine([[error]], 'continueErrorOutput', inputs)).toEqual({
			outputs: [[], [{ position: 1, error: 'bad' }]],
			pairing: 'position',
		});
		expect(outputsOfV1Engine([[ok, ok, error]], 'continueErrorOutput', [inputs[1]])).toEqual({
			outputs: [[{ id: 1 }, { id: 1 }], [{ position: 2, error: 'bad' }]],
			pairing: 'position',
		});
	});

	it('gives a reason when it cannot give the outputs', () => {
		const paired = { json: { error: 'bad' }, paired: 0 };
		const unpaired = { json: { error: 'bad' } };
		expect(outputsOfV1Engine([[paired, unpaired]], 'continueErrorOutput', inputs)).toBe(
			'v1 pairs some error items with their input items and not others',
		);
		expect(outputsOfV1Engine([[paired], []], 'continueRegularOutput', inputs)).toBe(
			'the v1 node has more than one output',
		);
	});
});
