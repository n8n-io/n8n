import { PublicInstalledPackage } from 'n8n-workflow';
import { get } from './helpers';

const LOCAL_BASE_URL = 'http://localhost:5678';

export async function getInstalledCommunityNodes(): Promise<PublicInstalledPackage[]> {
	// TODO Use n8n API base URL instead of localhost once it's merged
	const response = await get(LOCAL_BASE_URL, '/rest/nodes');

	return response.data || [];
}
