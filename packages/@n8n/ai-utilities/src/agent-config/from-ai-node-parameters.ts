/**
 * Pure `$fromAI(...)` reference scanning over node parameters. Shared by the CLI
 * agent builder and the instance-ai config tools so both enforce the same rule:
 * stable dynamic selectors must be resolved with `get_resource_locator_options`,
 * not left as `$fromAI`.
 */
import type { INodeParameters } from 'n8n-workflow';

import { extractFromAIParameters } from '../utils/fromai-helpers';

export type FromAiParameterReference = {
	parameterPath: string;
	jsonPointer: string;
	value: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function escapeJsonPointerPart(part: string): string {
	return part.replaceAll('~', '~0').replaceAll('/', '~1');
}

function containsFromAiCall(value: string): boolean {
	const parameters: INodeParameters = { value };

	try {
		return extractFromAIParameters(parameters).length > 0;
	} catch {
		return false;
	}
}

export function collectFromAiParameterReferences(
	value: unknown,
	pathParts: string[] = [],
	jsonPointerParts: string[] = pathParts,
): FromAiParameterReference[] {
	if (typeof value === 'string') {
		if (!containsFromAiCall(value) || pathParts.length === 0) return [];

		return [
			{
				parameterPath: pathParts.join('.'),
				jsonPointer: jsonPointerParts.map(escapeJsonPointerPart).join('/'),
				value,
			},
		];
	}

	if (Array.isArray(value)) {
		return value.flatMap((item, index) =>
			collectFromAiParameterReferences(item, pathParts, [...jsonPointerParts, String(index)]),
		);
	}

	if (!isRecord(value)) return [];

	return Object.entries(value).flatMap(([key, nested]) =>
		collectFromAiParameterReferences(nested, [...pathParts, key], [...jsonPointerParts, key]),
	);
}

export function hasMatchingFromAiParameterReference(
	references: FromAiParameterReference[],
	candidate: FromAiParameterReference,
): boolean {
	return references.some(
		(reference) =>
			reference.jsonPointer === candidate.jsonPointer && reference.value === candidate.value,
	);
}
