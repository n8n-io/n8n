import { IProcessedDataConfig, IProcessedDataManager, IProcessedDataManagers } from 'n8n-core';
// eslint-disable-next-line import/no-cycle
import { ProcessedDataManagerNativeDatabase } from './NativeDatabase';

const activeInstances: {
	[key: string]: IProcessedDataManager;
} = {};

export async function getProcessedDataManagers(
	processedDataConfig: IProcessedDataConfig,
): Promise<IProcessedDataManagers> {
	const availableModes = processedDataConfig.availableModes.split(',');

	availableModes.forEach(async (mode) => {
		if (mode === 'nativeDatabase') {
			activeInstances[mode] = new ProcessedDataManagerNativeDatabase();
			await activeInstances[mode].init();
		} else {
			throw new Error(`The ProcessedDataManager of type '${mode}' is not supported.`);
		}
	});

	return activeInstances;
}
