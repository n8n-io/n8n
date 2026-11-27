<script setup lang="ts">
import type { McpServerToolCandidate, McpServerToolCandidateReason } from '@n8n/api-types';
import {
	N8nButton,
	N8nCheckbox,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nIcon,
	N8nIconButton,
	N8nInfoTip,
	N8nInput,
	N8nLoading,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

// "Add workflow": the workflows of the project, with search and multi-select. A workflow that
// cannot be a tool stays in the list with its reason, so the builder knows what to fix.
const props = defineProps<{
	candidates: McpServerToolCandidate[];
	loading: boolean;
	/** The URL of a workflow, which opens in a new tab. */
	workflowHref: (workflowId: string) => string;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
	confirm: [workflowIds: string[]];
}>();

const i18n = useI18n();
const search = ref('');
const selected = ref<string[]>([]);

watch(open, (value) => {
	if (!value) return;
	search.value = '';
	selected.value = [];
});

const reasonText = (reason: McpServerToolCandidateReason) =>
	i18n.baseText(`mcpServers.picker.reason.${reason}`);

/** Workflows that the builder can pick come first. */
const rows = computed(() => {
	const term = search.value.trim().toLowerCase();
	return props.candidates
		.filter((candidate) => !term || candidate.name.toLowerCase().includes(term))
		.sort((a, b) => Number(a.reason !== null) - Number(b.reason !== null));
});

function toggle(candidate: McpServerToolCandidate, value?: boolean) {
	if (candidate.reason) return;
	const isSelected = selected.value.includes(candidate.workflowId);
	const next = value ?? !isSelected;
	selected.value = next
		? [...selected.value.filter((id) => id !== candidate.workflowId), candidate.workflowId]
		: selected.value.filter((id) => id !== candidate.workflowId);
}

const confirmLabel = computed(() =>
	selected.value.length
		? i18n.baseText('mcpServers.picker.addCount', {
				adjustToNumber: selected.value.length,
				interpolate: { count: String(selected.value.length) },
			})
		: i18n.baseText('mcpServers.picker.add'),
);

function onConfirm() {
	if (selected.value.length === 0) return;
	emit('confirm', [...selected.value]);
	open.value = false;
}
</script>

<template>
	<N8nDialog
		v-model:open="open"
		:header="i18n.baseText('mcpServers.picker.title')"
		:aria-description="i18n.baseText('mcpServers.picker.description')"
		size="large"
		data-test-id="mcp-workflow-picker"
	>
		<N8nDialogBody :class="$style.body">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('mcpServers.picker.description') }}
			</N8nText>
			<N8nInput
				v-model="search"
				:placeholder="i18n.baseText('mcpServers.picker.search')"
				size="medium"
				clearable
				data-test-id="mcp-workflow-picker-search"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</N8nInput>
			<N8nLoading v-if="loading" :rows="3" />
			<div v-else :class="$style.list" role="list">
				<div
					v-for="candidate in rows"
					:key="candidate.workflowId"
					role="listitem"
					:class="[$style.row, { [$style.disabled]: !!candidate.reason }]"
					data-test-id="mcp-workflow-picker-row"
					:data-disabled="candidate.reason ? 'true' : undefined"
					@click="toggle(candidate)"
				>
					<N8nCheckbox
						:model-value="selected.includes(candidate.workflowId)"
						:disabled="!!candidate.reason"
						:aria-label="candidate.name"
						@click.stop
						@update:model-value="toggle(candidate, $event)"
					/>
					<div :class="$style.rowText">
						<N8nText size="small" bold>{{ candidate.name }}</N8nText>
						<div v-if="candidate.reason" :class="$style.reasonLine">
							<N8nText
								size="small"
								color="text-light"
								:class="$style.reason"
								data-test-id="mcp-workflow-picker-reason"
							>
								<N8nIcon icon="circle-alert" size="xsmall" />
								{{ reasonText(candidate.reason) }}
							</N8nText>
							<N8nInfoTip
								v-if="candidate.reason === 'missing_trigger'"
								type="tooltip"
								theme="info-light"
								size="small"
								tooltip-placement="top"
								:class="$style.reasonTip"
								data-test-id="mcp-workflow-picker-reason-tooltip"
							>
								{{ i18n.baseText('mcpServers.picker.reason.missing_trigger.tooltip') }}
							</N8nInfoTip>
						</div>
						<N8nText v-else size="small" color="text-light">
							{{ candidate.description || i18n.baseText('mcpServers.picker.noDescription') }}
						</N8nText>
					</div>
					<!-- Opens in a new tab. The click does not select or unselect the row. -->
					<N8nIconButton
						icon="external-link"
						variant="ghost"
						size="small"
						:href="workflowHref(candidate.workflowId)"
						target="_blank"
						:aria-label="i18n.baseText('mcpServers.picker.openWorkflow')"
						:title="i18n.baseText('mcpServers.picker.openWorkflow')"
						:class="$style.openLink"
						data-test-id="mcp-workflow-picker-open"
						@click.stop
					/>
				</div>
				<N8nText v-if="rows.length === 0" size="small" color="text-light" :class="$style.empty">
					{{ i18n.baseText('mcpServers.picker.noMatches') }}
				</N8nText>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="ghost"
				:label="i18n.baseText('mcpServers.picker.cancel')"
				@click="open = false"
			/>
			<N8nButton
				variant="solid"
				:label="confirmLabel"
				:disabled="selected.length === 0"
				data-test-id="mcp-workflow-picker-confirm"
				data-attr="mcp-workflow-picker-confirm"
				@click="onConfirm"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.list {
	display: flex;
	flex-direction: column;
	max-height: calc(var(--spacing--5xl) * 1.5);
	overflow-y: auto;
	border: var(--border);
	border-radius: var(--radius);
}

.row {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	cursor: pointer;

	& + & {
		border-top: var(--border);
	}

	&:hover:not(.disabled) {
		background-color: var(--background--hover);
	}

	&.disabled {
		cursor: default;
		opacity: 0.7;
	}
}

.rowText {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.openLink {
	flex: none;
	margin: calc(var(--spacing--4xs) * -1) calc(var(--spacing--2xs) * -1) 0 0;
	color: var(--text-color--subtle);
}

.reasonLine {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.reason {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.reasonTip {
	display: inline-flex;
	color: var(--text-color--subtle);
}

.empty {
	padding: var(--spacing--xs) var(--spacing--sm);
}
</style>
