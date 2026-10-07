import type {
	AgentCodingAction,
	AgentCodingFile,
	AgentCodingFileContent,
	AgentCodingDiffContent,
	AgentCodingPreview,
	AgentCodingStatus,
	AgentCodingCreateSession,
	AgentCodingChat,
	AgentCodingSession,
	AgentCodingSessions,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

export function createAgentCodingApi(
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	sessionId?: string,
) {
	const path = `/projects/${projectId}/agents/v2/${agentId}/coding`;
	return {
		sessions: async () =>
			await makeRestApiRequest<AgentCodingSessions>(context, 'GET', `${path}/sessions`),
		createSession: async (request: AgentCodingCreateSession) =>
			await makeRestApiRequest<AgentCodingSession>(context, 'POST', `${path}/sessions`, request),
		createChat: async (id: string) =>
			await makeRestApiRequest<AgentCodingChat>(context, 'POST', `${path}/chats`, {
				sessionId: id,
			}),
		archiveSession: async (id: string, archived: boolean) =>
			await makeRestApiRequest<{ accepted: boolean }>(context, 'POST', `${path}/sessions/archive`, {
				sessionId: id,
				archived,
			}),
		status: async () =>
			await makeRestApiRequest<AgentCodingStatus>(context, 'GET', `${path}/status`, { sessionId }),
		files: async (directory = '', search = '') =>
			await makeRestApiRequest<AgentCodingFile[]>(context, 'GET', `${path}/files`, {
				path: directory,
				search,
				sessionId,
			}),
		file: async (file: string) =>
			await makeRestApiRequest<AgentCodingFileContent>(context, 'GET', `${path}/file`, {
				path: file,
				sessionId,
			}),
		diff: async (file: string) =>
			await makeRestApiRequest<AgentCodingDiffContent>(context, 'GET', `${path}/diff`, {
				path: file,
				sessionId,
			}),
		logs: async (stream: 'setup' | 'app' | 'check') =>
			await makeRestApiRequest<{ content: string }>(context, 'GET', `${path}/logs`, {
				stream,
				sessionId,
			}),
		preview: async () =>
			await makeRestApiRequest<AgentCodingPreview>(context, 'GET', `${path}/preview`, {
				sessionId,
			}),
		action: async (action: AgentCodingAction) =>
			await makeRestApiRequest<{ accepted: boolean }>(context, 'POST', `${path}/action`, {
				...action,
				sessionId,
			}),
	};
}
