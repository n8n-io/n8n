import type {
	CreateEncryptionKeyDto,
	EncryptionKeysList,
	EncryptionKeysSortOption,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

import type { EncryptionKey } from './encryption-keys.types';

const ENDPOINT = '/encryption/keys';

export type GetEncryptionKeysParams = {
	type?: 'data_encryption';
	skip?: number;
	take?: number;
	sortBy?: EncryptionKeysSortOption;
	activatedFrom?: string;
	activatedTo?: string;
};

export const getEncryptionKeys = async (
	context: IRestApiContext,
	params: GetEncryptionKeysParams = {},
): Promise<EncryptionKeysList> =>
	await makeRestApiRequest<EncryptionKeysList>(context, 'GET', ENDPOINT, { ...params });

export const rotateEncryptionKey = async (context: IRestApiContext): Promise<EncryptionKey> => {
	const payload: CreateEncryptionKeyDto = { type: 'data_encryption' };
	return await makeRestApiRequest<EncryptionKey>(context, 'POST', ENDPOINT, { ...payload });
};
