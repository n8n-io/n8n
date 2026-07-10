import { Container } from '@n8n/di';

import { DataTableSizeValidator } from '@n8n/data-table';

export function mockDataTableSizeValidator() {
	const sizeValidator = Container.get(DataTableSizeValidator);
	vi.spyOn(sizeValidator, 'validateSize').mockResolvedValue();
	vi.spyOn(sizeValidator, 'getCachedSizeData').mockResolvedValue({
		totalBytes: 0, // Start with 0 bytes to allow uploads
		dataTables: {},
	});
	return sizeValidator;
}
