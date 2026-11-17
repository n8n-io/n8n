<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { HUMAN_REVIEW_MODULE } from '@n8n/constants';
import { N8nIcon, N8nTooltip, type DropdownMenuItemProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentApprovalRoute, AgentHitlConfiguration } from '@n8n/api-types';
import type { AgentHitlContext } from './agent-hitl.types';
import AgentPillField from './AgentPillField.vue';
import AgentChipButton from './AgentChipButton.vue';
import AgentToolConfigApprovalSetting from './AgentToolConfigApprovalSetting.vue';
import AgentHitlConfigurationModal from './AgentHitlConfigurationModal.vue';
import { hitlToolKeys } from '../utils/hitlConfiguration';

const props = withDefaults(
	defineProps<{
		modelValue?: AgentApprovalRoute;
		context: AgentHitlContext;
		projectId: string;
		disabled?: boolean;
		embedded?: boolean;
		label?: string;
		approvalRequired?: boolean;
		/** Key of the tool or MCP server that this route belongs to. */
		toolKey?: string;
	}>(),
	{ approvalRequired: undefined },
);
const emit = defineEmits<{
	'update:modelValue': [value: AgentApprovalRoute | undefined];
	'update:approvalRequired': [value: boolean];
}>();
const i18n = useI18n();
const label = computed(() => props.label ?? i18n.baseText('agents.hitl.route'));
const enabled = computed(() => useSettingsStore().isAgentModuleActive(HUMAN_REVIEW_MODULE));
const modalOpen = ref(false);
const editing = ref<AgentHitlConfiguration>();
const open = ref(false);
const configurations = computed(() => props.context.getConfig()?.hitlConfigurations ?? []);
const selectedIds = computed(() =>
	props.modelValue?.type === 'configuration' ? props.modelValue.configurationIds : [],
);
const selected = computed(() =>
	selectedIds.value.map((id) => {
		const configuration = configurations.value.find((entry) => entry.id === id);
		return {
			value: id,
			label: configuration?.name ?? id,
			icon: configuration?.method === 'workflow' ? ('workflow' as const) : configuration?.channel,
			invalid: !configuration,
			editable: !!configuration,
		};
	}),
);
const items = computed<Array<DropdownMenuItemProps<string>>>(() => [
	{
		id: '__create_review__',
		label: i18n.baseText('agents.hitl.create'),
		icon: { type: 'icon', value: 'plus' },
		suppressCloseAutoFocus: true,
	},
	...configurations.value
		.filter((configuration) => !selectedIds.value.includes(configuration.id))
		.map((configuration, index) => ({
			id: configuration.id,
			label: configuration.name,
			icon: {
				type: 'icon' as const,
				value: configuration.method === 'workflow' ? ('workflow' as const) : configuration.channel,
			},
			divided: index === 0,
		})),
]);
function updateApprovalRequired(value: boolean) {
	if (!props.disabled) emit('update:approvalRequired', value);
}

function update(ids: string[]) {
	if (props.disabled) return;
	emit(
		'update:modelValue',
		ids.length ? { type: 'configuration', configurationIds: ids } : undefined,
	);
}
function select(value: unknown) {
	if (props.disabled) return;
	if (value === '__create_review__') {
		open.value = false;
		editing.value = undefined;
		modalOpen.value = true;
		return;
	}
	if (typeof value !== 'string' || !configurations.value.some((entry) => entry.id === value))
		return;
	if (!selectedIds.value.includes(value)) update([...selectedIds.value, value]);
	open.value = false;
}
function remove(id: string) {
	update(selectedIds.value.filter((value) => value !== id));
}
function edit(id: string) {
	const configuration = configurations.value.find((entry) => entry.id === id);
	if (!configuration || props.disabled) return;
	editing.value = configuration;
	modalOpen.value = true;
}
function save(configuration: AgentHitlConfiguration, toolKeys?: string[]) {
	if (props.disabled) return;
	props.context.saveConfiguration(configuration, toolKeys);
	// The modal's Tools selection decides membership when it lists this tool.
	const toolKey = props.toolKey;
	const listed = !!toolKey && hitlToolKeys(props.context.getConfig()).includes(toolKey);
	const attached = !toolKeys || !toolKey || !listed || toolKeys.includes(toolKey);
	const isSelected = selectedIds.value.includes(configuration.id);
	if (attached && !isSelected) update([...selectedIds.value, configuration.id]);
	else if (!attached && isSelected) remove(configuration.id);
	modalOpen.value = false;
}
watch(
	() => props.disabled,
	(disabled) => {
		if (disabled) {
			open.value = false;
			modalOpen.value = false;
		}
	},
);
</script>

<template>
	<div v-if="enabled" data-testid="agent-approval-route">
		<AgentPillField
			v-model:open="open"
			:label="label"
			:embedded="embedded"
			:add-label="i18n.baseText('agents.hitl.addReview')"
			:show-items="approvalRequired !== false"
			:pills="selected"
			:items="items"
			:disabled="disabled"
			test-id="agent-review"
			@select="select"
			@remove="remove"
			@edit="edit"
		>
			<template #leading-pill>
				<AgentChipButton
					:clickable="false"
					:deactivated="disabled"
					data-testid="agent-review-requester"
				>
					<span :class="$style.requester">
						{{ i18n.baseText('agents.hitl.useDefault') }}
						<N8nTooltip
							as-child
							:content="i18n.baseText('agents.hitl.askUserHelp')"
							:teleported="false"
						>
							<button
								type="button"
								:class="$style.info"
								:aria-label="i18n.baseText('agents.hitl.askUserHelp')"
							>
								<N8nIcon icon="info" size="small" />
							</button>
						</N8nTooltip>
					</span>
				</AgentChipButton>
			</template>
			<template v-if="approvalRequired !== undefined" #header>
				<AgentToolConfigApprovalSetting
					:model-value="approvalRequired"
					:disabled="disabled"
					@update:model-value="updateApprovalRequired"
				/>
			</template>
		</AgentPillField>
		<AgentHitlConfigurationModal
			v-if="modalOpen"
			:configuration="editing"
			hide-remove
			:context="context"
			:project-id="projectId"
			:next-number="configurations.length + 1"
			:include-tool-key="toolKey"
			@save="save"
			@close="modalOpen = false"
		/>
	</div>
	<AgentToolConfigApprovalSetting
		v-else-if="approvalRequired !== undefined"
		:model-value="approvalRequired"
		:disabled="disabled"
		@update:model-value="updateApprovalRequired"
	/>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/focus';

.requester {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
.info {
	@include focus.focus-visible-ring;
	display: inline-flex;
	padding: 0;
	border: 0;
	background: transparent;
	color: var(--text-color--subtler);
	cursor: help;
	pointer-events: auto;
}
</style>
