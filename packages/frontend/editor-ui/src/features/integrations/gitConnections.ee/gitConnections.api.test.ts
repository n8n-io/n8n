import type { GitConnectionListPublicDto } from '@n8n/api-types';

import { fetchGitConnections } from './gitConnections.api';

const mockRequest = vi.fn();

vi.mock('@n8n/rest-api-client', () => ({
	request: (...args: unknown[]) => mockRequest(...args),
}));

const context = { baseUrl: '/rest/api/v1' };

const page = (
	names: string[],
	nextCursor: string | null,
): Pick<GitConnectionListPublicDto, 'nextCursor'> & { data: Array<{ name: string }> } => ({
	data: names.map((name) => ({ name })),
	nextCursor,
});

describe('fetchGitConnections', () => {
	beforeEach(() => vi.clearAllMocks());

	it('returns the first page when there is nothing after it', async () => {
		mockRequest.mockResolvedValueOnce(page(['Production'], null));

		expect(await fetchGitConnections(context)).toEqual([{ name: 'Production' }]);
		expect(mockRequest).toHaveBeenCalledTimes(1);
		expect(mockRequest).toHaveBeenCalledWith(
			expect.not.objectContaining({ data: expect.anything() }),
		);
	});

	it('follows the cursor so connections past the first page are not dropped', async () => {
		mockRequest
			.mockResolvedValueOnce(page(['Alpha'], 'cursor-2'))
			.mockResolvedValueOnce(page(['Beta'], 'cursor-3'))
			.mockResolvedValueOnce(page(['Gamma'], null));

		expect(await fetchGitConnections(context)).toEqual([
			{ name: 'Alpha' },
			{ name: 'Beta' },
			{ name: 'Gamma' },
		]);
		expect(mockRequest).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ data: { cursor: 'cursor-2' } }),
		);
		expect(mockRequest).toHaveBeenNthCalledWith(
			3,
			expect.objectContaining({ data: { cursor: 'cursor-3' } }),
		);
	});

	it('stops paging instead of looping forever when the cursor never clears', async () => {
		mockRequest.mockResolvedValue(page(['Repeat'], 'same-cursor'));

		expect(await fetchGitConnections(context)).toHaveLength(20);
		expect(mockRequest).toHaveBeenCalledTimes(20);
	});
});
