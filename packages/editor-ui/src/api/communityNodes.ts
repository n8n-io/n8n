import { IRestApiContext } from '@/Interface';
import { PublicInstalledPackage } from 'n8n-workflow';
import { get, post } from './helpers';

export async function getInstalledCommunityNodes(context: IRestApiContext): Promise<PublicInstalledPackage[]> {
	const response = await get(context.baseUrl, '/nodes');
	return response.data || [];
}

export async function installNewPackage(context: IRestApiContext, name: string): Promise<PublicInstalledPackage> {
	return await post(context.baseUrl, '/nodes', { name });
}
