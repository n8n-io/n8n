import type { AssistantUsageResponse, AssistantUsageUsersResponse } from '@n8n/api-types';
import type { AssistantUsage, AssistantUsageFilter } from '@n8n/frontend-module-sdk';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useRootStore } from '@n8n/stores/useRootStore';

import { useInstanceAiSettingsStore } from './instanceAiSettings.store';

function toQuery({ startDate, endDate, projectId }: AssistantUsageFilter) {
	return {
		startDate: startDate.toISOString(),
		endDate: endDate.toISOString(),
		...(projectId ? { projectId } : {}),
	};
}

/**
 * The usage page of the insights module. Only the Assistant on the agents
 * runtime records usage, so the page shows only when that runtime runs.
 */
export const assistantUsage: AssistantUsage = {
	isAvailable: () =>
		useInstanceAiSettingsStore().isAssistantAgentEnabled &&
		useRBACStore().hasScope('instanceAi:viewUsage'),
	fetchUsage: async (filter) =>
		await makeRestApiRequest<AssistantUsageResponse>(
			useRootStore().restApiContext,
			'GET',
			'/assistant/usage',
			{ ...toQuery(filter), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
		),
	fetchUsers: async ({ skip, take, sortBy, ...filter }) =>
		await makeRestApiRequest<AssistantUsageUsersResponse>(
			useRootStore().restApiContext,
			'GET',
			'/assistant/usage/users',
			{ ...toQuery(filter), skip, take, ...(sortBy ? { sortBy } : {}) },
		),
};
