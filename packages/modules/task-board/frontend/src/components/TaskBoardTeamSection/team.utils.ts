import {
	AGENT_MODEL_PROVIDER_CREDENTIAL_TYPES,
	AGENT_MODEL_PROVIDERS,
	AI_GATEWAY_MANAGED_TAG,
	type AgentJsonConfig,
	type AgentJsonSkillConfig,
	type AgentModelProvider,
} from '@n8n/api-types';
import type { AiModelSelectorMenuItem } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';

import type {
	AgentFormValues,
	AgentModelCatalog,
	AgentModelChoice,
	TaskBoardAgentDetail,
	TaskBoardCredentialOption,
	TeamAgent,
} from '../../task-board.types';

/** The id of the "Default model" item. The server picks the model and the credential. */
export const DEFAULT_MODEL_ITEM_ID = 'default';

export type ModelMenuLabels = {
	defaultModel: string;
	defaultModelDescription: string;
	gatewayCredits: string;
};

export type ModelMenuOptions = {
	catalog: AgentModelCatalog;
	credentials: TaskBoardCredentialOption[];
	current: AgentModelChoice | null;
	includeDefault: boolean;
	labels: ModelMenuLabels;
};

export function toTeamAgent(detail: TaskBoardAgentDetail, publishError: string | null): TeamAgent {
	return {
		id: detail.id,
		name: detail.name,
		description: detail.config?.description ?? '',
		model: detail.config?.model ? detail.config.model : null,
		skillCount: detail.config?.skills?.length ?? 0,
		isPublished: detail.activeVersionId !== null,
		publishError,
	};
}

/** The form values of a saved agent config. */
export function toFormValues(config: AgentJsonConfig): AgentFormValues {
	return {
		name: config.name,
		description: config.description ?? '',
		instructions: config.instructions,
		model:
			config.model && config.credential
				? { model: config.model, credential: config.credential }
				: null,
		skillIds: (config.skills ?? []).map((ref) => ref.id),
	};
}

/**
 * Writes the form values into a config. Every other key of the config stays as it is, and a
 * skill that stays attached keeps its version pin.
 */
export function applyFormValues(base: AgentJsonConfig, values: AgentFormValues): AgentJsonConfig {
	const existingRefs = new Map((base.skills ?? []).map((ref) => [ref.id, ref]));
	const skills = values.skillIds.map(
		(id): AgentJsonSkillConfig => existingRefs.get(id) ?? { type: 'skill', id },
	);
	return {
		...base,
		name: values.name,
		description: values.description,
		instructions: values.instructions,
		...(values.model ? { model: values.model.model, credential: values.model.credential } : {}),
		skills,
	};
}

/** An empty draft config, for an agent the server returned without one. */
export function emptyConfig(name: string): AgentJsonConfig {
	return { name, model: '', instructions: '' };
}

export function encodeModelChoice(choice: AgentModelChoice): string {
	return JSON.stringify([choice.credential, choice.model]);
}

/** The inverse of `encodeModelChoice`. Any other menu id gives null. */
export function decodeModelChoice(id: string): AgentModelChoice | null {
	try {
		const parsed: unknown = JSON.parse(id);
		if (
			Array.isArray(parsed) &&
			parsed.length === 2 &&
			typeof parsed[0] === 'string' &&
			typeof parsed[1] === 'string'
		) {
			return { credential: parsed[0], model: parsed[1] };
		}
	} catch {
		// Not a model item, for example a credential or the "default" item.
	}
	return null;
}

export function providerOfCredentialType(type: string): AgentModelProvider | undefined {
	return AGENT_MODEL_PROVIDERS.find((provider) =>
		AGENT_MODEL_PROVIDER_CREDENTIAL_TYPES[provider].some(
			(credentialType) => credentialType === type,
		),
	);
}

function splitModelId(model: string) {
	const separator = model.indexOf('/');
	return { provider: model.slice(0, separator), modelId: model.slice(separator + 1) };
}

/** The display name of a `provider/model` id, from the catalog when it knows the model. */
export function modelDisplayName(model: string, catalog: AgentModelCatalog): string {
	const { provider, modelId } = splitModelId(model);
	const known = Object.values(catalog[provider]?.models ?? {}).find(
		(entry) => entry.id === modelId,
	);
	return known?.name ?? model;
}

function modelItems(
	provider: string,
	credential: string,
	options: ModelMenuOptions,
): AiModelSelectorMenuItem[] {
	return Object.values(options.catalog[provider]?.models ?? {})
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((entry) => {
			const choice = { credential, model: `${provider}/${entry.id}` };
			return {
				id: encodeModelChoice(choice),
				label: entry.name,
				checked:
					options.current?.credential === credential && options.current.model === choice.model,
			};
		});
}

/**
 * The items of the model picker: one sub-menu of models for each usable credential. Gateway
 * credits show only when the agent already uses them; other agents pick them through "Default".
 */
export function buildModelMenuItems(options: ModelMenuOptions): AiModelSelectorMenuItem[] {
	const items: AiModelSelectorMenuItem[] = [];
	if (options.includeDefault) {
		items.push({
			id: DEFAULT_MODEL_ITEM_ID,
			label: options.labels.defaultModel,
			checked: options.current === null,
			data: { description: options.labels.defaultModelDescription },
		});
	}
	const current = options.current;
	if (current?.credential === AI_GATEWAY_MANAGED_TAG) {
		const { provider } = splitModelId(current.model);
		items.push({
			id: `credential:${AI_GATEWAY_MANAGED_TAG}`,
			label: options.labels.gatewayCredits,
			searchable: true,
			children: modelItems(provider, AI_GATEWAY_MANAGED_TAG, options),
		});
	}
	for (const credential of options.credentials) {
		const provider = providerOfCredentialType(credential.type);
		if (!provider) continue;
		const children = modelItems(provider, credential.id, options);
		items.push({
			id: `credential:${credential.id}`,
			label: credential.name,
			disabled: children.length === 0,
			searchable: true,
			data: { badgeLabel: options.catalog[provider]?.name ?? provider },
			children,
		});
	}
	return items;
}

const PROJECT_ROLE_KEYS: Record<string, BaseTextKey> = {
	'project:personalOwner': 'projects.settings.role.personalOwner',
	'project:admin': 'projects.settings.role.admin',
	'project:editor': 'projects.settings.role.editor',
	'project:viewer': 'projects.settings.role.viewer',
};

/** The i18n key of a project role, or undefined for a custom role. */
export function projectRoleKey(role: string): BaseTextKey | undefined {
	return PROJECT_ROLE_KEYS[role];
}
