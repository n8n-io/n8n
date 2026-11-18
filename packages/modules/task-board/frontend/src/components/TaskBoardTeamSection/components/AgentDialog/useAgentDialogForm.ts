import { AI_GATEWAY_MANAGED_TAG, type SkillListItem } from '@n8n/api-types';
import type { SelectOptionBase } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';

import { findAgentPreset, type AgentPresetKey } from '../../../../presets/agent-presets';
import {
	fetchAgentCredentials,
	fetchAgentModelCatalog,
	fetchSkills,
} from '../../../../task-board.api';
import type {
	AgentFormValues,
	AgentModelCatalog,
	AgentModelChoice,
	TaskBoardCredentialOption,
} from '../../../../task-board.types';
import {
	buildModelMenuItems,
	decodeModelChoice,
	DEFAULT_MODEL_ITEM_ID,
	modelDisplayName,
} from '../../team.utils';

export type AgentDialogFormOptions = {
	open: Ref<boolean>;
	projectId: MaybeRefOrGetter<string | undefined>;
	/** The agent being edited. Undefined when the dialog creates a new agent. */
	agentId: MaybeRefOrGetter<string | undefined>;
	/** The saved values of the agent being edited. */
	initialValues: MaybeRefOrGetter<AgentFormValues | undefined>;
};

/** Form state and picker options of the add and edit agent dialog. */
export function useAgentDialogForm(options: AgentDialogFormOptions) {
	const rootStore = useRootStore();
	const i18n = useI18n();

	const presetKey = ref<AgentPresetKey>('developer');
	const name = ref('');
	const description = ref('');
	const instructions = ref('');
	const model = ref<AgentModelChoice | null>(null);
	const skillIds = ref<string[]>([]);

	const catalog = ref<AgentModelCatalog>({});
	const credentials = ref<TaskBoardCredentialOption[]>([]);
	const skills = ref<SkillListItem[]>([]);
	const loadingOptions = ref(false);

	const isEdit = computed(() => toValue(options.agentId) !== undefined);

	function applyPreset(key: AgentPresetKey) {
		const preset = findAgentPreset(key);
		presetKey.value = key;
		name.value = i18n.baseText(preset.nameKey);
		description.value = i18n.baseText(preset.descriptionKey);
		instructions.value = preset.instructions;
	}

	function reset() {
		const initial = toValue(options.initialValues);
		if (initial) {
			name.value = initial.name;
			description.value = initial.description;
			instructions.value = initial.instructions;
			model.value = initial.model;
			skillIds.value = [...initial.skillIds];
			return;
		}
		applyPreset('developer');
		model.value = null;
		skillIds.value = [];
	}

	async function loadSkills(projectId: string): Promise<SkillListItem[]> {
		const context = rootStore.restApiContext;
		const agentId = toValue(options.agentId);
		if (agentId) return await fetchSkills(context, { attachableTo: agentId });
		const [projectSkills, instanceSkills] = await Promise.all([
			fetchSkills(context, { projectId }),
			fetchSkills(context, { scope: 'instance' }),
		]);
		return [...projectSkills, ...instanceSkills];
	}

	/** Loads the pickers. A failed list stays empty: the agent editor can still set it later. */
	async function loadOptions() {
		const projectId = toValue(options.projectId);
		if (!projectId) return;
		loadingOptions.value = true;
		const context = rootStore.restApiContext;
		const [catalogResult, credentialsResult, skillsResult] = await Promise.allSettled([
			fetchAgentModelCatalog(context, projectId),
			fetchAgentCredentials(context, projectId),
			loadSkills(projectId),
		]);
		catalog.value = catalogResult.status === 'fulfilled' ? catalogResult.value : {};
		credentials.value = credentialsResult.status === 'fulfilled' ? credentialsResult.value : [];
		skills.value = skillsResult.status === 'fulfilled' ? skillsResult.value : [];
		loadingOptions.value = false;
	}

	watch(
		options.open,
		(isOpen) => {
			if (!isOpen) return;
			reset();
			void loadOptions();
		},
		{ immediate: true },
	);

	const modelItems = computed(() =>
		buildModelMenuItems({
			catalog: catalog.value,
			credentials: credentials.value,
			current: model.value,
			includeDefault: !isEdit.value,
			labels: {
				defaultModel: i18n.baseText('taskBoard.team.form.defaultModel'),
				defaultModelDescription: i18n.baseText('taskBoard.team.form.defaultModelDescription'),
				gatewayCredits: i18n.baseText('taskBoard.team.form.gatewayCredits'),
			},
		}),
	);

	const selectedModelLabel = computed(() => {
		if (model.value) return modelDisplayName(model.value.model, catalog.value);
		return i18n.baseText(
			isEdit.value ? 'taskBoard.team.form.noModel' : 'taskBoard.team.form.defaultModel',
		);
	});

	const selectedCredentialName = computed(() => {
		const credential = model.value?.credential;
		if (!credential) return undefined;
		if (credential === AI_GATEWAY_MANAGED_TAG) {
			return i18n.baseText('taskBoard.team.form.gatewayCredits');
		}
		return credentials.value.find((entry) => entry.id === credential)?.name;
	});

	function selectModel(id: string) {
		if (id === DEFAULT_MODEL_ITEM_ID) {
			model.value = null;
			return;
		}
		const choice = decodeModelChoice(id);
		if (choice) model.value = choice;
	}

	const skillItems = computed<SelectOptionBase[]>(() => {
		const items: SelectOptionBase[] = skills.value.map((skill) => ({
			value: skill.id,
			label: skill.name,
		}));
		// A skill the list does not have (for example one with no read access) stays selectable,
		// so a save does not drop it.
		for (const id of skillIds.value) {
			if (!items.some((item) => item.value === id)) {
				items.push({ value: id, label: id });
			}
		}
		return items;
	});

	const canSubmit = computed(
		() => name.value.trim().length > 0 && instructions.value.trim().length > 0,
	);

	function toValues(): AgentFormValues {
		return {
			name: name.value.trim(),
			description: description.value.trim(),
			instructions: instructions.value.trim(),
			model: model.value,
			skillIds: [...skillIds.value],
		};
	}

	return {
		isEdit,
		presetKey,
		name,
		description,
		instructions,
		skillIds,
		loadingOptions,
		modelItems,
		selectedModelLabel,
		selectedCredentialName,
		skillItems,
		canSubmit,
		applyPreset,
		selectModel,
		toValues,
	};
}
