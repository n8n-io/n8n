import type { IRestApiContext } from '@/Interface';
import { get } from '@/utils/apiUtils';

export type UserCtas = {
	becomeCreator: boolean;
};

export async function getUserCtas(context: IRestApiContext): Promise<UserCtas> {
	const response = await get(context.baseUrl, '/cta');

	return response;
}
