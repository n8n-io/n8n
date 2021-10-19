import { IDataObject } from 'n8n-workflow';
import { IRestApiContext, IN8nUISettings, IPersonalizationSurveyAnswers } from '../Interface';
import { makeRestApiRequest } from './helpers';

export async function getSettings(context: IRestApiContext): Promise<IN8nUISettings> {
	return await makeRestApiRequest(context, 'GET', '/settings');
}

export async function submitPersonalizationSurvey(context: IRestApiContext, params: IPersonalizationSurveyAnswers): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/user-survey', params as unknown as IDataObject);
}

