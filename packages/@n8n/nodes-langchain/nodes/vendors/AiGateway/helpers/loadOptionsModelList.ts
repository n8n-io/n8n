import type { INodePropertyOptions } from 'n8n-workflow';

import type { AiGatewayResource } from './modelCapabilities';
import { getDefaultModelForResourceOperation } from './modelParams';

/**
 * ILoadOptionsFunctions.getNodeParameter(name, fallback) uses the 2nd arg as fallback — not item index.
 * Previously we passed `0`, so missing resource/operation became the number 0 and broke filtering.
 */
export function normalizeResourceForLoadOptions(raw: unknown): AiGatewayResource {
	if (raw === 'text' || raw === 'image' || raw === 'file' || raw === 'audio') {
		return raw;
	}
	return 'text';
}

export function defaultOperationForResource(resource: AiGatewayResource): string {
	switch (resource) {
		case 'image':
			return 'generate';
		case 'file':
			return 'analyze';
		case 'audio':
			return 'transcribe';
		default:
			return 'message';
	}
}

export function normalizeOperationForLoadOptions(
	resource: AiGatewayResource,
	raw: unknown,
): string {
	const fallback = defaultOperationForResource(resource);
	if (typeof raw !== 'string' || raw.length === 0) {
		return fallback;
	}

	switch (resource) {
		case 'text':
			if (raw === 'message' || raw === 'messageVision' || raw === 'json') return raw;
			return fallback;
		case 'image':
			return raw === 'generate' ? raw : fallback;
		case 'file':
			return raw === 'analyze' ? raw : fallback;
		case 'audio':
			return raw === 'transcribe' ? raw : fallback;
		default:
			return fallback;
	}
}

/** Default model id for the model-selector list (must match execute fallbacks in operations). */
export function getDefaultModelIdForLoadOptions(
	resource: AiGatewayResource,
	operation: string,
): string {
	return getDefaultModelForResourceOperation(resource, operation);
}

const EMPTY_META = JSON.stringify({
	inputCost: 0,
	outputCost: 0,
	contextLength: 0,
	capabilities: {
		vision: false,
		function_calling: false,
		json_mode: false,
	},
});

/**
 * Model selector shows blank if the current value is not in the loaded option list.
 * Ensures the instance default id is always present so the UI can display a selection.
 */
export function ensurePreferredModelInOptions(
	options: INodePropertyOptions[],
	preferredId: string,
): INodePropertyOptions[] {
	if (options.some((o) => o.value === preferredId)) {
		return options;
	}

	return [
		{
			name: preferredId,
			value: preferredId,
			description: EMPTY_META,
		},
		...options,
	];
}
