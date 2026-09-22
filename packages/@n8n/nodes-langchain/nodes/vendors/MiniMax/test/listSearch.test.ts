import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

vi.mock('../transport', () => ({
	apiRequest: vi.fn(),
}));

import { modelSearch } from '../methods/listSearch';
import { apiRequest } from '../transport';

import type { Mock } from 'vitest';

const mockApiRequest = apiRequest as Mock;

describe('MiniMax listSearch', () => {
	let mockLoadOptionsFunctions: ReturnType<typeof mock<ILoadOptionsFunctions>>;

	beforeEach(() => {
		mockLoadOptionsFunctions = mock<ILoadOptionsFunctions>();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const models = ['MiniMax-M3', 'MiniMax-M2.7', 'MiniMax-M2.5'];

	describe('modelSearch', () => {
		it('should return all models', async () => {
			mockApiRequest.mockResolvedValue({
				data: models.map((id) => ({ id })),
			});

			const result = await modelSearch.call(mockLoadOptionsFunctions);

			expect(result.results).toEqual(models.map((id) => ({ name: id, value: id })));
		});

		it('should apply the search filter', async () => {
			mockApiRequest.mockResolvedValue({
				data: models.map((id) => ({ id })),
			});

			const result = await modelSearch.call(mockLoadOptionsFunctions, 'm2');

			const values = result.results.map((r) => r.value);
			expect(values).toContain('MiniMax-M2.7');
			expect(values).toContain('MiniMax-M2.5');
			expect(values).not.toContain('MiniMax-M3');
		});

		it('should call the models endpoint', async () => {
			mockApiRequest.mockResolvedValue({
				data: models.map((id) => ({ id })),
			});

			await modelSearch.call(mockLoadOptionsFunctions);

			expect(mockApiRequest).toHaveBeenCalledTimes(1);
			expect(mockApiRequest).toHaveBeenCalledWith('GET', '/v1/models');
		});
	});
});
