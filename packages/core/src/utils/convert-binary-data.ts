import { Container } from '@n8n/di';
import type { IBinaryKeyData, IRunNodeResponse, WorkflowSettingsBinaryMode } from 'n8n-workflow';
import {
	BINARY_ENCODING,
	BINARY_IN_JSON_PROPERTY,
	BINARY_MODE_COMBINED,
	UnexpectedError,
} from 'n8n-workflow';

import { BinaryDataConfig } from '../binary-data/binary-data.config';
import { prepareBinaryData } from '../execution-engine/node-execution-context/utils/binary-helper-functions';

export async function convertBinaryData(
	workflowId: string,
	executionId: string | undefined,
	responseData: IRunNodeResponse,
	binaryMode: WorkflowSettingsBinaryMode | undefined,
) {
	const { mode } = Container.get(BinaryDataConfig);
	if (binaryMode !== BINARY_MODE_COMBINED || mode === 'default') return responseData;

	if (!responseData.data?.length) return responseData;

	for (const outputData of responseData.data) {
		for (const item of outputData) {
			if (!item.binary) continue;

			item.json = { ...item.json };
			item.binary = { ...item.binary };

			const embeddedBinaries: IBinaryKeyData = {};
			const jsonBinaries: IBinaryKeyData = {};

			for (const [key, value] of Object.entries(item.binary)) {
				if (value?.id) {
					jsonBinaries[key] = value;
					continue;
				}

				if (!executionId) {
					embeddedBinaries[key] = value;
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

			const existingValue = item.json[BINARY_IN_JSON_PROPERTY] ?? {};
			if (Array.isArray(existingValue) || typeof existingValue !== 'object') {
				throw new UnexpectedError(
					`Binary data could not be converted. Item already has '${BINARY_IN_JSON_PROPERTY}' field, but value type is not an object`,
				);
			}

			if (Object.keys(jsonBinaries).length) {
				const existingJsonBinaries = existingValue as IBinaryKeyData;
				item.json[BINARY_IN_JSON_PROPERTY] = { ...existingJsonBinaries, ...jsonBinaries };
			}

			item.binary = Object.keys(embeddedBinaries).length ? embeddedBinaries : undefined;
		}
	}

	return responseData;
}
