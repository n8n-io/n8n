import { type IDataDeduplicator } from 'n8n-workflow';

import { DeduplicationHelper } from './deduplication-helper.js';

export function getDataDeduplicationService(): IDataDeduplicator {
	return new DeduplicationHelper();
}
