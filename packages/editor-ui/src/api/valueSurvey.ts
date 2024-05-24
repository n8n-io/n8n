import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';

export async function valueSurveyShown(context: IRestApiContext): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/value-survey/show');
}

export async function valueSurveyResponded(context: IRestApiContext): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/value-survey/respond');
}

export async function valueSurveyIgnored(context: IRestApiContext): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/value-survey/ignore');
}
