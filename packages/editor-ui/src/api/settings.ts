import { IDataObject } from 'n8n-workflow';
import { IRestApiContext, IN8nPrompts, IN8nValueSurveyData, IN8nUISettings, IPersonalizationSurveyAnswers } from '../Interface';
import { makeRestApiRequest, get, post } from './helpers';
import { TEMPLATES_BASE_URL } from '@/constants';

export async function getSettings(context: IRestApiContext): Promise<IN8nUISettings> {
	return await makeRestApiRequest(context, 'GET', '/settings');
}

export async function submitPersonalizationSurvey(context: IRestApiContext, params: IPersonalizationSurveyAnswers): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/user-survey', params as unknown as IDataObject);
}

export async function getPromptsData(instanceId: string): Promise<IN8nPrompts> {
	return await get(TEMPLATES_BASE_URL, '/prompts', {}, {'n8n-instance-id': instanceId});
}

export async function submitContactInfo(instanceId: string, email: string): Promise<void> {
	return await post(TEMPLATES_BASE_URL, '/prompt', { email }, {'n8n-instance-id': instanceId});
}

export async function submitValueSurvey(instanceId: string, params: IN8nValueSurveyData): Promise<IN8nPrompts> {
	return await post(TEMPLATES_BASE_URL, '/value-survey', params, {'n8n-instance-id': instanceId});
}

