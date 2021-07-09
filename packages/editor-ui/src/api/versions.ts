import { IVersion } from '@/Interface';
import { get } from './helpers';

export async function getNextVersions(endpoint: string, version: string): Promise<IVersion[]> {
	return await get(endpoint, version);
}
