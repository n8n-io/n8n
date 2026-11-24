<script setup lang="ts">
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import AgentModal from '../modals/AgentModal.vue';
import AgentHeldActionIcon from './AgentHeldActionIcon.vue';
import { formatActionMeta, type AgentHeldAction } from './heldActions';

const props = withDefaults(
	defineProps<{
		open: boolean;
		actions: AgentHeldAction[];
		busy?: boolean;
		error?: string | null;
	}>(),
	{
		busy: false,
		error: null,
	},
);

const emit = defineEmits<{
	'update:open': [open: boolean];
	confirm: [];
	cancel: [];
}>();

const i18n = useI18n();

const confirmLabel = computed(() =>
	i18n.baseText('agents.testRun.holdReplay.runActions', {
		adjustToNumber: props.actions.length,
		interpolate: { count: props.actions.length },
	}),
);

function onOpenChange(open: boolean) {
	if (open || props.busy) return;
	emit('update:open', false);
	emit('cancel');
}

function onConfirm() {
	if (props.busy) return;
	emit('confirm');
}
</script>

<template>
	<AgentModal
		:open="props.open"
		:title="i18n.baseText('agents.testRun.holdReplay.confirmModal.title')"
		:busy="props.busy"
		size="small"
		data-testid="agent-run-held-actions-modal"
		@update:open="onOpenChange"
	>
		<div :class="$style.body">
			<p :class="$style.description" data-testid="agent-run-held-actions-description">
				{{ i18n.baseText('agents.testRun.holdReplay.confirmModal.description') }}
			</p>
			<ul :class="$style.list" data-testid="agent-run-held-actions-list">
				<li
					v-for="action in props.actions"
					:key="action.actionId"
					:class="$style.item"
					data-testid="agent-run-held-actions-item"
				>
					<AgentHeldActionIcon :action="action" :size="18" :class="$style.itemIcon" />
					<span :class="$style.itemText">
						<span :class="$style.itemLabel">{{ action.actionLabel }}</span>
						<span v-if="formatActionMeta(action)" :class="$style.itemMeta">
							{{ formatActionMeta(action) }}
						</span>
					</span>
				</li>
			</ul>
			<N8nText
				v-if="props.error"
				tag="p"
				size="small"
				color="danger"
				:class="$style.error"
				data-testid="agent-run-held-actions-error"
			>
				{{ props.error }}
			</N8nText>
		</div>
		<template #footerActions>
			<N8nButton
				variant="solid"
				:loading="props.busy"
				data-testid="agent-run-held-actions-confirm"
				@click="onConfirm"
			>
				{{ confirmLabel }}
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.description {
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	text-wrap: pretty;
}

.list {
	margin: 0;
	padding: 0;
	list-style: none;
	border-block: var(--border);
}

.item {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) 0;
	min-width: 0;

	& + & {
		border-top: var(--border);
	}
}

.itemIcon {
	/* Centers the icon on the first line of the label. */
	margin-top: var(--spacing--5xs);
}

.itemText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.itemLabel {
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
	overflow-wrap: anywhere;
}

.itemMeta {
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--md);
	overflow-wrap: anywhere;
}

.error {
	margin: 0;
}
</style>
