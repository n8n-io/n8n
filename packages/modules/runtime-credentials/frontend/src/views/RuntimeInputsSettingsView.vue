<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nAlertDialog,
	N8nButton,
	N8nCallout,
	N8nLoading,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import EmptyRules from '../components/EmptyRules.vue';
import RuleDetailDialog from '../components/RuleDetailDialog.vue';
import RuleWizard from '../components/RuleWizard.vue';
import type { RuleDraft, RuleFormValue, WizardError } from '../components/RuleWizard.vue';
import RulesList from '../components/RulesList.vue';
import RulesSummaryStrip from '../components/RulesSummaryStrip.vue';
import type { RuntimeCredentialRule } from '../runtime-credentials.api';
import { findTemplate } from '../runtime-credentials.presets';
import type { RuleTemplateId } from '../runtime-credentials.presets';
import { useRuntimeCredentialsStore } from '../runtime-credentials.store';
import { getHttpStatus, stepForServerReason } from '../runtime-credentials.utils';
import type { WizardStepId } from '../runtime-credentials.utils';

const i18n = useI18n();
const toast = useToast();
const store = useRuntimeCredentialsStore();
const route = useRoute();
const router = useRouter();

const wizardOpen = ref(false);
const editingRule = ref<RuntimeCredentialRule>();
const wizardDraft = ref<RuleDraft>();
const wizardStep = ref<WizardStepId>('source');
const saving = ref(false);
const saveError = ref<WizardError>();

const detailRule = ref<RuntimeCredentialRule>();
const detailOpen = computed({
	get: () => detailRule.value !== undefined,
	set: (open) => {
		if (!open) closeDetail();
	},
});

const ruleToDelete = ref<RuntimeCredentialRule>();
const deleting = ref(false);

const deleteDialogOpen = computed({
	get: () => ruleToDelete.value !== undefined,
	set: (open) => {
		if (!open) ruleToDelete.value = undefined;
	},
});

const aliases = computed(() => store.rules.map((rule) => rule.alias));

const ready = ref(false);

onMounted(async () => {
	void store.loadCatalogs();
	await store.loadRules();
	ready.value = true;
});

/** Removes the deep link parameters, so a reload does not open the wizard again. */
async function clearDeepLink() {
	if (route.query.rule === undefined && route.query.new === undefined) return;
	const query = { ...route.query };
	delete query.rule;
	delete query.new;
	await router.replace({ query });
}

function openAdd() {
	editingRule.value = undefined;
	wizardDraft.value = undefined;
	wizardStep.value = 'source';
	saveError.value = undefined;
	wizardOpen.value = true;
}

function openTemplate(id: RuleTemplateId) {
	const template = findTemplate(id);
	if (!template) return;
	editingRule.value = undefined;
	wizardDraft.value = template;
	wizardStep.value = 'source';
	saveError.value = undefined;
	wizardOpen.value = true;
}

function openEdit(rule: RuntimeCredentialRule, step: WizardStepId = 'source') {
	if (rule.source === 'environment') {
		openView(rule);
		return;
	}
	editingRule.value = rule;
	wizardDraft.value = undefined;
	wizardStep.value = step;
	saveError.value = undefined;
	wizardOpen.value = true;
}

function openDuplicate(rule: RuntimeCredentialRule) {
	editingRule.value = undefined;
	wizardDraft.value = {
		alias: `${rule.alias}-copy`,
		nodeType: rule.nodeType,
		path: rule.path,
		credentialType: rule.credentialType,
		transform: rule.transform,
		allowedDomains: rule.allowedDomains,
	};
	wizardStep.value = 'source';
	saveError.value = undefined;
	wizardOpen.value = true;
}

function openView(rule: RuntimeCredentialRule) {
	detailRule.value = rule;
}

function closeDetail() {
	detailRule.value = undefined;
	void clearDeepLink();
}

function onWizardOpenChange(open: boolean) {
	wizardOpen.value = open;
	if (!open) void clearDeepLink();
}

// A link such as `?rule=alias` or `?new=gmail` opens the matching dialog once the rules load.
watch(
	() => [ready.value, route.query.rule, route.query.new] as const,
	([isReady, ruleAlias, templateId]) => {
		if (!isReady || wizardOpen.value || detailRule.value) return;
		if (typeof ruleAlias === 'string') {
			const rule = store.rules.find(({ alias }) => alias === ruleAlias);
			if (rule) openEdit(rule);
			else void clearDeepLink();
		} else if (typeof templateId === 'string') {
			if (findTemplate(templateId)) openTemplate(templateId as RuleTemplateId);
			else void clearDeepLink();
		}
	},
);

function errorFor(error: unknown, alias: string): WizardError {
	switch (getHttpStatus(error)) {
		case 409:
			return {
				message: i18n.baseText('runtimeCredentials.rules.error.duplicate', {
					interpolate: { alias },
				}),
			};
		case 400: {
			// Show the reason from the server when it is short and readable, for example an unsafe path.
			const reason = error instanceof Error ? error.message.trim() : '';
			const readable = reason.length > 0 && reason.length <= 160 && !/^[[{]/.test(reason);
			return readable
				? {
						step: stepForServerReason(reason),
						message: i18n.baseText('runtimeCredentials.rules.error.invalidWithReason', {
							interpolate: { reason },
						}),
					}
				: { message: i18n.baseText('runtimeCredentials.rules.error.invalid') };
		}
		case 403:
			return { message: i18n.baseText('runtimeCredentials.rules.error.forbidden') };
		default:
			return { message: i18n.baseText('runtimeCredentials.rules.error.generic') };
	}
}

async function onSave(value: RuleFormValue) {
	saving.value = true;
	saveError.value = undefined;
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
		onWizardOpenChange(false);
	} catch (error) {
		saveError.value = errorFor(error, value.alias);
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
		toast.showError(error, errorFor(error, rule.alias).message);
	} finally {
		deleting.value = false;
	}
}
</script>

<template>
	<N8nSettingsLayout data-test-id="runtime-inputs-view">
		<N8nSettingsPageHeader
			:title="i18n.baseText('runtimeCredentials.settings.title')"
			:description="i18n.baseText('runtimeCredentials.settings.description')"
			:show-docs-link="false"
		>
			<template #titleTrailing>
				<N8nButton
					variant="solid"
					icon="plus"
					:label="i18n.baseText('runtimeCredentials.rules.add')"
					data-test-id="runtime-rule-add"
					@click="openAdd"
				/>
			</template>
		</N8nSettingsPageHeader>

		<N8nLoading
			v-if="!ready || (store.isLoading && store.rules.length === 0)"
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

		<EmptyRules v-else-if="store.rules.length === 0" @template="openTemplate" @scratch="openAdd" />

		<template v-else>
			<RulesSummaryStrip :rules="store.rules" />
			<RulesList
				:rules="store.rules"
				@edit="openEdit"
				@view="openView"
				@duplicate="openDuplicate"
				@delete="ruleToDelete = $event"
			/>
			<N8nCallout theme="warning" slim data-test-id="runtime-rules-warning">
				<div :class="$style.warning">
					<N8nText bold>{{ i18n.baseText('runtimeCredentials.rules.warning.title') }}</N8nText>
					<N8nText>{{ i18n.baseText('runtimeCredentials.rules.warning.description') }}</N8nText>
					<details>
						<summary>{{ i18n.baseText('runtimeCredentials.rules.warning.paths') }}</summary>
						<ul :class="$style.paths">
							<li v-for="rule in store.rules" :key="rule.alias">
								<code>{{
									i18n.baseText('runtimeCredentials.rules.warning.path', {
										interpolate: { path: rule.path, nodeType: rule.nodeType },
									})
								}}</code>
							</li>
						</ul>
					</details>
				</div>
			</N8nCallout>
		</template>

		<RuleWizard
			:open="wizardOpen"
			:rule="editingRule"
			:draft="wizardDraft"
			:initial-step="wizardStep"
			:existing-aliases="aliases"
			:saving="saving"
			:error="saveError"
			@update:open="onWizardOpenChange"
			@save="onSave"
		/>

		<RuleDetailDialog v-model:open="detailOpen" :rule="detailRule" />

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
.warning {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.paths {
	margin: var(--spacing--4xs) 0 0;
	padding-inline-start: var(--spacing--md);
}
</style>
