import type { CreateEncryptionKeyDto } from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

import type { EncryptionKey } from './encryption-keys.types';

const ENDPOINT = '/encryption/keys';

export const getEncryptionKeys = async (context: IRestApiContext): Promise<EncryptionKey[]> => {
	return await makeRestApiRequest<EncryptionKey[]>(context, 'GET', ENDPOINT, {
		type: 'data_encryption',
	});
};

export const rotateEncryptionKey = async (context: IRestApiContext): Promise<EncryptionKey> => {
	const payload: CreateEncryptionKeyDto = { type: 'data_encryption' };
	return await makeRestApiRequest<EncryptionKey>(context, 'POST', ENDPOINT, { ...payload });
};
