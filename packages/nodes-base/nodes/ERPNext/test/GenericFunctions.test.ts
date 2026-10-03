import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import * as GenericFunctions from '../GenericFunctions';

describe('ERPNext GenericFunctions', () => {
	describe('erpNextApiRequestAllItems', () => {
		it('should handle 1000-record boundary pagination correctly without overlapping offsets', async () => {
			const mockExecuteFunctions = mock<IExecuteFunctions>();

			const apiRequestSpy = vi
				.spyOn(GenericFunctions, 'erpNextApiRequest')
				.mockResolvedValueOnce({ data: new Array(1000).fill({ id: 1 }) })
				.mockResolvedValueOnce({ data: [] });

			const result = await GenericFunctions.erpNextApiRequestAllItems.call(
				mockExecuteFunctions,
				'data',
				'GET',
				'/api/resource/DocType',
				{},
				{},
			);

			expect(result.length).toBe(1000);
			expect(apiRequestSpy).toHaveBeenCalledTimes(2);

			// First call should have limit_start = 0
			expect(apiRequestSpy.mock.calls[0][3]).toEqual({
				limit_page_length: 1000,
				limit_start: 0,
			});

			// Second call should have limit_start = 1000
			expect(apiRequestSpy.mock.calls[1][3]).toEqual({
				limit_page_length: 1000,
				limit_start: 1000,
			});

			apiRequestSpy.mockRestore();
		});
	});
});
