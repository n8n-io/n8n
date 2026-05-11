import { Container } from '@n8n/di';

import { DataTableSizeValidator } from '../data-table-size-validator.service';

export function mockDataTableSizeValidator() {
	const sizeValidator = Container.get(DataTableSizeValidator);
	jest.spyOn(sizeValidator, 'validateSize').mockResolvedValue();
	jest.spyOn(sizeValidator, 'getCachedSizeData').mockResolvedValue({
		totalBytes: 0, // Start with 0 bytes to allow uploads
		dataTables: {},
	});
	return sizeValidator;
}
