import { IRestApiContext, IN8nPrompts, IN8nValueSurveyData, IN8nUISettings } from '../Interface';
import { makeRestApiRequest, get, post } from './helpers';
import { TEMPLATES_BASE_URL } from '@/constants';

export function getSettings(context: IRestApiContext): Promise<IN8nUISettings> {
	return makeRestApiRequest(context, 'GET', '/settings');
}

export function getPromptsData(instanceId: string, userId: string): Promise<IN8nPrompts> {
	return get(TEMPLATES_BASE_URL, '/prompts', {}, {'n8n-instance-id': instanceId, 'n8n-user-id': userId});
}

export function submitContactInfo(instanceId: string, userId: string, email: string): Promise<void> {
	return post(TEMPLATES_BASE_URL, '/prompt', { email }, {'n8n-instance-id': instanceId, 'n8n-user-id': userId});
}

export function submitValueSurvey(instanceId: string, userId: string, params: IN8nValueSurveyData): Promise<IN8nPrompts> {
	return post(TEMPLATES_BASE_URL, '/value-survey', params, {'n8n-instance-id': instanceId, 'n8n-user-id': userId});
}

