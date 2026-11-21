<script setup lang="ts">
import type { RuntimeCredentialRuleWithSource } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nTag,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { onMounted, ref } from 'vue';

import RuntimeCredentialRuleDialog from './RuntimeCredentialRuleDialog.vue';
import { ANY_TRIGGER } from './runtime-credentials.constants';
import { useRuntimeCredentialsStore } from './runtime-credentials.store';

const i18n = useI18n();
const toast = useToast();
const store = useRuntimeCredentialsStore();

const dialogOpen = ref(false);
/** The saved rule that the dialog edits. `null` adds a new rule. */
const editingRule = ref<RuntimeCredentialRuleWithSource | null>(null);

function triggerLabel(nodeType: string) {
	return nodeType === ANY_TRIGGER
		? i18n.baseText('settings.runtimeCredentials.trigger.any')
		: nodeType;
}

/** Leads with the expression, because that is what an admin copies into a credential. */
function ruleSummary(rule: RuntimeCredentialRuleWithSource) {
	const parts = [`{{ $runtimeCredentials.${rule.alias} }}`, triggerLabel(rule.nodeType), rule.path];
	if (rule.description) parts.push(rule.description);
	return parts.join(' · ');
}

function openDialog(rule: RuntimeCredentialRuleWithSource | null) {
	editingRule.value = rule;
	dialogOpen.value = true;
}

async function onDelete(alias: string) {
	try {
		await store.removeRule(alias);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.runtimeCredentials.deleted'),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.runtimeCredentials.saveError'));
	}
}

const loadFailed = ref(false);

async function loadRules() {
	loadFailed.value = false;
	try {
		await store.fetchRules();
	} catch (error) {
		loadFailed.value = true;
		toast.showError(error, i18n.baseText('settings.runtimeCredentials.loadError'));
	}
}

onMounted(loadRules);
</script>

<template>
	<N8nSettingsLayout>
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.runtimeCredentials.title')"
			:description="i18n.baseText('settings.runtimeCredentials.description')"
			:show-docs-link="false"
		/>

		<div v-if="store.loading" :class="$style.loading" data-test-id="runtime-credentials-loading">
			<N8nIcon icon="spinner" spin />
		</div>

		<N8nSettingsSection v-else>
			<template #title>
				<div :class="$style.sectionHeader">
					<div :class="$style.sectionText">
						<N8nHeading tag="h2" step="md" color="text-dark">
							{{ i18n.baseText('settings.runtimeCredentials.rules.title') }}
						</N8nHeading>
						<N8nText size="small" color="text-base">
							{{ i18n.baseText('settings.runtimeCredentials.rules.description') }}
						</N8nText>
					</div>
					<N8nButton
						variant="outline"
						icon="plus"
						:label="i18n.baseText('settings.runtimeCredentials.rules.add')"
						:disabled="store.saving || !store.loaded"
						data-test-id="runtime-credentials-add"
						data-attr="runtime-credentials-add"
						@click="openDialog(null)"
					/>
				</div>
			</template>

			<div
				v-if="loadFailed"
				:class="$style.loadError"
				data-test-id="runtime-credentials-load-error"
			>
				<N8nText color="danger" size="small">
					{{ i18n.baseText('settings.runtimeCredentials.loadError') }}
				</N8nText>
				<N8nButton
					variant="outline"
					size="small"
					:label="i18n.baseText('settings.runtimeCredentials.retry')"
					data-test-id="runtime-credentials-retry"
					@click="loadRules"
				/>
			</div>
			<N8nText
				v-else-if="store.rules.length === 0"
				color="text-light"
				size="small"
				data-test-id="runtime-credentials-empty"
			>
				{{ i18n.baseText('settings.runtimeCredentials.rules.empty') }}
			</N8nText>
			<N8nSettingsRowGroup v-else>
				<N8nSettingsRow
					v-for="rule in store.rules"
					:key="`${rule.source}-${rule.alias}`"
					:title="rule.alias"
					:description="ruleSummary(rule)"
					:data-test-id="`runtime-credentials-rule-${rule.alias}`"
				>
					<template #action>
						<div :class="$style.actions">
							<N8nTag
								v-if="rule.source === 'env'"
								:text="i18n.baseText('settings.runtimeCredentials.rules.fromEnv')"
							/>
							<template v-else>
								<N8nButton
									variant="ghost"
									size="small"
									:label="i18n.baseText('settings.runtimeCredentials.rules.edit')"
									:disabled="store.saving"
									data-test-id="runtime-credentials-edit"
									data-attr="runtime-credentials-edit"
									@click="openDialog(rule)"
								/>
								<N8nButton
									variant="ghost"
									size="small"
									:label="i18n.baseText('settings.runtimeCredentials.rules.delete')"
									:disabled="store.saving"
									data-test-id="runtime-credentials-delete"
									data-attr="runtime-credentials-delete"
									@click="onDelete(rule.alias)"
								/>
							</template>
						</div>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<RuntimeCredentialRuleDialog v-model:open="dialogOpen" :rule="editingRule" />
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
.loading {
	display: flex;
	justify-content: center;
	padding: var(--spacing--xl);
}

.sectionHeader {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.sectionText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.loadError {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
