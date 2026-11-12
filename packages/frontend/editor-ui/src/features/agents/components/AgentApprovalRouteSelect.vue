<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { HUMAN_INTERACTIONS_MODULE } from '@n8n/constants';
import {
	N8nButton,
	N8nCombobox2,
	N8nIcon,
	N8nIconButton,
	N8nInputLabel,
	N8nPopover,
	N8nText,
	N8nTooltip,
	type ComboboxItem,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentApprovalRoute, AgentHitlConfiguration } from '@n8n/api-types';
import type { AgentHitlContext } from './agent-hitl.types';
import AgentChipButton from './AgentChipButton.vue';
import AgentHitlConfigurationModal from './AgentHitlConfigurationModal.vue';

const props = defineProps<{
	modelValue?: AgentApprovalRoute;
	context: AgentHitlContext;
	projectId: string;
	disabled?: boolean;
	label?: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: AgentApprovalRoute | undefined] }>();
const i18n = useI18n();
const label = computed(() => props.label ?? i18n.baseText('agents.hitl.route'));
const enabled = computed(() => useSettingsStore().isAgentModuleActive(HUMAN_INTERACTIONS_MODULE));
const modalOpen = ref(false);
const editing = ref<AgentHitlConfiguration>();
const open = ref(false);
const configurations = computed(() => props.context.getConfig()?.hitlConfigurations ?? []);
const selectedIds = computed(() =>
	props.modelValue?.type === 'configuration' ? props.modelValue.configurationIds : [],
);
const selected = computed(() =>
	selectedIds.value.map((id) => ({
		id,
		configuration: configurations.value.find((entry) => entry.id === id),
	})),
);
const items = computed<ComboboxItem[]>(() => [
	{
		value: '__create_review__',
		label: i18n.baseText('agents.hitl.create'),
		icon: 'plus',
		onSelect: (event: Event) => {
			event.preventDefault();
			if (props.disabled) return;
			open.value = false;
			editing.value = undefined;
			modalOpen.value = true;
		},
	},
	{ type: 'separator' },
	...configurations.value
		.filter((configuration) => !selectedIds.value.includes(configuration.id))
		.map((configuration) => ({
			value: configuration.id,
			label: configuration.name,
			icon: configuration.method === 'workflow' ? ('workflow' as const) : configuration.channel,
		})),
]);
function update(ids: string[]) {
	if (props.disabled) return;
	emit(
		'update:modelValue',
		ids.length ? { type: 'configuration', configurationIds: ids } : undefined,
	);
}
function select(value: unknown) {
	if (typeof value !== 'string' || !configurations.value.some((entry) => entry.id === value))
		return;
	if (!selectedIds.value.includes(value)) update([...selectedIds.value, value]);
	open.value = false;
}
function remove(id: string) {
	update(selectedIds.value.filter((value) => value !== id));
}
function edit(configuration: AgentHitlConfiguration | undefined) {
	if (!configuration || props.disabled) return;
	editing.value = configuration;
	modalOpen.value = true;
}
function save(configuration: AgentHitlConfiguration, toolKeys?: string[]) {
	if (props.disabled) return;
	props.context.saveConfiguration(configuration, toolKeys);
	if (!selectedIds.value.includes(configuration.id))
		update([...selectedIds.value, configuration.id]);
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
		<N8nInputLabel :label="label">
			<div :class="$style.reviews" role="group" :aria-label="label">
				<N8nText v-if="!selected.length" size="small" color="text-light">{{
					i18n.baseText('agents.hitl.useDefault')
				}}</N8nText>
				<AgentChipButton
					v-for="{ id, configuration } in selected"
					:key="id"
					:clickable="false"
					:class="$style.pill"
					:icon="configuration?.method === 'workflow' ? 'workflow' : configuration?.channel"
					:invalid="!configuration"
					data-testid="agent-review-pill"
				>
					<span :class="$style.pillContent">
						<button
							type="button"
							:class="$style.pillName"
							:disabled="disabled || !configuration"
							@click="edit(configuration)"
						>
							{{ configuration?.name ?? id }}
						</button>
						<N8nIconButton
							icon="x"
							variant="ghost"
							size="small"
							:disabled="disabled"
							:aria-label="
								i18n.baseText('agents.hitl.removeReview', {
									interpolate: { name: configuration?.name ?? id },
								})
							"
							data-testid="agent-review-remove"
							@click="remove(id)"
						/>
					</span>
				</AgentChipButton>
				<N8nPopover
					v-model:open="open"
					:teleported="false"
					align="end"
					:content-class="$style.menu"
				>
					<template #trigger>
						<N8nTooltip :content="i18n.baseText('agents.hitl.addReview')" :teleported="false">
							<N8nButton
								variant="ghost"
								size="small"
								icon-only
								:disabled="disabled"
								:aria-label="i18n.baseText('agents.hitl.addReview')"
								data-testid="agent-review-add"
							>
								<template #icon><N8nIcon icon="plus" :size="16" /></template>
							</N8nButton>
						</N8nTooltip>
					</template>
					<template #content>
						<N8nCombobox2
							:items="items"
							:disabled="disabled"
							:teleported="false"
							auto-focus
							:open="true"
							:aria-label="i18n.baseText('agents.hitl.selectReview')"
							:placeholder="i18n.baseText('agents.hitl.selectReview')"
							@update:model-value="select"
						/>
					</template>
				</N8nPopover>
			</div>
		</N8nInputLabel>
		<N8nText v-if="selected.length" size="small" color="text-light">{{
			i18n.baseText('agents.hitl.reviewOrder')
		}}</N8nText>
		<AgentHitlConfigurationModal
			v-if="modalOpen"
			:configuration="editing"
			hide-remove
			:context="context"
			:project-id="projectId"
			:next-number="configurations.length + 1"
			@save="save"
			@close="modalOpen = false"
		/>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/focus';
.reviews {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
	min-height: var(--height--xl);
	padding: var(--spacing--2xs);
	border: var(--border-width) solid var(--border-color);
	border-radius: var(--radius--base);
}
.pill {
	max-width: 100%;
}
.pillContent {
	pointer-events: auto;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	max-width: 100%;
}
.pillName {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	@include focus.focus-visible-ring;
	border: 0;
	padding: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	cursor: pointer;
}
.menu {
	width: var(--spacing--5xl);
}
</style>
