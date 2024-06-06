import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';

export async function npsSurveyShown(context: IRestApiContext): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/nps-survey/show');
}

export async function npsSurveyResponded(context: IRestApiContext): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/nps-survey/respond');
}

export async function npsSurveyIgnored(context: IRestApiContext): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/nps-survey/ignore');
}
