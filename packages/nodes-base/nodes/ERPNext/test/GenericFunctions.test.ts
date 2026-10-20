import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { erpNextApiRequestAllItems } from '../GenericFunctions';

describe('ERPNext > GenericFunctions', () => {
	describe('erpNextApiRequestAllItems', () => {
		let mockExecuteFunctions: ReturnType<typeof mockDeep<IExecuteFunctions>>;

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				environment: 'selfHosted',
				domain: 'https://erpnext.local',
			});
		});

		it('should advance the offset by the page size and return every record once', async () => {
			const allRecords: IDataObject[] = Array.from({ length: 1001 }, (_, index) => ({
				name: `doc-${index}`,
			}));
			const requestedOffsets: number[] = [];

			mockExecuteFunctions.helpers.requestWithAuthentication.mockImplementation(
				async (_credentialsType, options) => {
					const { limit_start: offset, limit_page_length: pageSize } = options.qs as {
						limit_start: number;
						limit_page_length: number;
					};
					requestedOffsets.push(offset);

					return await Promise.resolve({ data: allRecords.slice(offset, offset + pageSize) });
				},
			);

			const result = (await erpNextApiRequestAllItems.call(
				mockExecuteFunctions,
				'data',
				'GET',
				'/api/resource/Customer',
				{},
			)) as IDataObject[];

			expect(requestedOffsets).toEqual([0, 1000, 2000]);
			expect(result).toHaveLength(1001);
			expect(new Set(result.map(({ name }) => name)).size).toBe(1001);
		});
	});
});
