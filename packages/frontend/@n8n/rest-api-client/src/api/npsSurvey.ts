import type { NpsSurveyState } from 'n8n-workflow';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function updateNpsSurveyState(context: IRestApiContext, state: NpsSurveyState) {
	await makeRestApiRequest(context, 'PATCH', '/user-settings/nps-survey', state);
}
