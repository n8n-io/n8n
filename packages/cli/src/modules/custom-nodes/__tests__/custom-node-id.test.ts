import { generateCustomNodeId } from '../custom-node-id';

describe('generateCustomNodeId', () => {
	it('returns the first generated id that does not end with Tool', () => {
		const generate = vi
			.fn<() => string>()
			.mockReturnValueOnce('abcdefghijklTool')
			.mockReturnValueOnce('abcdefghijkTool2')
			.mockReturnValueOnce('nextTool');

		expect(generateCustomNodeId(generate)).toBe('abcdefghijkTool2');
		expect(generate).toHaveBeenCalledTimes(2);
	});

	it('uses a 16-character nano id by default', () => {
		const id = generateCustomNodeId();

		expect(id).toHaveLength(16);
		expect(id.endsWith('Tool')).toBe(false);
	});
});
