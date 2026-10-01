<script setup lang="ts">
/**
 * Mode picker plus tag list for a human-in-the-loop approval selection.
 * Shared by MCP servers, whose entries are tool names, and channels, whose
 * entries are action names.
 *
 * The caller owns where the entries come from: MCP fetches them from the
 * server, a channel takes them from the integration catalog.
 */
import { computed, ref, watch } from 'vue';
import { N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentApproval } from '@n8n/api-types';

export type ApprovalMode = 'disabled' | 'global' | 'selected';

export interface ApprovalEntryOption {
	label: string;
	value: string;
}

const props = defineProps<{
	modelValue?: AgentApproval;
	options: ApprovalEntryOption[];
	label: string;
	hint: string;
	placeholder: string;
	testIdPrefix: string;
	loading?: boolean;
	/** Already-translated message shown below the tag list. */
	error?: string | null;
	/** Hide the "Disabled" option — for callers that wrap the selector in a
	 * toggle that already handles enable/disable. */
	hideDisabledOption?: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: AgentApproval | undefined];
	'update:valid': [valid: boolean];
	'update:mode': [mode: ApprovalMode];
}>();

const i18n = useI18n();

const approvalMode = ref<ApprovalMode>('disabled');
const selectedEntries = ref<string[]>([]);

const modeOptions = computed(() => {
	const all = [
		{ label: i18n.baseText('agents.toolConfig.mcpApproval.disabled'), value: 'disabled' as const },
		{ label: i18n.baseText('agents.toolConfig.mcpApproval.askAll'), value: 'global' as const },
		{
			label: i18n.baseText('agents.toolConfig.mcpApproval.askSelected'),
			value: 'selected' as const,
		},
	];
	return props.hideDisabledOption ? all.filter((option) => option.value !== 'disabled') : all;
});

const isValid = computed(
	() => approvalMode.value !== 'selected' || selectedEntries.value.length > 0,
);

watch(
	() => props.modelValue,
	(approval) => {
		if (!approval) {
			approvalMode.value = 'disabled';
			selectedEntries.value = [];
			return;
		}

		approvalMode.value = approval.mode;
		selectedEntries.value = approval.mode === 'selected' ? approval.tools : [];
	},
	{ immediate: true },
);

watch(isValid, (valid) => emit('update:valid', valid), { immediate: true });

// Drop selections the caller no longer offers. An empty list means the entries
// have not arrived yet, which must not wipe a saved selection. Watching
// modelValue alongside options covers a saved value that already holds stale
// entries when the options are populated at mount.
watch(
	[() => props.modelValue, () => props.options],
	([, options]) => {
		if (approvalMode.value !== 'selected' || options.length === 0) return;

		const available = new Set(options.map((option) => option.value));
		const pruned = selectedEntries.value.filter((entry) => available.has(entry));
		if (pruned.length !== selectedEntries.value.length) {
			selectedEntries.value = pruned;
			emitApproval();
		}
	},
	{ immediate: true },
);

function toStringArray(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === 'string')
		: [];
}

function toApprovalMode(value: unknown): ApprovalMode {
	return value === 'global' || value === 'selected' ? value : 'disabled';
}

function emitApproval() {
	if (approvalMode.value === 'global') {
		emit('update:modelValue', { mode: 'global' });
		return;
	}

	if (approvalMode.value === 'selected') {
		emit('update:modelValue', { mode: 'selected', tools: selectedEntries.value });
		return;
	}

	emit('update:modelValue', undefined);
}

function handleModeUpdate(value: unknown) {
	approvalMode.value = toApprovalMode(value);
	emitApproval();
	emit('update:mode', approvalMode.value);
}

function handleSelectedUpdate(value: unknown) {
	selectedEntries.value = toStringArray(value);
	emitApproval();
}
</script>

<template>
	<div :class="$style.approvalRow">
		<div :class="$style.approvalText">
			<N8nText size="small" :bold="true">{{ props.label }}</N8nText>
			<N8nText size="small" color="text-light">{{ props.hint }}</N8nText>
		</div>

		<div :class="$style.controls">
			<N8nSelect
				:model-value="approvalMode"
				size="small"
				:data-test-id="`${props.testIdPrefix}-mode`"
				:class="$style.modeSelect"
				@update:model-value="handleModeUpdate"
			>
				<N8nOption
					v-for="option in modeOptions"
					:key="option.value"
					:value="option.value"
					:label="option.label"
				/>
			</N8nSelect>
			<slot name="controls" :mode="approvalMode" />
		</div>

		<N8nSelect
			v-if="approvalMode === 'selected'"
			:model-value="selectedEntries"
			multiple
			filterable
			size="small"
			:loading="props.loading"
			:placeholder="props.placeholder"
			:data-test-id="`${props.testIdPrefix}-tools`"
			@update:model-value="handleSelectedUpdate"
		>
			<N8nOption
				v-for="option in props.options"
				:key="option.value"
				:value="option.value"
				:label="option.label"
			/>
		</N8nSelect>

		<N8nText v-if="props.error && approvalMode === 'selected'" size="xsmall" color="danger">
			{{ props.error }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.approvalRow {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--2xs);
	margin-right: var(--spacing--lg);
}

.approvalText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.controls {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.modeSelect {
	width: 180px;
}
</style>
