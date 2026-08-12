import { Container } from '@n8n/di';

import { FileStorageSizeValidator } from '../file-storage-size-validator.service';

export function mockFileStorageSizeValidator() {
	const sizeValidator = Container.get(FileStorageSizeValidator);
	vi.spyOn(sizeValidator, 'validateSize').mockResolvedValue();
	vi.spyOn(sizeValidator, 'getCachedSizeData').mockResolvedValue({
		totalBytes: 0, // Start with 0 bytes to allow uploads
	});
	return sizeValidator;
}
