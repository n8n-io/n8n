import { Container } from '@n8n/di';

import { DataStoreSizeValidator } from '../data-store-size-validator.service';

export function mockDataStoreSizeValidator() {
	const sizeValidator = Container.get(DataStoreSizeValidator);
	jest.spyOn(sizeValidator, 'validateSize').mockResolvedValue();
	jest.spyOn(sizeValidator, 'getCachedSizeData').mockResolvedValue({
		totalBytes: 50 * 1024 * 1024, // 50MB - under the default limit
		dataTables: {},
	});
	return sizeValidator;
}
