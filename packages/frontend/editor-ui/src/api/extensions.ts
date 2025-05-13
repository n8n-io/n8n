import type { IRestApiContext } from '@/Interface';
import { get } from '@/utils/apiUtils';
import type { ExtensionManifest } from '@n8n/sdk';

export async function getExtensions(context: IRestApiContext): Promise<ExtensionManifest[]> {
	return await get(context.baseUrl, '/extensions');
}
