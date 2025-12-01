import { Container } from '@n8n/di';
import type {
	IBinaryKeyData,
	IDataObject,
	IRunNodeResponse,
	WorkflowSettingsBinaryMode,
} from 'n8n-workflow';
import { BINARY_ENCODING, BINARY_IN_JSON_PROPERTY } from 'n8n-workflow';

import { BinaryDataConfig } from '../binary-data/binary-data.config';
import { prepareBinaryData } from '../execution-engine/node-execution-context/utils/binary-helper-functions';

export async function convertBinaryData(
	workflowId: string,
	executionId: string | undefined,
	responseData: IRunNodeResponse,
	binaryMode: WorkflowSettingsBinaryMode | undefined,
) {
	const { mode } = Container.get(BinaryDataConfig);
	if (binaryMode !== 'combined' || mode === 'default') return responseData;

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
					continue;
				}

				if (!executionId) {
					embededBinaries[key] = value;
					continue;
				}

				const buffer = Buffer.from(value.data, BINARY_ENCODING);
				const binaryData = await prepareBinaryData(
					buffer,
					executionId,
					workflowId,
					undefined,
					value?.mimeType,
				);

				if (value.fileName) {
					binaryData.fileName = value.fileName;
				}

				jsonBinaries[key] = binaryData;
			}

			if (Object.keys(jsonBinaries).length) {
				const existingJsonBinaries = (item.json[BINARY_IN_JSON_PROPERTY] as IBinaryKeyData) ?? {};
				item.json[BINARY_IN_JSON_PROPERTY] = { ...existingJsonBinaries, ...jsonBinaries };
			}

			item.binary = Object.keys(embededBinaries).length ? embededBinaries : undefined;
		}
	}

	return responseData;
}
