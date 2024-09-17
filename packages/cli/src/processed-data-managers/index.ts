import { type IProcessedDataManager } from 'n8n-workflow';

import { ProcessedDataHelper } from './processed-data-helper';

export async function getProcessedDataManager(): Promise<IProcessedDataManager> {
	return new ProcessedDataHelper();
}
