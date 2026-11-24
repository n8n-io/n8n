import { FsByteStore } from '@n8n/blob-storage';
import { Service } from '@n8n/di';

import { ErrorReporter } from '@/errors';
import { StorageConfig } from '@/storage.config';

/**
 * The `fs` byte store rooted at `N8N_STORAGE_PATH`, shared by every domain that
 * persists blobs there. Needed because `FsByteStore` takes plain options and
 * carries no DI decorators, so injecting one requires a registered subclass.
 */
@Service()
export class FsByteStoreService extends FsByteStore {
	constructor(storageConfig: StorageConfig, errorReporter: ErrorReporter) {
		super({
			storagePath: storageConfig.storagePath,
			reportError: (error) => errorReporter.error(error),
		});
	}
}
