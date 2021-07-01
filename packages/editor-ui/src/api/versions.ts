import { IVersion } from '@/Interface';
import { get } from './helpers';
import { VERSIONS_BASE_URL } from '@/constants';

export async function getNextVersions(version: string): Promise<IVersion[]> {
	return await get(VERSIONS_BASE_URL, version);
}
