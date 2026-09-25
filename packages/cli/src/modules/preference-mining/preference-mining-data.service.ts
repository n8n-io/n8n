import { redactSecrets, sanitizeCredentialShapedValues } from '@n8n/ai-utilities';
import type { PreferenceMiningOptions, PreferenceMiningSources } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import { isRecord } from '@n8n/utils/is-record';
import { jsonParse } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import { PreferenceMiningRepository } from './database/preference-mining.repository';
import { AgentsCredentialProvider } from '../agents/adapters/agents-credential-provider';
import { cleanStoredUserMessage } from '../instance-ai/internal-messages';
import { extractTextFromContent } from '../instance-ai/message-parser';
import { InstanceAiConversationHistoryRepository } from '../instance-ai/repositories/instance-ai-conversation-history.repository';
import { labDatasetSchema, type LabDataset } from '../workflow-index/preference-mining/lab-types';

const GROUPS = [
	{
		id: 'team-notifications',
		purpose: 'team notifications',
		nodeTypes: [
			'n8n-nodes-base.slack',
			'n8n-nodes-base.microsoftTeams',
			'n8n-nodes-base.discord',
			'n8n-nodes-base.telegram',
		],
	},
	{
		id: 'issue-tracking',
		purpose: 'issue tracking',
		nodeTypes: [
			'n8n-nodes-base.linear',
			'n8n-nodes-base.jira',
			'n8n-nodes-base.asana',
			'n8n-nodes-base.trello',
		],
	},
	{
		id: 'chat-model-provider',
		purpose: 'chat model selection',
		nodeTypes: [
			'@n8n/n8n-nodes-langchain.lmChatOpenAi',
			'@n8n/n8n-nodes-langchain.lmChatAnthropic',
			'@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			'@n8n/n8n-nodes-langchain.lmChatMistralCloud',
			'@n8n/n8n-nodes-langchain.lmChatOllama',
		],
	},
];

@Service()
export class PreferenceMiningDataService {
	constructor(
		private readonly workflowFinder: WorkflowFinderService,
		private readonly credentialsService: CredentialsService,
		private readonly repository: PreferenceMiningRepository,
		private readonly conversations: InstanceAiConversationHistoryRepository,
		private readonly modules: ModuleRegistry,
	) {}

	credentialProvider(user: User, projectId: string) {
		return new AgentsCredentialProvider(this.credentialsService, projectId, user);
	}

	async options(user: User): Promise<PreferenceMiningOptions> {
		if (!this.modules.isActive('instance-ai') || !hasGlobalScope(user, 'instanceAi:message')) {
			return { assistant: { available: false, model: null } };
		}
		const { InstanceAiSettingsService } = await import(
			'../instance-ai/instance-ai-settings.service.js'
		);
		const settings = Container.get(InstanceAiSettingsService);
		const available = settings.isInstanceAiEnabled() && (await settings.isModelConfigured());
		return {
			assistant: { available, model: available ? settings.resolveModelName(user) : null },
		};
	}

	async load(user: User, projectId: string, includeThreads: boolean, signal: AbortSignal) {
		signal.throwIfAborted();
		const warnings: string[] = [];
		const { workflows: rows, count } = await this.workflowFinder.findWorkflowsForUser(
			user,
			['workflow:read'],
			{ filters: { projectId, isArchived: false }, limit: 100 },
		);
		while (rows.length < count && rows.length < 1000) {
			signal.throwIfAborted();
			const page = await this.workflowFinder.findWorkflowsForUser(user, ['workflow:read'], {
				filters: { projectId, isArchived: false },
				offset: rows.length,
				limit: 100,
			});
			if (page.workflows.length === 0) break;
			rows.push(...page.workflows);
		}
		signal.throwIfAborted();
		const visible = rows.filter((w) => !w.isArchived);
		const canListFolders = await userHasScopes(user, ['folder:list'], false, { projectId });
		const folders = canListFolders ? await this.repository.listProjectFolders(projectId) : [];
		if (!canListFolders)
			warnings.push('Folder mining is unavailable without permission to list project folders.');
		if (folders.length > 500) warnings.push('Only the first 500 folders are included.');
		const folderIds = new Set(folders.slice(0, 500).map((f) => f.id));
		const locations = new Map(
			(canListFolders
				? await this.repository.findProjectWorkflowFolders(
						projectId,
						visible.map((w) => w.id),
					)
				: []
			).map((row) => [row.workflowId, row.folderId]),
		);
		const credentials = await this.credentialProvider(user, projectId).list();
		const workflows: LabDataset['workflows'] = visible.map((workflow) => {
			const folderId = locations.get(workflow.id) ?? null;
			return {
				id: workflow.id,
				name: workflow.name,
				projectId,
				folderId: folderId && folderIds.has(folderId) ? folderId : null,
				readable: true,
				archived: false,
				nodes: workflow.nodes.map((node) => {
					const parameters = sanitizeCredentialShapedValues(node.parameters);
					return {
						name: node.name,
						type: node.type,
						parameters: isRecord(parameters) ? parameters : {},
						credentials: Object.fromEntries(
							Object.entries(node.credentials ?? {}).flatMap(([type, ref]) =>
								ref.id ? [[type, ref.id]] : [],
							),
						),
					};
				}),
				connections: workflow.connections,
			};
		});
		if (count > rows.length)
			warnings.push(
				'The workflow scan is incomplete. The lab accepts up to 1,000 workflows. Deterministic credential comparisons will abstain.',
			);
		const threads: LabDataset['threads'] = [];
		let totalThreads = 0;
		let threadsAvailable = false;
		if (
			includeThreads &&
			this.modules.isActive('instance-ai') &&
			hasGlobalScope(user, 'instanceAi:message')
		) {
			const { InstanceAiSettingsService } = await import(
				'../instance-ai/instance-ai-settings.service.js'
			);
			threadsAvailable = Container.get(InstanceAiSettingsService).isInstanceAiEnabled();
		}
		if (includeThreads && !threadsAvailable)
			warnings.push('Thread mining requires access to an enabled n8n Assistant.');
		if (threadsAvailable) {
			const scope = {
				userId: user.id,
				projectId,
				excludeThreadId: '00000000-0000-0000-0000-000000000000',
			};
			totalThreads = await this.conversations.countProjectThreadsForUser(scope);
			const recent = await this.conversations.listRecentProjectThreadsForUser({
				...scope,
				limit: 10,
			});
			if (totalThreads > recent.length)
				warnings.push('Thread mining uses your 10 most recent AIA threads in this project.');
			for (const row of recent) {
				signal.throwIfAborted();
				const thread = await this.conversations.findOwnedThread(row.id, user.id, projectId);
				if (!thread) continue;
				const window = await this.conversations.getConversationWindow({
					threadId: row.id,
					before: 10,
					after: 0,
					project: (message) => {
						if (message.role !== 'user') return undefined;
						const parsed = jsonParse<unknown>(message.content, { fallbackValue: null });
						const content = isRecord(parsed)
							? cleanStoredUserMessage(extractTextFromContent(parsed.content))
							: null;
						if (!content) return undefined;
						if (content.length > 20000) {
							warnings.push(
								`Skipped a user message longer than 20,000 characters in thread ${row.id}.`,
							);
							return undefined;
						}
						return { id: message.id, role: 'user' as const, content: redactSecrets(content) };
					},
				});
				if (window.hasMoreBefore)
					warnings.push(`Thread ${row.id} has earlier messages outside the scan window.`);
				threads.push({
					id: row.id,
					projectId,
					folderId: null,
					createdAt: thread.createdAt.toISOString(),
					messages: window.rows,
				});
			}
		}
		const dimensions: LabDataset['dimensions'] = GROUPS.map((group) => ({
			key: `node:${group.id}`,
			category: 'node',
			description: group.purpose,
			contexts: [group.id],
		}));
		dimensions.push(
			{
				key: 'folder:workflow',
				category: 'folder',
				description: 'where to place new workflows',
				contexts: ['project'],
			},
			{
				key: 'naming:workflow',
				category: 'naming',
				description: 'workflow naming rules',
				contexts: ['project'],
			},
		);
		const keys = new Set(dimensions.map((d) => d.key));
		for (const workflow of workflows) {
			for (const node of workflow.nodes) {
				for (const type of Object.keys(node.credentials)) {
					const key = `credential:${type}:${node.type}`;
					if (!keys.has(key))
						dimensions.push({
							key,
							category: 'credential',
							description: `${type} on ${node.type}`,
							contexts: [node.type],
						});
					keys.add(key);
				}
				for (const [parameter, value] of Object.entries(node.parameters)) {
					if (!['string', 'number', 'boolean'].includes(typeof value)) continue;
					const key = `parameter:${node.type}:${parameter}`;
					if (!keys.has(key))
						dimensions.push({
							key,
							category: 'parameter',
							description: `${parameter} on ${node.type}`,
							contexts: [node.type],
						});
					keys.add(key);
				}
			}
		}
		const data = labDatasetSchema.parse({
			version: 1,
			name: 'Project preference mining',
			projects: [{ id: projectId, name: projectId }],
			groups: GROUPS,
			dimensions,
			folders: folders
				.slice(0, 500)
				.map((f) => ({ id: f.id, name: f.path, parentFolderId: f.parentFolderId, projectId })),
			credentials: credentials.map((c) => ({ ...c, projectIds: [projectId], usable: true })),
			workflows,
			threads,
			probes: [],
		});
		const sources: PreferenceMiningSources = {
			workflows: workflows.length,
			totalWorkflows: count,
			threads: threads.length,
			totalThreads,
			messages: threads.reduce((sum, t) => sum + t.messages.length, 0),
			credentials: credentials.length,
			folders: data.folders.map((f) => ({ id: f.id, name: f.name })),
			contexts: [...new Set(dimensions.flatMap((d) => d.contexts))],
			warnings,
		};
		return {
			data,
			sources,
			completeWorkflowScan: count <= rows.length,
			completeFolderScan: canListFolders && folders.length <= 500,
			threadsAvailable,
		};
	}
}
