import { updateDisplayOptions } from '../../../utils/utilities';
import {
	useFieldIdsOption,
	insertUpdateOptions,
	searchOptions,
} from '../v2/actions/common.descriptions';
import * as createOperation from '../v2/actions/record/create.operation';
import * as getOperation from '../v2/actions/record/get.operation';
import * as searchOperation from '../v2/actions/record/search.operation';

describe('UI Configuration Verification', () => {
	describe('Options are properly defined', () => {
		it('should have useFieldIds option defined as a top-level property', () => {
			expect(useFieldIdsOption).toBeDefined();
			expect(useFieldIdsOption).toMatchObject({
				displayName: 'Use Field IDs',
				name: 'useFieldIds',
				type: 'boolean',
				default: false,
				description: expect.stringContaining('field IDs instead of field names'),
			});
		});

		it('should have returnFieldsByFieldId option defined', () => {
			expect(searchOptions).toMatchObject({
				displayName: 'Return Fields By Field ID',
				name: 'returnFieldsByFieldId',
				type: 'boolean',
				default: false,
				description: expect.stringContaining('return fields using their field IDs'),
			});
		});
	});

	describe('Options are included in operations', () => {
		it('create operation should include useFieldIds option as a top-level property', () => {
			const useFieldIdsParam = createOperation.description.find(
				(param) => param.name === 'useFieldIds',
			);

			expect(useFieldIdsParam).toBeDefined();
			expect(useFieldIdsParam?.type).toBe('boolean');
			expect(useFieldIdsParam?.default).toBe(false);
		});

		it('get operation should include returnFieldsByFieldId option as a top-level property', () => {
			const returnFieldsByFieldIdParam = getOperation.description.find(
				(param) => param.name === 'returnFieldsByFieldId',
			);

			expect(returnFieldsByFieldIdParam).toBeDefined();
			expect(returnFieldsByFieldIdParam?.type).toBe('boolean');
			expect(returnFieldsByFieldIdParam?.default).toBe(false);
		});

		it('search operation should include returnFieldsByFieldId option as a top-level property', () => {
			const returnFieldsByFieldIdParam = searchOperation.description.find(
				(param) => param.name === 'returnFieldsByFieldId',
			);

			expect(returnFieldsByFieldIdParam).toBeDefined();
			expect(returnFieldsByFieldIdParam?.type).toBe('boolean');
			expect(returnFieldsByFieldIdParam?.default).toBe(false);
		});
	});

	describe('ResourceMapper configuration', () => {
		it('should use field names as display values in create operation', () => {
			const columnsParam = createOperation.description.find((param) => param.name === 'columns');

			expect(columnsParam).toBeDefined();
			expect(columnsParam?.type).toBe('resourceMapper');
			expect(columnsParam?.typeOptions?.resourceMapper).toBeDefined();
		});
	});
});
