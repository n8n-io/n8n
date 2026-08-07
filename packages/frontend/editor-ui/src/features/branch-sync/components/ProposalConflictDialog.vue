<script lang="ts" setup>
import { N8nButton, N8nDialog, N8nDialogFooter, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import type { ConflictChoices, Decision } from '@/features/branch-sync/branchSync.types';
import {
	getConflictReasonLabel,
	getDecisionDisplayName,
} from '@/features/branch-sync/branchSync.utils';
import ConflictChoice from '@/features/branch-sync/components/ConflictChoice.vue';

const props = defineProps<{
	open: boolean;
	conflicts: Decision[];
	submitting: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	submit: [choices: ConflictChoices];
}>();

const i18n = useI18n();

const choices = ref<ConflictChoices>({});

watch(
	() => props.open,
	(open) => {
		if (open) choices.value = {};
	},
);

const allResolved = computed(() =>
	props.conflicts.every((conflict) => choices.value[conflict.path] !== undefined),
);
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		:header="i18n.baseText('branchSync.proposals.conflictDialog.title')"
		data-test-id="branch-sync-proposal-conflict-dialog"
		@update:open="emit('update:open', $event)"
	>
		<div :class="$style.body">
			<N8nText color="text-light" size="small">
				{{ i18n.baseText('branchSync.proposals.conflictDialog.description') }}
			</N8nText>

			<ul :class="$style.list">
				<li v-for="conflict in conflicts" :key="conflict.path" :class="$style.row">
					<div :class="$style.rowInfo">
						<N8nText size="small" bold>{{ getDecisionDisplayName(conflict) }}</N8nText>
						<N8nText v-if="conflict.reason" size="xsmall" color="text-light">
							{{ getConflictReasonLabel(conflict.reason) }}
						</N8nText>
					</div>
					<ConflictChoice
						:model-value="choices[conflict.path]"
						@update:model-value="choices = { ...choices, [conflict.path]: $event }"
					/>
				</li>
			</ul>

			<N8nDialogFooter>
				<N8nButton
					type="secondary"
					:label="i18n.baseText('branchSync.connect.cancel')"
					@click="emit('update:open', false)"
				/>
				<N8nButton
					:label="i18n.baseText('branchSync.proposals.conflictDialog.submit')"
					:disabled="!allResolved || submitting"
					:loading="submitting"
					data-test-id="branch-sync-proposal-conflict-submit"
					@click="emit('submit', choices)"
				/>
			</N8nDialogFooter>
		</div>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
}

.rowInfo {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}
</style>
