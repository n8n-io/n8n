<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nAlertDialog,
	N8nButton,
	N8nCallout,
	N8nEmptyState,
	N8nLoading,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';

import RuleModal from '../components/RuleModal.vue';
import type { RuleFormValue } from '../components/RuleModal.vue';
import RulesTable from '../components/RulesTable.vue';
import type { RuntimeCredentialRule } from '../runtime-credentials.api';
import { useRuntimeCredentialsStore } from '../runtime-credentials.store';
import { getHttpStatus } from '../runtime-credentials.utils';

const i18n = useI18n();
const toast = useToast();
const store = useRuntimeCredentialsStore();

const modalOpen = ref(false);
const editingRule = ref<RuntimeCredentialRule>();
const saving = ref(false);
const saveError = ref('');

const ruleToDelete = ref<RuntimeCredentialRule>();
const deleting = ref(false);

const deleteDialogOpen = computed({
	get: () => ruleToDelete.value !== undefined,
	set: (open) => {
		if (!open) ruleToDelete.value = undefined;
	},
});

onMounted(async () => {
	await store.loadRules();
});

function openAdd() {
	editingRule.value = undefined;
	saveError.value = '';
	modalOpen.value = true;
}

function openEdit(rule: RuntimeCredentialRule) {
	editingRule.value = rule;
	saveError.value = '';
	modalOpen.value = true;
}

function errorMessage(error: unknown, alias: string): string {
	switch (getHttpStatus(error)) {
		case 409:
			return i18n.baseText('runtimeCredentials.rules.error.duplicate', { interpolate: { alias } });
		case 400: {
			// Show the reason from the server when it is short and readable, for example an unsafe path.
			const reason = error instanceof Error ? error.message.trim() : '';
			const readable = reason.length > 0 && reason.length <= 160 && !/^[[{]/.test(reason);
			return readable
				? i18n.baseText('runtimeCredentials.rules.error.invalidWithReason', {
						interpolate: { reason },
					})
				: i18n.baseText('runtimeCredentials.rules.error.invalid');
		}
		case 403:
			return i18n.baseText('runtimeCredentials.rules.error.forbidden');
		default:
			return i18n.baseText('runtimeCredentials.rules.error.generic');
	}
}

async function onSave(value: RuleFormValue) {
	saving.value = true;
	saveError.value = '';
	try {
		if (editingRule.value) {
			await store.editRule(editingRule.value.alias, {
				nodeType: value.nodeType,
				path: value.path,
				transform: value.transform,
				allowedDomains: value.allowedDomains === '' ? null : value.allowedDomains,
			});
			toast.showMessage({
				type: 'success',
				title: i18n.baseText('runtimeCredentials.rules.toast.updated'),
			});
		} else {
			const { allowedDomains, ...rest } = value;
			await store.addRule(allowedDomains === '' ? rest : { ...rest, allowedDomains });
			toast.showMessage({
				type: 'success',
				title: i18n.baseText('runtimeCredentials.rules.toast.added'),
			});
		}
		modalOpen.value = false;
	} catch (error) {
		saveError.value = errorMessage(error, value.alias);
	} finally {
		saving.value = false;
	}
}

async function onConfirmDelete() {
	const rule = ruleToDelete.value;
	if (!rule) return;
	deleting.value = true;
	try {
		await store.removeRule(rule.alias);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('runtimeCredentials.rules.toast.deleted'),
		});
		ruleToDelete.value = undefined;
	} catch (error) {
		toast.showError(error, errorMessage(error, rule.alias));
	} finally {
		deleting.value = false;
	}
}
</script>

<template>
	<N8nSettingsLayout>
		<N8nSettingsPageHeader
			:title="i18n.baseText('runtimeCredentials.settings.title')"
			:description="i18n.baseText('runtimeCredentials.settings.description')"
			:show-docs-link="false"
		/>

		<div :class="$style.actions">
			<N8nButton
				variant="solid"
				:label="i18n.baseText('runtimeCredentials.rules.add')"
				data-test-id="runtime-rule-add"
				@click="openAdd"
			/>
		</div>

		<N8nLoading
			v-if="store.isLoading && store.rules.length === 0"
			:rows="3"
			data-test-id="runtime-rules-loading"
		/>

		<N8nCallout v-else-if="store.hasLoadError" theme="danger" data-test-id="runtime-rules-error">
			{{ i18n.baseText('runtimeCredentials.rules.loadError') }}
			<template #trailingContent>
				<N8nButton
					variant="ghost"
					size="small"
					:label="i18n.baseText('generic.retry')"
					data-test-id="runtime-rules-retry"
					@click="store.loadRules"
				/>
			</template>
		</N8nCallout>

		<N8nEmptyState
			v-else-if="store.rules.length === 0"
			:heading="i18n.baseText('runtimeCredentials.rules.empty.title')"
			data-test-id="runtime-rules-empty"
		>
			<template #description>
				{{ i18n.baseText('runtimeCredentials.rules.empty.description') }}
			</template>
		</N8nEmptyState>

		<template v-else>
			<N8nCallout theme="warning" data-test-id="runtime-rules-warning">
				<N8nText bold>{{ i18n.baseText('runtimeCredentials.rules.warning.title') }}</N8nText>
				<N8nText>{{ i18n.baseText('runtimeCredentials.rules.warning.description') }}</N8nText>
				<N8nText bold>{{ i18n.baseText('runtimeCredentials.rules.warning.paths') }}</N8nText>
				<ul :class="$style.paths">
					<li v-for="rule in store.rules" :key="rule.alias">
						<code>{{
							i18n.baseText('runtimeCredentials.rules.warning.path', {
								interpolate: { path: rule.path, nodeType: rule.nodeType },
							})
						}}</code>
					</li>
				</ul>
			</N8nCallout>
			<RulesTable :rules="store.rules" @edit="openEdit" @delete="ruleToDelete = $event" />
		</template>

		<RuleModal
			v-model:open="modalOpen"
			:rule="editingRule"
			:saving="saving"
			:error="saveError"
			@save="onSave"
		/>

		<N8nAlertDialog
			v-model:open="deleteDialogOpen"
			:title="i18n.baseText('runtimeCredentials.rules.delete.title')"
			:description="
				i18n.baseText('runtimeCredentials.rules.delete.description', {
					interpolate: { alias: ruleToDelete?.alias ?? '' },
				})
			"
			:action-label="i18n.baseText('runtimeCredentials.rules.delete')"
			action-variant="destructive"
			:loading="deleting"
			@action="onConfirmDelete"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
.actions {
	display: flex;
	justify-content: flex-end;
	margin-block-end: var(--spacing--sm);
}

.paths {
	margin: var(--spacing--4xs) 0 0;
	padding-inline-start: var(--spacing--md);
}
</style>
