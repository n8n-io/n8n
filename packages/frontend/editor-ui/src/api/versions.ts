import type { IVersion } from '@/Interface';
import { INSTANCE_ID_HEADER } from '@/constants';
import { get } from '@n8n/rest-api-client';

export async function getNextVersions(
	endpoint: string,
	version: string,
	instanceId: string,
): Promise<IVersion[]> {
	const headers = { [INSTANCE_ID_HEADER as string]: instanceId };
	return await get(endpoint, version, {}, headers);
}
