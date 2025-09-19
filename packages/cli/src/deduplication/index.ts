import { type IDataDeduplicator } from 'n8n-workflow';

import { DeduplicationHelper } from './deduplication-helper';

export function getDataDeduplicationService(): IDataDeduplicator {
	return new DeduplicationHelper();
}
