<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { HUMAN_REVIEW_MODULE } from '@n8n/constants';
import { N8nIcon, N8nSettingsRowGroup } from '@n8n/design-system';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { useI18n } from '@n8n/i18n';
import type { AgentApprovalRoute, AgentHitlConfiguration } from '@n8n/api-types';
import type { AgentHitlContext } from './agent-hitl.types';
import { approvalName, type ApprovalDestination } from '../utils/approvalDestination';
import { hitlToolKeys } from '../utils/hitlConfiguration';
import AgentApprovalDestinationMenu from './AgentApprovalDestinationMenu.vue';
import AgentPillField from './AgentPillField.vue';
import AgentToolConfigApprovalSetting from './AgentToolConfigApprovalSetting.vue';
import AgentHitlConfigurationModal from './AgentHitlConfigurationModal.vue';

const props = withDefaults(
	defineProps<{
		modelValue?: AgentApprovalRoute;
		context: AgentHitlContext;
		projectId: string;
		disabled?: boolean;
		embedded?: boolean;
		label?: string;
		approvalRequired?: boolean;
		toolKey?: string;
	}>(),
	{ approvalRequired: undefined },
);
const emit = defineEmits<{
	'update:modelValue': [value: AgentApprovalRoute | undefined];
	'update:approvalRequired': [value: boolean];
}>();
const i18n = useI18n();
const label = computed(
	() =>
		props.label ??
		i18n.baseText(
			props.approvalRequired === undefined ? 'agents.hitl.mcpRoute' : 'agents.hitl.route',
		),
);
const enabled = computed(() => useSettingsStore().isAgentModuleActive(HUMAN_REVIEW_MODULE));
const group = computed(() => (props.embedded ? 'div' : N8nSettingsRowGroup));
const editing = ref<AgentHitlConfiguration>();
const expanded = ref(false);
const configurations = computed(() => props.context.getConfig()?.hitlConfigurations ?? []);
const selectedIds = computed(() =>
	props.modelValue?.type === 'configuration' ? props.modelValue.configurationIds : [],
);
const selected = computed(() =>
	selectedIds.value.map((id) => {
		const configuration = configurations.value.find((entry) => entry.id === id);
		return {
			value: id,
			label: configuration ? approvalName(configuration) : id,
			icon: configuration?.method === 'workflow' ? ('workflow' as const) : configuration?.channel,
			editable: !!configuration,
			invalid: !configuration,
		};
	}),
);

function update(ids: string[]) {
	if (!props.disabled)
		emit(
			'update:modelValue',
			ids.length ? { type: 'configuration', configurationIds: ids } : undefined,
		);
}
function attach(id: string) {
	if (!selectedIds.value.includes(id)) update([...selectedIds.value, id]);
}
function remove(id: string) {
	update(selectedIds.value.filter((value) => value !== id));
}
function add(destination: ApprovalDestination) {
	if (props.disabled) return;
	const configuration = { ...destination, id: generateNanoId() };
	props.context.saveConfiguration(configuration);
	attach(configuration.id);
}
function save(configuration: AgentHitlConfiguration, toolKeys?: string[]) {
	if (props.disabled) return;
	props.context.saveConfiguration(configuration, toolKeys);
	const key = props.toolKey;
	if (
		toolKeys &&
		key &&
		hitlToolKeys(props.context.getConfig()).includes(key) &&
		!toolKeys.includes(key)
	)
		remove(configuration.id);
	editing.value = undefined;
}
watch(
	() => props.approvalRequired,
	(value) => {
		if (!value) expanded.value = false;
	},
);
watch(
	() => props.disabled,
	(value) => {
		if (value) editing.value = undefined;
	},
);
</script>

<template>
	<div>
		<component :is="group" v-if="enabled" :class="$style.group" data-testid="agent-approval-route">
			<AgentToolConfigApprovalSetting
				v-if="approvalRequired !== undefined"
				:model-value="approvalRequired"
				:disabled="disabled"
				:class="$style.toggle"
				@update:model-value="emit('update:approvalRequired', $event)"
			/>
			<div v-if="approvalRequired !== false" :class="{ [$style.divider]: approvalRequired }">
				<button
					type="button"
					:class="$style.trigger"
					:aria-expanded="expanded"
					data-testid="agent-approval-expand"
					@click="expanded = !expanded"
				>
					<span>
						<span :class="$style.label">{{ label }}</span>
						<span :class="$style.subtitle">{{ i18n.baseText('agents.hitl.destinationHint') }}</span>
					</span>
					<N8nIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" />
				</button>
				<AgentPillField
					v-if="expanded"
					embedded
					hide-label
					:label="label"
					:add-label="i18n.baseText('agents.hitl.addReview')"
					:pills="selected"
					:items="[]"
					:disabled="disabled"
					test-id="agent-review"
					@edit="editing = configurations.find((entry) => entry.id === $event)"
					@remove="remove"
				>
					<template #add>
						<AgentApprovalDestinationMenu
							:context="context"
							:project-id="projectId"
							:disabled="disabled"
							:exclude-ids="selectedIds"
							existing
							:label="i18n.baseText('agents.hitl.addReview')"
							test-id="agent-review-add"
							@select="add"
							@attach="attach"
						/>
					</template>
				</AgentPillField>
			</div>
		</component>
		<AgentToolConfigApprovalSetting
			v-else-if="approvalRequired !== undefined"
			:model-value="approvalRequired"
			:disabled="disabled"
			@update:model-value="emit('update:approvalRequired', $event)"
		/>
		<AgentHitlConfigurationModal
			v-if="editing"
			:configuration="editing"
			hide-remove
			:context="context"
			:project-id="projectId"
			@save="save"
			@close="editing = undefined"
		/>
	</div>
</template>

<style module lang="scss">
.group {
	overflow: visible;
	background: transparent;
}
.toggle {
	padding: var(--spacing--sm) var(--spacing--md);
}
.divider {
	border-top: var(--border);
}
.trigger {
	border: 0;
	background: transparent;
	color: var(--text-color);
	display: flex;
	width: 100%;
	justify-content: space-between;
	align-items: center;
	text-align: left;
	padding: var(--spacing--sm) var(--spacing--md);
	cursor: pointer;

	&:hover {
		background: var(--background--hover);
	}
}
.label,
.subtitle {
	display: block;
}
.label {
	font-size: var(--font-size--sm);
}
.subtitle {
	margin-top: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtler);
}
</style>
