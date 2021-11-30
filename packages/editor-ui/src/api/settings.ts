import { IDataObject } from 'n8n-workflow';
import { IRestApiContext, IN8nPrompt, IN8nUISettings, IPersonalizationSurveyAnswers } from '../Interface';
import { makeRestApiRequest, get, post } from './helpers';
import { TEMPLATES_BASE_URL } from '@/constants';

export async function getSettings(context: IRestApiContext): Promise<IN8nUISettings> {
	return await makeRestApiRequest(context, 'GET', '/settings');
}

export async function submitPersonalizationSurvey(context: IRestApiContext, params: IPersonalizationSurveyAnswers): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/user-survey', params as unknown as IDataObject);
}

export async function getPromptsData(instanceId: string): Promise<IN8nPrompt> {
	return await get(TEMPLATES_BASE_URL, '/prompts', {}, {'n8n-instance-id': instanceId});
}

export async function submitValueSurvey(instanceId: string, params: IDataObject): Promise<IN8nPrompt> {
	return await post(TEMPLATES_BASE_URL, '/value-survey', params, {'n8n-instance-id': instanceId});
}

