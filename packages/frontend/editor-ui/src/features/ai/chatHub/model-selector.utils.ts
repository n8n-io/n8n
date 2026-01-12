import {
	chatHubLLMProviderSchema,
	type AgentIconOrEmoji,
	type ChatHubLLMProvider,
	type ChatHubProvider,
	type ChatModelDto,
	type ChatModelsResponse,
	type ChatProviderSettingsDto,
} from '@n8n/api-types';
import type { DropdownMenuItemProps, IconOrEmoji } from '@n8n/design-system';
import type { I18nClass } from '@n8n/i18n';
import {
	createFakeAgent,
	isAllowedModel,
	personalAgentDefaultIcon,
	stringifyModel,
	workflowAgentDefaultIcon,
} from './chat.utils';
import { truncateBeforeLast } from '@n8n/utils/string/truncate';
import {
	LLM_AGGREGATORS,
	MAX_AGENT_NAME_CHARS_MENU,
	MAX_FLATTENED_SEARCH_RESULTS_PER_PROVIDER,
	NEW_AGENT_MENU_ID,
	providerDisplayNames,
} from './constants';

type MenuItem = DropdownMenuItemProps<
	string,
	{ provider: ChatHubProvider; parts?: string[]; fullName?: string; description?: string }
>;

export interface BuildMenuItemsOptions {
	includeCustomAgents: boolean;
	isLoading: boolean;
	i18n: I18nClass;
	settings: Partial<Record<ChatHubLLMProvider, ChatProviderSettingsDto>>;
}

/**
 * Helper function to check if text matches search query
 */
function matchesSearch(item: MenuItem, query: string) {
	if (!query) return true;
	return (item.data?.fullName ?? item.label ?? '').toLowerCase().includes(query);
}

/**
 * Helper function to check if an item is a special menu item (action or error)
 * that should not appear in search results
 */
function isSpecialMenuItem(item: MenuItem): boolean {
	// Check if the ID matches special menu item patterns
	const id = item.id;
	if (
		id.endsWith('::configure') ||
		id.endsWith('::add-model') ||
		id.endsWith('::error') ||
		id.endsWith('::loading')
	) {
		return true;
	}

	// Check if item is disabled (error messages are typically disabled)
	if (item.disabled) {
		return true;
	}

	// Check if item doesn't have provider data (not an actual model/agent)
	if (!item.data?.provider) {
		return true;
	}

	return false;
}

/**
 * Helper function to filter menu items with children based on search
 */
function filterMenuItem(item: MenuItem, query: string, parentMatched = false): MenuItem | null {
	if (isSpecialMenuItem(item)) {
		return null;
	}

	if (!query || parentMatched) return item;

	const labelMatches = matchesSearch(item, query);
	const children = item.children ?? [];
	const filteredChildren = children.flatMap((child) => {
		const matched = filterMenuItem(child, query, labelMatches);

		return matched ? [matched] : [];
	});

	// Include parent if it matches or has any matching children
	if (labelMatches || filteredChildren.length > 0) {
		// If item originally had children (is a container/group), only include if it has valid children after filtering
		// This prevents empty provider groups from appearing in search results
		if (children.length > 0 && filteredChildren.length === 0) {
			return null;
		}

		return {
			...item,
			children: filteredChildren,
		};
	}

	return null;
}

function agentToMenuItem(agent: ChatModelDto, defaultIcon?: AgentIconOrEmoji): MenuItem {
	return {
		id: stringifyModel(agent.model),
		icon: (agent.icon ?? defaultIcon ?? undefined) as IconOrEmoji | undefined,
		label: truncateBeforeLast(agent.name, MAX_AGENT_NAME_CHARS_MENU),
		disabled: false,
		data: {
			provider: agent.model.provider,
			description: agent.description ?? undefined,
			fullName: agent.name,
		},
	};
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
		: agents.map((agent) => agentToMenuItem(agent, personalAgentDefaultIcon));

	return {
		id: 'custom-agent',
		label: i18n.baseText('chatHub.agent.personalAgents'),
		icon: personalAgentDefaultIcon as IconOrEmoji,
		data: { provider: 'custom-agent' },
		children: [
			...(isLoading
				? [
						{
							id: 'custom-agent::loading',
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

function buildGroupedWorkflowAgentMenuItems(agents: ChatModelDto[], i18n: I18nClass): MenuItem[] {
	const groupedAgents = new Map<string, ChatModelDto[]>();

	for (const agent of agents) {
		const groupName = agent.groupName ?? '';
		const entry = groupedAgents.get(groupName) ?? [];

		groupedAgents.set(groupName, [...entry, agent]);
	}

	// If there's only one group, skip grouping and show agents directly
	if (groupedAgents.size < 2) {
		return agents.map((agent) => agentToMenuItem(agent, workflowAgentDefaultIcon));
	}

	return [...groupedAgents].map(([group, groupAgents]) => {
		const displayLabel =
			group === '' ? i18n.baseText('chatHub.models.selector.personalProject') : group;

		return {
			id: `n8n-project-${group}`,
			label: displayLabel,
			icon: (groupAgents[0]?.groupIcon ?? workflowAgentDefaultIcon) as IconOrEmoji,
			data: { provider: 'n8n' },
			children: groupAgents.map((agent) => agentToMenuItem(agent, workflowAgentDefaultIcon)),
		};
	});
}

function buildWorkflowAgentsMenuItem(
	agents: ChatModelDto[],
	{ includeCustomAgents, i18n, isLoading }: BuildMenuItemsOptions,
): MenuItem | null {
	if (!includeCustomAgents) {
		return null;
	}

	const emptyText = i18n.baseText('chatHub.workflowAgents.empty.noAgents');
	const loadingText = i18n.baseText('generic.loadingEllipsis');

	return {
		id: 'n8n',
		label: i18n.baseText('chatHub.agent.workflowAgents'),
		icon: workflowAgentDefaultIcon as IconOrEmoji | undefined,
		data: { provider: 'n8n' },
		children: isLoading
			? [{ id: 'n8n::loading', label: loadingText, disabled: true }]
			: agents.length === 0
				? [{ id: 'n8n::no-agents', label: emptyText, disabled: true }]
				: buildGroupedWorkflowAgentMenuItems(agents, i18n),
	};
}

function buildLlmProviderMenuItem(
	provider: ChatHubLLMProvider,
	{ models, error }: ChatModelsResponse[ChatHubLLMProvider],
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

	const manualModels = (providerSettings?.allowedModels ?? []).flatMap((model) =>
		model.isManual
			? [createFakeAgent({ provider, model: model.model }, { name: model.displayName })]
			: [],
	);

	// Add any manually defined models in settings
	const allModels = [...models, ...manualModels];

	const agentOptions =
		allModels.length > 0
			? allModels
					.flatMap((agent, index) => {
						// Filter out models not allowed in settings
						if (providerSettings && !isAllowedModel(providerSettings, agent.model)) {
							return [];
						}

						const item = agentToMenuItem(agent);

						return [index === 0 ? { ...item, divided: true } : item];
					})
					.filter((item, index, self) => self.findIndex((i) => i.id === item.id) === index)
			: error
				? [{ id: `${provider}::error`, divided: true, disabled: true, label: error }]
				: [];

	const children = [
		configureMenu,
		...agentOptions,
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

/**
 * Helper function to recursively collect all leaf items (items without children or with data.provider)
 */
function collectFlattenedSearchResults(item: MenuItem, pathPrefix: string[]): MenuItem[] {
	const children = item.children ?? [];
	const fullPath = [...pathPrefix, item.label];

	if (children.length === 0) {
		return [
			{
				...item,
				divided: false,
				data: item.data ? { ...item.data, parts: fullPath } : undefined,
			},
		];
	}

	return children.flatMap((child) => collectFlattenedSearchResults(child, fullPath));
}

export function applySearch(menuItems: MenuItem[], query: string, i18n: I18nClass): MenuItem[] {
	if (!query) {
		return menuItems;
	}

	return menuItems.reduce<MenuItem[]>((acc, item) => {
		const matched = filterMenuItem(item, query);

		if (!matched) {
			return acc;
		}

		const results = collectFlattenedSearchResults(matched, []);
		const flattenCount = Math.max(0, MAX_FLATTENED_SEARCH_RESULTS_PER_PROVIDER - acc.length);
		const provider = matched.data?.provider;
		const providerName = provider ? providerDisplayNames[provider] : '';

		acc.push(...results.slice(0, flattenCount));

		if (results.length > flattenCount) {
			const label =
				flattenCount > 0
					? i18n.baseText('chatHub.models.selector.moreModels', {
							interpolate: { providerName },
						})
					: matched.label;
			const rest = results.slice(flattenCount).map((result) => ({
				...result,
				label: truncateBeforeLast(result.data?.fullName ?? '', MAX_AGENT_NAME_CHARS_MENU),
				data: result.data ? { ...result.data, parts: undefined } : undefined,
			}));

			acc.push({ ...matched, divided: false, label, children: rest });
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
	const n8nAgentsItem = buildWorkflowAgentsMenuItem(agents.n8n.models, options);

	if (personalAgentsItem) {
		menuItems.push(personalAgentsItem);
	}

	if (n8nAgentsItem) {
		menuItems.push(n8nAgentsItem);
	}

	// Move aggregators to lower
	const sortedProviders = chatHubLLMProviderSchema.options.toSorted((a, b) => {
		const aInt = LLM_AGGREGATORS.includes(a) ? 1 : -1;
		const bInt = LLM_AGGREGATORS.includes(b) ? 1 : -1;

		return aInt - bInt;
	});

	let dividerInserted = false;

	for (const provider of sortedProviders) {
		const item = buildLlmProviderMenuItem(provider, agents[provider], options);

		if (item) {
			menuItems.push(dividerInserted ? item : { ...item, divided: true });
			dividerInserted = true;
		}
	}

	return menuItems;
}
