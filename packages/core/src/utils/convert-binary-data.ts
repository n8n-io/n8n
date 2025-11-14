import type {
	IBinaryKeyData,
	IDataObject,
	IRunNodeResponse,
	WorkflowSettingsBinaryMode,
} from 'n8n-workflow';

export function convertBinaryData(
	responseData: IRunNodeResponse,
	binaryMode: WorkflowSettingsBinaryMode | undefined,
): IRunNodeResponse {
	if (binaryMode !== 'combined') return responseData;

	if (!responseData.data?.length) return responseData;

	for (const outputData of responseData.data) {
		for (const item of outputData) {
			if (!item.binary) continue;

			item.json = { ...item.json };

			const embededBinaries: IBinaryKeyData = {};
			const jsonBinaries: IDataObject = {};

			for (const [key, value] of Object.entries(item.binary)) {
				if (value?.id) {
					jsonBinaries[key] = value;
				} else {
					embededBinaries[key] = value;
				}
			}

			if (Object.keys(jsonBinaries).length) {
				item.json.binaries = jsonBinaries;
			}

			item.binary = Object.keys(embededBinaries).length ? embededBinaries : undefined;
		}
	}

	return responseData;
}
