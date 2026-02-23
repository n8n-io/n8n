import { stringify } from 'flatted';

import * as flattedAsync from '../flatted-async';
import { parseFlatted, SIZE_THRESHOLD } from '../parse-flatted';

jest.mock('../flatted-async');

describe('parseFlatted', () => {
	const parseFlattedAsyncMock = jest.mocked(flattedAsync.parseFlattedAsync);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should use sync flatted.parse for small data', async () => {
		const original = { name: 'test' };
		const flattedString = stringify(original);

		const result = await parseFlatted(flattedString);

		expect(result).toEqual(original);
		expect(parseFlattedAsyncMock).not.toHaveBeenCalled();
	});

	it('should use sync flatted.parse for data below the threshold', async () => {
		// Valid flatted JSON padded to just under the threshold
		const padding = stringify({ data: 'x'.repeat(100) });
		expect(padding.length).toBeLessThan(SIZE_THRESHOLD);

		await parseFlatted(padding);

		expect(parseFlattedAsyncMock).not.toHaveBeenCalled();
	});

	it('should use parseFlattedAsync for data at or above the threshold', async () => {
		const aboveThreshold = '[' + '"x"'.repeat(SIZE_THRESHOLD) + ']';
		parseFlattedAsyncMock.mockResolvedValue({ parsed: true });

		const result = await parseFlatted(aboveThreshold);

		expect(parseFlattedAsyncMock).toHaveBeenCalledWith(aboveThreshold);
		expect(result).toEqual({ parsed: true });
	});
});
