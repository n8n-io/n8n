import { IDataObject } from 'n8n-workflow';
import { IRestApiContext, IN8nContactPrompt, IN8nUISettings, IPersonalizationSurveyAnswers } from '../Interface';
import { makeRestApiRequest, get } from './helpers';
import { TEMPLATES_BASE_URL } from '@/constants';

export async function getSettings(context: IRestApiContext): Promise<IN8nUISettings> {
	return await makeRestApiRequest(context, 'GET', '/settings');
}

export async function submitPersonalizationSurvey(context: IRestApiContext, params: IPersonalizationSurveyAnswers): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/user-survey', params as unknown as IDataObject);
}

export async function getContactPromptData(instanceId: string): Promise<IN8nContactPrompt> {
	//static response for staging enviroment
	return { show: true };
	//production envrionemnt
	return await get(TEMPLATES_BASE_URL, '/prompt', {}, {'n8n-instance-id': instanceId});
}

