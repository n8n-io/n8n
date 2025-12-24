import {
	chatHubProviderSchema,
	type ChatHubConversationModel,
	type ChatModelsResponse,
	type ChatHubSessionDto,
	type ChatModelDto,
	type ChatSessionId,
	type ChatMessageId,
	type ChatHubProvider,
	type ChatHubLLMProvider,
	type ChatHubInputModality,
	type AgentIconOrEmoji,
	type EnrichedStructuredChunk,
	type ChatProviderSettingsDto,
	chatHubLLMProviderSchema,
} from '@n8n/api-types';
import type {
	ChatMessage,
	GroupedConversations,
	ChatAgentFilter,
	ChatStreamingState,
	FlattenedModel,
	ChatConversation,
} from './chat.types';
import {
	CHAT_VIEW,
	MAX_AGENT_NAME_CHARS_MENU,
	NEW_AGENT_MENU_ID,
	providerDisplayNames,
} from './constants';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { DropdownMenuItemProps, IconOrEmoji } from '@n8n/design-system';
import { truncateBeforeLast } from '@n8n/utils';
import type { I18nClass } from '@n8n/i18n';

export function getRelativeDate(now: Date, dateString: string): string {
	const date = new Date(dateString);
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	const lastWeek = new Date(today);
	lastWeek.setDate(lastWeek.getDate() - 7);

	const conversationDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

	if (conversationDate.getTime() === today.getTime()) {
		return 'Today';
	} else if (conversationDate.getTime() === yesterday.getTime()) {
		return 'Yesterday';
	} else if (conversationDate >= lastWeek) {
		return 'This week';
	} else {
		return 'Older';
	}
}

export function groupConversationsByDate(sessions: ChatHubSessionDto[]): GroupedConversations[] {
	const now = new Date();
	const groups = new Map<string, ChatHubSessionDto[]>();

	// Group sessions by relative date
	for (const session of sessions) {
		const group = getRelativeDate(now, session.lastMessageAt ?? session.updatedAt);

		if (!groups.has(group)) {
			groups.set(group, []);
		}

		groups.get(group)!.push(session);
	}

	// Define order for groups
	const groupOrder = ['Today', 'Yesterday', 'This week', 'Older'];

	return groupOrder.flatMap((groupName) => {
		const sessions = groups.get(groupName) ?? [];

		return sessions.length > 0
			? [
					{
						group: groupName,
						sessions: sessions.sort(
							(a, b) =>
								Date.parse(b.lastMessageAt ?? b.updatedAt) -
								Date.parse(a.lastMessageAt ?? a.updatedAt),
						),
					},
				]
			: [];
	});
}

export function getAgentRoute(model: ChatHubConversationModel) {
	if (model.provider === 'n8n') {
		return {
			name: CHAT_VIEW,
			query: {
				workflowId: model.workflowId,
			},
		};
	}

	if (model.provider === 'custom-agent') {
		return {
			name: CHAT_VIEW,
			query: {
				agentId: model.agentId,
			},
		};
	}

	return {
		name: CHAT_VIEW,
		query: {
			provider: model.provider,
			model: model.model,
		},
	};
}

export function flattenModel(model: ChatHubConversationModel): FlattenedModel {
	return {
		provider: model.provider,
		model:
			model?.provider === 'n8n' || model?.provider === 'custom-agent'
				? null
				: (model?.model ?? null),
		workflowId: model?.provider === 'n8n' ? model.workflowId : null,
		agentId: model?.provider === 'custom-agent' ? model.agentId : null,
	};
}

export function unflattenModel(messageOrSession: FlattenedModel): ChatHubConversationModel | null {
	if (messageOrSession.provider === null) {
		return null;
	}

	switch (messageOrSession.provider) {
		case 'custom-agent':
			if (!messageOrSession.agentId) {
				return null;
			}

			return {
				provider: 'custom-agent',
				agentId: messageOrSession.agentId,
			};
		case 'n8n':
			if (!messageOrSession.workflowId) {
				return null;
			}

			return {
				provider: 'n8n',
				workflowId: messageOrSession.workflowId,
			};
		default:
			if (messageOrSession.model === null) {
				return null;
			}

			return {
				provider: messageOrSession.provider,
				model: messageOrSession.model,
			};
	}
}

export function filterAndSortAgents(
	models: ChatModelDto[],
	filter: ChatAgentFilter,
): ChatModelDto[] {
	let filtered = models;

	// Apply search filter
	if (filter.search.trim()) {
		const query = filter.search.toLowerCase();
		filtered = filtered.filter((model) => model.name.toLowerCase().includes(query));
	}

	// Apply sorting
	filtered = [...filtered].sort((a, b) => {
		const dateAStr = a[filter.sortBy];
		const dateBStr = b[filter.sortBy];
		const dateA = dateAStr ? Date.parse(dateAStr) : undefined;
		const dateB = dateBStr ? Date.parse(dateBStr) : undefined;

		// Sort by dates (newest first)
		if (dateA && dateB) {
			return dateB - dateA;
		}

		// Items without dates go to the end
		if (dateA && !dateB) {
			return -1;
		}
		if (!dateA && dateB) {
			return 1;
		}

		return 0;
	});

	return filtered;
}

export function stringifyModel(model: ChatHubConversationModel): string {
	return `${model.provider}::${model.provider === 'custom-agent' ? model.agentId : model.provider === 'n8n' ? model.workflowId : model.model}`;
}

export function fromStringToModel(value: string): ChatHubConversationModel | undefined {
	const [provider, identifier] = value.split('::');
	const parsedProvider = chatHubProviderSchema.safeParse(provider).data;

	if (!parsedProvider) {
		return undefined;
	}

	return parsedProvider === 'n8n'
		? { provider: 'n8n', workflowId: identifier }
		: parsedProvider === 'custom-agent'
			? { provider: 'custom-agent', agentId: identifier }
			: { provider: parsedProvider, model: identifier };
}

export function isMatchedAgent(agent: ChatModelDto, model: ChatHubConversationModel): boolean {
	if (model.provider === 'n8n') {
		return agent.model.provider === 'n8n' && agent.model.workflowId === model.workflowId;
	}

	if (model.provider === 'custom-agent') {
		return agent.model.provider === 'custom-agent' && agent.model.agentId === model.agentId;
	}

	return agent.model.provider === model.provider && agent.model.model === model.model;
}

export function createAiMessageFromStreamingState(
	sessionId: ChatSessionId,
	messageId: ChatMessageId,
	streaming?: Partial<ChatStreamingState>,
): ChatMessage {
	return {
		id: messageId,
		sessionId,
		type: 'ai',
		name: 'AI',
		content: '',
		executionId: streaming?.executionId ?? null,
		status: 'running',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		previousMessageId: streaming?.previousMessageId ?? null,
		retryOfMessageId: streaming?.retryOfMessageId ?? null,
		revisionOfMessageId: null,
		responses: [],
		alternatives: [],
		attachments: [],
		...(streaming?.agent
			? flattenModel(streaming.agent.model)
			: {
					provider: null,
					model: null,
					workflowId: null,
					agentId: null,
				}),
	};
}

export function createHumanMessageFromStreamingState(streaming: ChatStreamingState): ChatMessage {
	return {
		id: streaming.promptId,
		sessionId: streaming.sessionId,
		type: 'human',
		name: 'User',
		content: streaming.promptText,
		provider: null,
		model: null,
		workflowId: null,
		executionId: null,
		agentId: null,
		status: 'success',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		previousMessageId: streaming.promptPreviousMessageId,
		retryOfMessageId: null,
		revisionOfMessageId: streaming.revisionOfMessageId,
		responses: [],
		alternatives: [],
		attachments: streaming.attachments,
	};
}

export function buildUiMessages(
	sessionId: string,
	conversation: ChatConversation,
	streaming?: ChatStreamingState,
): ChatMessage[] {
	const messagesToShow: ChatMessage[] = [];
	let foundRunning = false;

	for (let index = 0; index < conversation.activeMessageChain.length; index++) {
		const id = conversation.activeMessageChain[index];
		const message = conversation.messages[id];

		if (!message) {
			continue;
		}

		foundRunning = foundRunning || message.status === 'running';

		if (foundRunning || streaming?.sessionId !== sessionId || message.type !== 'ai') {
			messagesToShow.push(message);
			continue;
		}

		if (streaming.retryOfMessageId === id && !streaming.messageId) {
			// While waiting for streaming to start on regeneration, show previously generated message
			// in running state as an immediate feedback
			messagesToShow.push({
				...message,
				content: '',
				status: 'running',
				...flattenModel(streaming.agent.model),
			});
			foundRunning = true;
			continue;
		}

		if (streaming.messageId && index === conversation.activeMessageChain.length - 1) {
			// When agent responds multiple messages (e.g. when tools are used),
			// there's a noticeable time gap between messages.
			// In order to indicate that agent is still responding, show the last AI message as running
			messagesToShow.push({ ...message, status: 'running' });
			foundRunning = true;
			continue;
		}

		messagesToShow.push(message);
	}

	return messagesToShow;
}

export function isLlmProvider(provider?: ChatHubProvider): provider is ChatHubLLMProvider {
	return provider !== 'n8n' && provider !== 'custom-agent';
}

export function isLlmProviderModel(
	model?: ChatHubConversationModel,
): model is ChatHubConversationModel & { provider: ChatHubLLMProvider } {
	return isLlmProvider(model?.provider);
}

export function findOneFromModelsResponse(
	response: ChatModelsResponse,
	providerSettings: Record<ChatHubLLMProvider, ChatProviderSettingsDto>,
): ChatModelDto | undefined {
	for (const provider of chatHubProviderSchema.options) {
		const settings: ChatProviderSettingsDto | undefined = isLlmProvider(provider)
			? providerSettings[provider]
			: undefined;

		if (!settings?.enabled) {
			continue;
		}

		const availableModels = response[provider].models.filter((providerModel) => {
			const { model } = providerModel;
			if (isLlmProviderModel(model) && settings.allowedModels.length > 0) {
				return settings.allowedModels.some((allowed) => allowed.model === model.model);
			}

			return true;
		});

		if (availableModels.length > 0) {
			return availableModels[0];
		}
	}

	return undefined;
}

export function createSessionFromStreamingState(streaming: ChatStreamingState): ChatHubSessionDto {
	return {
		id: streaming.sessionId,
		title: 'New Chat',
		ownerId: '',
		lastMessageAt: new Date().toISOString(),
		credentialId: null,
		agentName: streaming.agent.name,
		agentIcon: streaming.agent.icon,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		tools: streaming.tools,
		...flattenModel(streaming.agent.model),
	};
}

export function createMimeTypes(modalities: ChatHubInputModality[]): string {
	// If 'file' modality is present, accept all file types
	if (modalities.includes('file')) {
		return '*/*';
	}

	const mimeTypes: string[] = ['text/*'];

	for (const modality of modalities) {
		if (modality === 'image') {
			mimeTypes.push('image/*');
		}
		if (modality === 'audio') {
			mimeTypes.push('audio/*');
		}
		if (modality === 'video') {
			mimeTypes.push('video/*');
		}
	}

	return mimeTypes.join(',');
}

export const personalAgentDefaultIcon: AgentIconOrEmoji = {
	type: 'icon',
	value: 'message-square' satisfies IconName,
};

export const workflowAgentDefaultIcon: AgentIconOrEmoji = {
	type: 'icon',
	value: 'bot' satisfies IconName,
};

type StreamApi<T> = (
	ctx: IRestApiContext,
	payload: T,
	onChunk: (data: EnrichedStructuredChunk) => void,
	onDone: () => void,
	onError: (e: unknown) => void,
) => void;

/**
 * Converts streaming API to return a promise that resolves when the first chunk is received.
 */
export function promisifyStreamingApi<T>(
	streamingApi: StreamApi<T>,
): (...args: Parameters<StreamApi<T>>) => Promise<void> {
	return async (ctx, payload, onChunk, onDone, onError) => {
		let settled = false;
		let resolvePromise: () => void;
		let rejectPromise: (reason?: unknown) => void;

		const promise = new Promise<void>((resolve, reject) => {
			resolvePromise = resolve;
			rejectPromise = reject;
		});

		streamingApi(
			ctx,
			payload,
			(chunk) => {
				if (!settled) {
					settled = true;
					resolvePromise();
				}
				onChunk(chunk);
			},
			() => {
				if (!settled) {
					settled = true;
					resolvePromise();
				}
				onDone();
			},
			(error: unknown) => {
				if (!settled) {
					settled = true;
					rejectPromise(error);
				}
				onError(error);
			},
		);

		return await promise;
	};
}

type MenuItem = DropdownMenuItemProps<
	string,
	{ provider: ChatHubProvider; isFlattened?: boolean; description?: string }
>;

interface BuildMenuItemsOptions {
	includeCustomAgents: boolean;
	isLoading: boolean;
	i18n: I18nClass;
	settings: Partial<Record<ChatHubLLMProvider, ChatProviderSettingsDto>>;
}

/**
 * Helper function to check if text matches search query
 */
function matchesSearch(text: string, query: string) {
	if (!query) return true;
	return text.toLowerCase().includes(query);
}

/**
 * Helper function to filter menu items with children based on search
 */
function filterMenuItem(item: MenuItem, query: string, parentMatched = false): MenuItem | null {
	if (!query || parentMatched) return item;

	const labelMatches = matchesSearch((item.label || '').toLowerCase(), query);
	const filteredChildren = (item.children ?? []).flatMap((child) => {
		const matched = filterMenuItem(child, query, labelMatches);

		return matched ? [matched] : [];
	});

	// Include parent if it matches or has any matching children
	if (labelMatches || filteredChildren.length > 0) {
		return {
			...item,
			children: filteredChildren,
		};
	}

	return null;
}

function buildPersonalAgentsMenuItem(
	agents: ChatModelDto[],
	{ isLoading, i18n, includeCustomAgents }: BuildMenuItemsOptions,
): MenuItem | null {
	if (!includeCustomAgents) {
		return null;
	}

	const customAgents = isLoading
		? []
		: agents.map<MenuItem>((agent) => ({
				id: stringifyModel(agent.model),
				icon: (agent.icon ?? personalAgentDefaultIcon) as IconOrEmoji,
				label: truncateBeforeLast(agent.name, MAX_AGENT_NAME_CHARS_MENU),
				disabled: false,
				data: { provider: 'custom-agent', description: agent.description ?? undefined },
			}));

	return {
		id: 'custom-agents',
		label: i18n.baseText('chatHub.agent.personalAgents'),
		icon: personalAgentDefaultIcon as IconOrEmoji,
		data: { provider: 'custom-agent' },
		children: [
			...(isLoading
				? [
						{
							id: 'loading',
							label: i18n.baseText('generic.loadingEllipsis'),
							disabled: true,
						},
					]
				: customAgents),
			{
				id: NEW_AGENT_MENU_ID,
				icon: { type: 'icon' as const, value: 'plus' as const },
				label: i18n.baseText('chatHub.agent.newAgent'),
				disabled: false,
				divided: isLoading || customAgents.length > 0,
			},
		],
	};
}

function buildN8nAgentsMenuItem(
	agents: ChatModelDto[],
	{ includeCustomAgents, i18n, isLoading }: BuildMenuItemsOptions,
): MenuItem | null {
	if (!includeCustomAgents) {
		return null;
	}

	const children: MenuItem[] = [];

	if (isLoading) {
		children.push({
			id: 'loading',
			label: i18n.baseText('generic.loadingEllipsis'),
			disabled: true,
		});
	} else if (agents.length === 0) {
		children.push({
			id: 'no-agents',
			label: i18n.baseText('chatHub.workflowAgents.empty.noAgents'),
			disabled: true,
		});
	} else {
		children.push(
			...agents.map<MenuItem>((agent) => ({
				id: stringifyModel(agent.model),
				icon: (agent.icon ?? workflowAgentDefaultIcon) as IconOrEmoji,
				label: truncateBeforeLast(agent.name, 200),
				disabled: false,
				data: { provider: agent.model.provider, description: agent.description ?? undefined },
			})),
		);
	}

	return {
		id: 'n8n-agents',
		label: i18n.baseText('chatHub.agent.workflowAgents'),
		icon: { type: 'icon' as const, value: 'robot' as const },
		data: { provider: 'n8n' },
		children,
	};
}

function buildLlmProviderMenuItem(
	provider: ChatHubLLMProvider,
	{ models: theAgents, error }: ChatModelsResponse[ChatHubLLMProvider],
	{ settings, i18n, isLoading }: BuildMenuItemsOptions,
): MenuItem | null {
	const providerSettings = settings[provider];

	// Filter out disabled providers from the menu
	if (providerSettings?.enabled === false) {
		return null;
	}

	const configureMenu = {
		id: `${provider}::configure`,
		icon: { type: 'icon' as const, value: 'settings' as const },
		label: i18n.baseText('chatHub.agent.configureCredentials'),
		disabled: false,
	};

	if (isLoading) {
		return {
			id: provider,
			label: providerDisplayNames[provider],
			data: { provider },
			children: [
				configureMenu,
				{
					id: `${provider}::loading`,
					label: i18n.baseText('generic.loadingEllipsis'),
					disabled: true,
					divided: true,
				},
			],
		};
	}

	// Add any manually defined models in settings
	for (const model of providerSettings?.allowedModels ?? []) {
		if (model.isManual) {
			theAgents.push(
				createFakeAgent({ provider, model: model.model }, { name: model.displayName }),
			);
		}
	}

	const agentOptions =
		theAgents.length > 0
			? theAgents
					.filter(
						(agent) =>
							// Filter out models not allowed in settings
							!providerSettings ||
							providerSettings.allowedModels.length === 0 ||
							providerSettings.allowedModels.some(
								(m) => 'model' in agent.model && m.model === agent.model.model,
							),
					)
					.map<MenuItem>((agent) => ({
						id: stringifyModel(agent.model),
						label: truncateBeforeLast(agent.name, MAX_AGENT_NAME_CHARS_MENU),
						disabled: false,
						data: { provider: agent.model.provider, description: agent.description ?? undefined },
					}))
					.filter((item, index, self) => self.findIndex((i) => i.id === item.id) === index)
			: error
				? [{ id: `${provider}::error`, disabled: true, label: error }]
				: [];

	const children = [
		configureMenu,
		...agentOptions.map((option, index) => (index === 0 ? { ...option, divided: true } : option)),
		...(agentOptions.length > 0 && providerSettings?.allowedModels.length === 0
			? [
					{
						id: `${provider}::add-model`,
						icon: { type: 'icon' as const, value: 'plus' as const },
						label: i18n.baseText('chatHub.agent.addModel'),
						disabled: false,
						divided: true,
					},
				]
			: []),
	];

	return {
		id: provider,
		data: { provider },
		label: providerDisplayNames[provider],
		children,
	};
}

export function applySearch(menuItems: MenuItem[], query: string): MenuItem[] {
	if (!query) {
		return menuItems;
	}

	return menuItems.reduce<MenuItem[]>((acc, item) => {
		const matched = filterMenuItem(item, query);

		if (!matched) {
			return acc;
		}

		const children = matched.children ?? [];
		const flattenCount = Math.max(0, 10 - acc.length);
		const provider = matched.data?.provider;
		const providerName = provider ? providerDisplayNames[provider] : '';

		acc.push(
			...children.slice(0, flattenCount).flatMap((child) =>
				child.data?.provider
					? [
							{
								...child,
								label: `${providerName} > ${child.label}`,
								divided: false,
								data: { ...child.data, isFlattened: true },
							},
						]
					: [],
			),
		);

		if (children.length > flattenCount) {
			acc.push({
				...matched,
				divided: false,
				label: flattenCount > 0 ? `More ${providerName} models...` : matched.label,
				children: (matched.children ?? []).slice(flattenCount),
			});
		}

		return acc;
	}, []);
}

/**
 * Builds the menu items for the model selector dropdown
 */
export function buildModelSelectorMenuItems(
	agents: ChatModelsResponse,
	options: BuildMenuItemsOptions,
): MenuItem[] {
	const menuItems: MenuItem[] = [];
	const personalAgentsItem = buildPersonalAgentsMenuItem(agents['custom-agent'].models, options);
	const n8nAgentsItem = buildN8nAgentsMenuItem(agents.n8n.models, options);
	const flatModels: MenuItem[] = [];

	if (personalAgentsItem) {
		menuItems.push(personalAgentsItem);
		flatModels.push(...(personalAgentsItem.children ?? []));
	}

	if (n8nAgentsItem) {
		menuItems.push(n8nAgentsItem);
		flatModels.push(...(n8nAgentsItem.children ?? []));
	}

	for (let i = 0; i < chatHubLLMProviderSchema.options.length; i++) {
		const provider = chatHubLLMProviderSchema.options[i];
		const item = buildLlmProviderMenuItem(provider, agents[provider], options);

		if (item) {
			menuItems.push(i === 0 ? { ...item, divided: true } : item);
			flatModels.push(...(item.children ?? []));
		}
	}

	return menuItems;
}

export function createFakeAgent(
	model: ChatHubConversationModel,
	fallback?: Partial<{ name: string | null; icon: AgentIconOrEmoji | null }>,
): ChatModelDto {
	return {
		model,
		name: fallback?.name || '',
		description: null,
		icon: fallback?.icon ?? null,
		createdAt: null,
		updatedAt: null,
		// Assume file attachment and tools are supported
		metadata: {
			inputModalities: ['text', 'file'],
			capabilities: {
				functionCalling: true,
			},
			available: true,
		},
	};
}
