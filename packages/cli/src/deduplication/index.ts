import { type IDataDeduplicator } from 'n8n-workflow';

import { ProcessedDataHelper } from './processed-data-helper';

export async function getDataDeduplicationService(): Promise<IDataDeduplicator> {
	return new ProcessedDataHelper();
}
