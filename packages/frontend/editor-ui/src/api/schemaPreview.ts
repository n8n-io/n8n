import { request } from '@n8n/rest-api-client';
import type { JSONSchema7 } from 'json-schema';
import type { NodeParameterValueType } from 'n8n-workflow';
import { isEmpty } from '@/utils/typesUtils';

export type GetSchemaPreviewOptions = {
	nodeType: string;
	version: number;
	resource?: NodeParameterValueType;
	operation?: NodeParameterValueType;
};

const padVersion = (version: number) => {
	return version.toString().split('.').concat(['0', '0']).slice(0, 3).join('.');
};

const isNonEmptyJsonSchema = (response: unknown): response is JSONSchema7 => {
	return (
		!!response &&
		typeof response === 'object' &&
		'type' in response &&
		'properties' in response &&
		!isEmpty(response.properties)
	);
};

export const getSchemaPreview = async (
	baseUrl: string,
	options: GetSchemaPreviewOptions,
): Promise<JSONSchema7> => {
	const { nodeType, version, resource, operation } = options;
	const versionString = padVersion(version);
	const path = ['schemas', nodeType.replace('@n8n/', ''), versionString, resource, operation]
		.filter(Boolean)
		.join('/');
	const response = await request({
		method: 'GET',
		baseURL: baseUrl,
		endpoint: `${path}.json`,
		withCredentials: false,
	});

	if (!isNonEmptyJsonSchema(response)) throw new Error('Invalid JSON schema');

	return response;
};
