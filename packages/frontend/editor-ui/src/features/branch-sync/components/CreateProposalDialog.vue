<script lang="ts" setup>
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { useToast } from '@n8n/composables/useToast';
import { useBranchSyncStore } from '@/features/branch-sync/branchSync.store';
import type { ConflictChoices } from '@/features/branch-sync/branchSync.types';

const props = defineProps<{
	open: boolean;
	scopeKey: string;
	/** Current plan choices — forwarded so a conflicted plan can still propose. */
	choices: ConflictChoices;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const i18n = useI18n();
const toast = useToast();
const store = useBranchSyncStore();

const name = ref('');
const submitting = ref(false);

const isSubmitDisabled = computed(
	() => submitting.value || !/^[a-z0-9-]+$/.test(name.value.trim()),
);

watch(
	() => props.open,
	(open) => {
		if (open) name.value = '';
	},
);

async function onSubmit() {
	submitting.value = true;
	try {
		const proposal = await store.createProposal(
			props.scopeKey,
			name.value.trim(),
			Object.keys(props.choices).length > 0 ? props.choices : undefined,
		);
		toast.showMessage({
			title: i18n.baseText('branchSync.proposals.created', {
				interpolate: { name: proposal.name, branch: proposal.branch },
			}),
			type: 'success',
		});
		emit('update:open', false);
	} catch (error) {
		toast.showError(error, i18n.baseText('branchSync.error.proposal'));
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="small"
		:header="i18n.baseText('branchSync.proposals.create')"
		data-test-id="branch-sync-create-proposal-dialog"
		@update:open="emit('update:open', $event)"
	>
		<div :class="$style.body">
			<N8nInputLabel :label="i18n.baseText('branchSync.proposals.name')" required>
				<N8nInput v-model="name" placeholder="my-change" data-test-id="branch-sync-proposal-name" />
			</N8nInputLabel>

			<N8nCallout theme="info">
				{{ i18n.baseText('branchSync.proposals.createHint') }}
			</N8nCallout>

			<N8nDialogFooter>
				<N8nButton
					type="secondary"
					:label="i18n.baseText('branchSync.connect.cancel')"
					@click="emit('update:open', false)"
				/>
				<N8nButton
					:label="i18n.baseText('branchSync.proposals.create')"
					:disabled="isSubmitDisabled"
					:loading="submitting"
					data-test-id="branch-sync-proposal-submit"
					@click="onSubmit"
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
</style>
