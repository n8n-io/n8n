import type { BaseN8nModule } from '@n8n/decorators';
import { N8nModule } from '@n8n/decorators';
import { Logger } from 'n8n-core';

@N8nModule()
export class DatastoreModule implements BaseN8nModule {
	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('datastore');
	}

	initialize(): void | Promise<void> {
		this.logger.debug('Datastore module initialized');
	}
}
