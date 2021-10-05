import { IDataObject } from 'n8n-workflow';
import { IRestApiContext, IN8nUISettings, ISurvey } from '../Interface';
import { makeRestApiRequest } from './helpers';

export async function getSettings(context: IRestApiContext): Promise<IN8nUISettings> {
	return await makeRestApiRequest(context, 'GET', '/settings');
}

export async function submitSurvey(context: IRestApiContext, params: ISurvey): Promise<void> {
	await Promise.resolve();
	// await makeRestApiRequest(context, 'POST', '/survey', params as unknown as IDataObject);
}

