<script setup lang="ts">
import {
	runtimeCredentialAliasSchema,
	type RuntimeCredentialRuleImpact,
	type RuntimeCredentialRuleWithSource,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nTag,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

import { getRuntimeCredentialRuleImpact } from './runtime-credentials.api';

import { ANY_TRIGGER, SUGGESTED_TRIGGER_TYPES } from './runtime-credentials.constants';
import { useRuntimeCredentialsStore } from './runtime-credentials.store';

const i18n = useI18n();
const toast = useToast();
const store = useRuntimeCredentialsStore();

const emptyForm = () => ({ alias: '', nodeType: ANY_TRIGGER, path: '', description: '' });
const form = reactive(emptyForm());
/** The alias of the saved rule that the form edits. `null` adds a new rule. */
const editingAlias = ref<string | null>(null);

const aliasError = computed(() => {
	if (!form.alias) return '';
	const result = runtimeCredentialAliasSchema.safeParse(form.alias);
	return result.success ? '' : i18n.baseText('settings.runtimeCredentials.form.alias.invalid');
});

const IMPACT_DEBOUNCE_MS = 400;
const impact = ref<RuntimeCredentialRuleImpact | null>(null);
let impactTimer: ReturnType<typeof setTimeout> | undefined;
let impactRequest = 0;

async function loadImpact(nodeType: string, path: string) {
	const request = ++impactRequest;
	try {
		const result = await getRuntimeCredentialRuleImpact(
			useRootStore().restApiContext,
			nodeType,
			path,
		);
		if (request === impactRequest) impact.value = result;
	} catch {
		if (request === impactRequest) impact.value = null;
	}
}

watch(
	() => [form.nodeType, form.path.trim()] as const,
	([nodeType, path]) => {
		clearTimeout(impactTimer);
		impact.value = null;
		if (!nodeType || !path) return;
		impactTimer = setTimeout(async () => await loadImpact(nodeType, path), IMPACT_DEBOUNCE_MS);
	},
);

onBeforeUnmount(() => clearTimeout(impactTimer));

const impactText = computed(() => {
	if (!impact.value || impact.value.count === 0) return '';
	return i18n.baseText('settings.runtimeCredentials.form.impact', {
		interpolate: {
			count: String(impact.value.count),
			workflows: impact.value.workflows.map(({ name }) => name).join(', '),
		},
	});
});

const canSubmit = computed(
	() => form.alias !== '' && !aliasError.value && form.nodeType !== '' && form.path.trim() !== '',
);

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

function startEdit(rule: RuntimeCredentialRuleWithSource) {
	editingAlias.value = rule.alias;
	Object.assign(form, {
		alias: rule.alias,
		nodeType: rule.nodeType,
		path: rule.path,
		description: rule.description ?? '',
	});
}

function resetForm() {
	editingAlias.value = null;
	Object.assign(form, emptyForm());
}

async function onSubmit() {
	if (!canSubmit.value) return;
	const description = form.description.trim();
	try {
		await store.upsertRule(
			{
				alias: form.alias,
				nodeType: form.nodeType,
				path: form.path.trim(),
				...(description ? { description } : {}),
			},
			editingAlias.value ?? undefined,
		);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.runtimeCredentials.saved'),
		});
		resetForm();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.runtimeCredentials.saveError'));
	}
}

async function onDelete(alias: string) {
	try {
		await store.removeRule(alias);
		if (editingAlias.value === alias) resetForm();
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.runtimeCredentials.deleted'),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.runtimeCredentials.saveError'));
	}
}

onMounted(async () => {
	try {
		await store.fetchRules();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.runtimeCredentials.loadError'));
	}
});
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

		<template v-else>
			<N8nSettingsSection
				:title="i18n.baseText('settings.runtimeCredentials.rules.title')"
				:description="i18n.baseText('settings.runtimeCredentials.rules.description')"
			>
				<N8nText
					v-if="store.rules.length === 0"
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
										@click="startEdit(rule)"
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

			<N8nSettingsSection
				:title="
					editingAlias
						? i18n.baseText('settings.runtimeCredentials.form.editTitle')
						: i18n.baseText('settings.runtimeCredentials.form.addTitle')
				"
			>
				<form
					:class="$style.form"
					data-test-id="runtime-credentials-form"
					@submit.prevent="onSubmit"
				>
					<N8nInputLabel
						:label="i18n.baseText('settings.runtimeCredentials.form.alias.label')"
						:bold="false"
					>
						<N8nInput
							v-model="form.alias"
							:placeholder="i18n.baseText('settings.runtimeCredentials.form.alias.placeholder')"
							data-test-id="runtime-credentials-alias"
						/>
					</N8nInputLabel>
					<N8nText v-if="aliasError" color="danger" size="small">{{ aliasError }}</N8nText>

					<N8nInputLabel
						:label="i18n.baseText('settings.runtimeCredentials.form.trigger.label')"
						:bold="false"
					>
						<N8nSelect
							v-model="form.nodeType"
							filterable
							allow-create
							:teleported="false"
							data-test-id="runtime-credentials-trigger"
						>
							<N8nOption
								v-for="nodeType in SUGGESTED_TRIGGER_TYPES"
								:key="nodeType"
								:value="nodeType"
								:label="triggerLabel(nodeType)"
							/>
						</N8nSelect>
					</N8nInputLabel>

					<N8nInputLabel
						:label="i18n.baseText('settings.runtimeCredentials.form.path.label')"
						:bold="false"
					>
						<N8nInput
							v-model="form.path"
							:placeholder="i18n.baseText('settings.runtimeCredentials.form.path.placeholder')"
							data-test-id="runtime-credentials-path"
						/>
					</N8nInputLabel>
					<N8nText
						v-if="impactText"
						color="warning"
						size="small"
						data-test-id="runtime-credentials-impact"
					>
						{{ impactText }}
					</N8nText>

					<N8nInputLabel
						:label="i18n.baseText('settings.runtimeCredentials.form.description.label')"
						:bold="false"
					>
						<N8nInput v-model="form.description" data-test-id="runtime-credentials-description" />
					</N8nInputLabel>

					<div :class="$style.formActions">
						<N8nButton
							v-if="editingAlias"
							variant="ghost"
							:label="i18n.baseText('settings.runtimeCredentials.form.cancel')"
							@click="resetForm"
						/>
						<N8nButton
							type="submit"
							:label="
								editingAlias
									? i18n.baseText('settings.runtimeCredentials.form.save')
									: i18n.baseText('settings.runtimeCredentials.form.add')
							"
							:disabled="!canSubmit"
							:loading="store.saving"
							data-test-id="runtime-credentials-submit"
							data-attr="runtime-credentials-submit"
						/>
					</div>
				</form>
			</N8nSettingsSection>
		</template>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
.loading {
	display: flex;
	justify-content: center;
	padding: var(--spacing--xl);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	max-width: 480px;
}

.formActions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
