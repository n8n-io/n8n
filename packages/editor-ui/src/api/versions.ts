import { IVersion } from '@/Interface';
import { IDataObject } from 'n8n-workflow';
import { get } from './helpers';

export async function getNextVersions(endpoint: string, version: string, headers?: IDataObject): Promise<IVersion[]> {
	return await get(endpoint, version, {}, headers);
}
