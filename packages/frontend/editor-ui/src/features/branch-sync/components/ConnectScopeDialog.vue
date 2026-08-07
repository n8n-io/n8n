<script lang="ts" setup>
import {
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nDialog,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { useToast } from '@n8n/composables/useToast';
import type { ConflictPolicy, ScopeRole } from '@/features/branch-sync/branchSync.types';
import { useBranchSyncStore } from '@/features/branch-sync/branchSync.store';

const props = defineProps<{
	open: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const i18n = useI18n();
const toast = useToast();
const store = useBranchSyncStore();

const repoUrl = ref('');
const branch = ref('main');
const scopeKey = ref('instance');
const role = ref<ScopeRole>('destination');
const policy = ref<ConflictPolicy>('manual');
const editable = ref(true);
const submitting = ref(false);

const isSubmitDisabled = computed(
	() =>
		submitting.value ||
		repoUrl.value.trim().length === 0 ||
		branch.value.trim().length === 0 ||
		scopeKey.value.trim().length === 0,
);

watch(
	() => props.open,
	(open) => {
		if (!open) return;
		repoUrl.value = '';
		branch.value = 'main';
		scopeKey.value = 'instance';
		role.value = 'destination';
		policy.value = 'manual';
		editable.value = true;
	},
);

async function onSubmit() {
	submitting.value = true;
	try {
		const scope = await store.connect({
			scopeKey: scopeKey.value.trim(),
			repoUrl: repoUrl.value.trim(),
			branch: branch.value.trim(),
			role: role.value,
			policy: policy.value,
			editable: editable.value,
		});
		toast.showMessage({
			title: i18n.baseText('branchSync.connect.toast', {
				interpolate: { scope: scope.scopeKey },
			}),
			type: 'success',
		});
		emit('update:open', false);
	} catch (error) {
		toast.showError(error, i18n.baseText('branchSync.error.connect'));
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		:header="i18n.baseText('branchSync.connect.title')"
		data-test-id="branch-sync-connect-dialog"
		@update:open="emit('update:open', $event)"
	>
		<div :class="$style.body">
			<N8nInputLabel :label="i18n.baseText('branchSync.connect.repoUrl')" required>
				<N8nInput
					v-model="repoUrl"
					placeholder="/path/to/repo.git"
					data-test-id="branch-sync-connect-repo-url"
				/>
			</N8nInputLabel>

			<N8nInputLabel :label="i18n.baseText('branchSync.connect.branch')" required>
				<N8nInput v-model="branch" data-test-id="branch-sync-connect-branch" />
			</N8nInputLabel>

			<N8nInputLabel :label="i18n.baseText('branchSync.connect.scopeKey')" required>
				<N8nInput
					v-model="scopeKey"
					placeholder="instance | project:<projectId>"
					data-test-id="branch-sync-connect-scope-key"
				/>
			</N8nInputLabel>

			<N8nInputLabel :label="i18n.baseText('branchSync.connect.role')" required>
				<N8nSelect v-model="role" data-test-id="branch-sync-connect-role">
					<N8nOption value="source" :label="i18n.baseText('branchSync.role.source')" />
					<N8nOption value="destination" :label="i18n.baseText('branchSync.role.destination')" />
				</N8nSelect>
			</N8nInputLabel>

			<N8nInputLabel :label="i18n.baseText('branchSync.connect.policy')" required>
				<N8nSelect v-model="policy" data-test-id="branch-sync-connect-policy">
					<N8nOption value="manual" :label="i18n.baseText('branchSync.policy.manual')" />
					<N8nOption value="mirror" :label="i18n.baseText('branchSync.policy.mirror')" />
					<N8nOption value="keep-live" :label="i18n.baseText('branchSync.policy.keepLive')" />
				</N8nSelect>
			</N8nInputLabel>

			<N8nCheckbox v-model="editable" :label="i18n.baseText('branchSync.connect.editable')" />

			<N8nCallout theme="info">
				{{ i18n.baseText('branchSync.connect.hint') }}
			</N8nCallout>

			<N8nDialogFooter>
				<N8nButton
					type="secondary"
					:label="i18n.baseText('branchSync.connect.cancel')"
					@click="emit('update:open', false)"
				/>
				<N8nButton
					:label="i18n.baseText('branchSync.connect.submit')"
					:disabled="isSubmitDisabled"
					:loading="submitting"
					data-test-id="branch-sync-connect-submit"
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
