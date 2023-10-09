import type { IRestApiContext } from '@/Interface';
import type { PublicInstalledPackage } from 'n8n-workflow';
import { get, post, makeRestApiRequest } from '@/utils';

export async function getInstalledCommunityNodes(
	context: IRestApiContext,
): Promise<PublicInstalledPackage[]> {
	const response = await get(context.baseUrl, '/community-packages');
	return response.data || [];
}

export async function installNewPackage(
	context: IRestApiContext,
	name: string,
): Promise<PublicInstalledPackage> {
	return post(context.baseUrl, '/community-packages', { name });
}

export async function uninstallPackage(context: IRestApiContext, name: string): Promise<void> {
	return makeRestApiRequest(context, 'DELETE', '/community-packages', { name });
}

export async function updatePackage(
	context: IRestApiContext,
	name: string,
): Promise<PublicInstalledPackage> {
	return makeRestApiRequest(context, 'PATCH', '/community-packages', { name });
}
