import { Container } from '@n8n/di';

import { DataTableSizeValidator } from '../data-table-size-validator.service';

export function mockDataTableSizeValidator() {
	const sizeValidator = Container.get(DataTableSizeValidator);
	jest.spyOn(sizeValidator, 'validateSize').mockResolvedValue();
	jest.spyOn(sizeValidator, 'getCachedSizeData').mockResolvedValue({
		totalBytes: 50 * 1024 * 1024, // 50MB - under the default limit
		dataTables: {},
	});
	return sizeValidator;
}
