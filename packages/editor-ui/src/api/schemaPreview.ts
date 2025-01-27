import { request } from '@/utils/apiUtils';
import type { IRestApiContext } from '@/Interface';
import type { JsonSchema } from '@n8n/json-schema-to-zod';

export type GetSchemaPreviewOptions = {
	nodeName: string;
	version: number;
	resource?: string;
	operation?: string;
};

export const getSchemaPreview = async (
	context: IRestApiContext,
	options: GetSchemaPreviewOptions,
): Promise<JsonSchema> => {
	const { nodeName, version, resource, operation } = options;
	const path = [nodeName, version, resource, operation].filter(Boolean).join('/');
	return await request({
		method: 'GET',
		baseURL: context.baseUrl,
		endpoint: `${path}.json`,
		headers: { 'push-ref': context.pushRef },
		withCredentials: false,
	});
};
