import type { ILoadOptionsFunctions } from 'n8n-workflow';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { modelSearch } from './listSearch';
import * as transport from '../transport';

const mockResponse = {
	data: [
		{
			id: 'claude-opus-4-20250514',
		},
		{
			id: 'claude-sonnet-4-20250514',
		},
	],
};

describe('Anthropic -> listSearch', () => {
	const mockExecuteFunctions = mock<ILoadOptionsFunctions>();
	let apiRequestMock: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();
		apiRequestMock = vi.spyOn(transport, 'apiRequest');
	});

	describe('modelSearch', () => {
		it('should return all models', async () => {
			apiRequestMock.mockResolvedValue(mockResponse);

			const result = await modelSearch.call(mockExecuteFunctions);

			expect(result).toEqual({
				results: [
					{
						name: 'claude-opus-4-20250514',
						value: 'claude-opus-4-20250514',
					},
					{
						name: 'claude-sonnet-4-20250514',
						value: 'claude-sonnet-4-20250514',
					},
				],
			});
		});

		it('should return filtered models', async () => {
			apiRequestMock.mockResolvedValue(mockResponse);

			const result = await modelSearch.call(mockExecuteFunctions, 'sonnet');

			expect(result).toEqual({
				results: [
					{
						name: 'claude-sonnet-4-20250514',
						value: 'claude-sonnet-4-20250514',
					},
				],
			});
		});
	});
});
