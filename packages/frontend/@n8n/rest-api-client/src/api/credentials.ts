import type { CreateCredentialPublicDto, CredentialPublicDto } from '@n8n/api-types';

import type { PublicApiContext } from '../types';
import { makePublicApiRequest } from '../utils';

/** Creates a credential through the public API, which accepts the credential id. */
export async function createPublicCredential(
	context: PublicApiContext,
	data: CreateCredentialPublicDto,
): Promise<CredentialPublicDto> {
	return await makePublicApiRequest(context, 'POST', '/credentials', data);
}
