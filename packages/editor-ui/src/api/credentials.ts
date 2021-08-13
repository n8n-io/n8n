import { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from './helpers';
import {
	ICredentialType,
} from 'n8n-workflow';

export async function getCredentials(context: IRestApiContext): Promise<ICredentialType[]> {
	return await makeRestApiRequest(context, 'GET', '/credential-types');
}
