import {
	ApplicationError,
	type IProcessedDataConfig,
	type IProcessedDataManager,
	type IProcessedDataManagers,
} from 'n8n-workflow';

// eslint-disable-next-line import/no-cycle
import { ProcessedDataHelper } from './processed-data-helper';

const activeInstances: {
	[key: string]: IProcessedDataManager;
} = {};

export async function getProcessedDataManagers(
	processedDataConfig: IProcessedDataConfig,
): Promise<IProcessedDataManagers> {
	const availableModes = processedDataConfig.availableModes.split(',');

	availableModes.forEach(async (mode) => {
		if (mode === 'nativeDatabase') {
			activeInstances[mode] = new ProcessedDataHelper();
		} else {
			throw new ApplicationError(`The ProcessedDataManager of type '${mode}' is not supported.`);
		}
	});

	return activeInstances;
}
