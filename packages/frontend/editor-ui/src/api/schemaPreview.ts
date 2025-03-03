import { request } from '@/utils/apiUtils';
import type { JSONSchema7 } from 'json-schema';

export type GetSchemaPreviewOptions = {
	nodeType: string;
	version: number;
	resource?: string;
	operation?: string;
};

const padVersion = (version: number) => {
	return version.toString().split('.').concat(['0', '0']).slice(0, 3).join('.');
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
	return await request({
		method: 'GET',
		baseURL: baseUrl,
		endpoint: `${path}.json`,
		withCredentials: false,
	});
};
