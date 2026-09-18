import { mock } from 'vitest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { ERPNext } from '../ERPNext.node';
import * as GenericFunctions from '../GenericFunctions';

describe('ERPNext Node', () => {
	let erpNextNode: ERPNext;

	beforeEach(() => {
		erpNextNode = new ERPNext();
	});

	describe('loadOptions', () => {
		describe('getDocFields', () => {
			it('should query /api/resource/DocField and map responses correctly with fallback', async () => {
				const mockLoadOptionsFunctions = mock<ILoadOptionsFunctions>();
				mockLoadOptionsFunctions.getCurrentNodeParameter.mockReturnValue('Customer');

				const apiRequestSpy = vi.spyOn(GenericFunctions, 'erpNextApiRequest').mockResolvedValueOnce({
					data: [
						{ fieldname: 'name_only', label: '' },
						{ fieldname: 'has_label', label: 'My Label' },
					],
				});

				const result = await erpNextNode.methods!.loadOptions!.getDocFields!.call(
					mockLoadOptionsFunctions,
				);

				expect(apiRequestSpy).toHaveBeenCalledWith(
					'GET',
					'/api/resource/DocField',
					{},
					{
						filters: JSON.stringify([['parent', '=', 'Customer']]),
						fields: JSON.stringify(['fieldname', 'label']),
						limit_page_length: 1000,
					},
				);

				expect(result).toEqual([
					{ name: 'My Label', value: 'has_label' },
					{ name: 'name_only', value: 'name_only' },
				]);

				apiRequestSpy.mockRestore();
			});
		});
	});
});
