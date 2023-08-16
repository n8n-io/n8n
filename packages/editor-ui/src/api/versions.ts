import type { IVersion } from '@/Interface';
import { INSTANCE_ID_HEADER } from '@/constants';
import { get } from '@/utils/apiUtils';

export async function getNextVersions(
	endpoint: string,
	version: string,
	instanceId: string,
): Promise<IVersion[]> {
	const headers = { [INSTANCE_ID_HEADER as string]: instanceId };
	return get(endpoint, version, {}, headers);
}
