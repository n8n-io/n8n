import { IRestApiContext, IN8nUISettings } from '../Interface';
import { makeRestApiRequest } from './helpers';

export async function getSettings(context: IRestApiContext): Promise<IN8nUISettings> {
	return await makeRestApiRequest(context, 'GET', '/settings');
}
