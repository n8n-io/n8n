import type { AiUsageSettingsRequestDto } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function updateAiUsageSettings(
	context: IRestApiContext,
	data: AiUsageSettingsRequestDto,
): Promise<void> {
	return await makeRestApiRequest(context, 'POST', '/ai/usage-settings', data);
}
