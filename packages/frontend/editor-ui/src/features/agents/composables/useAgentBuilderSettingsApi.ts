import type {
	AgentBuilderAdminSettingsResponse,
	AgentBuilderAdminSettingsUpdateRequest,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

const BASE = '/agent-builder';

export const getAgentBuilderSettings = async (
	context: IRestApiContext,
): Promise<AgentBuilderAdminSettingsResponse> =>
	await makeRestApiRequest<AgentBuilderAdminSettingsResponse>(context, 'GET', `${BASE}/settings`);

export const updateAgentBuilderSettings = async (
	context: IRestApiContext,
	payload: AgentBuilderAdminSettingsUpdateRequest,
): Promise<AgentBuilderAdminSettingsResponse> =>
	await makeRestApiRequest<AgentBuilderAdminSettingsResponse>(
		context,
		'PATCH',
		`${BASE}/settings`,
		payload as unknown as Record<string, unknown>,
	);
