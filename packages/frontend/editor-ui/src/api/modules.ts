import type { IRestApiContext } from '@/Interface';
import { get } from '@/utils/apiUtils';
import type { ModuleManifest } from '@n8n/sdk';

export async function getModules(context: IRestApiContext): Promise<ModuleManifest[]> {
	return await get(context.baseUrl, '/modules');
}
