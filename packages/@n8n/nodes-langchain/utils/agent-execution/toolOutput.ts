import type { EngineResponse } from 'n8n-workflow';
import { jsonStringify, NodeConnectionTypes } from 'n8n-workflow';

import type { RequestResponseMetadata } from './types';

type ActionResponseData =
	EngineResponse<RequestResponseMetadata>['actionResponses'][number]['data'];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function hasOwnProperty(data: object, property: string): boolean {
	return Object.prototype.hasOwnProperty.call(data, property);
}

export function stringifyToolOutput(output: unknown): string | undefined {
	if (output === undefined) return undefined;

	return jsonStringify(output, { replaceCircularRefs: true });
}

function normalizeToolJson(json: unknown): unknown {
	if (!isRecord(json)) return json;

	if (hasOwnProperty(json, 'output')) {
		return json.output;
	}

	if (hasOwnProperty(json, 'response')) {
		return json.response;
	}

	return json;
}

export function getToolOutputFromExecutionData(data: ActionResponseData): string | undefined {
	if (data.error) {
		return stringifyToolOutput({
			error: data.error.message ?? 'Unknown error',
			...(data.error.name ? { errorType: data.error.name } : {}),
		});
	}

	const aiToolItems = data.data?.[NodeConnectionTypes.AiTool]?.[0] ?? [];
	const toolOutputs = aiToolItems
		.map((item) => normalizeToolJson(item.json))
		.filter((item) => item !== undefined);

	if (toolOutputs.length === 0) return undefined;

	return stringifyToolOutput(toolOutputs.length === 1 ? toolOutputs[0] : toolOutputs);
}
