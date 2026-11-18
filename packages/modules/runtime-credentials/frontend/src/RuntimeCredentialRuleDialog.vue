<script setup lang="ts">
import {
	runtimeCredentialAliasSchema,
	type RuntimeCredentialRuleImpact,
	type RuntimeCredentialRuleWithSource,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';

import { getRuntimeCredentialRuleImpact } from './runtime-credentials.api';
import { ANY_TRIGGER, SUGGESTED_TRIGGER_TYPES } from './runtime-credentials.constants';
import { useRuntimeCredentialsStore } from './runtime-credentials.store';

const props = defineProps<{
	/** The saved rule to edit. `null` adds a new rule. */
	rule: RuntimeCredentialRuleWithSource | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const i18n = useI18n();
const toast = useToast();
const store = useRuntimeCredentialsStore();

const emptyForm = () => ({ alias: '', nodeType: ANY_TRIGGER, path: '', description: '' });
const form = reactive(emptyForm());
const isEditing = computed(() => props.rule !== null);

watch(open, (isOpen) => {
	if (!isOpen) return;
	Object.assign(
		form,
		props.rule
			? {
					alias: props.rule.alias,
					nodeType: props.rule.nodeType,
					path: props.rule.path,
					description: props.rule.description ?? '',
				}
			: emptyForm(),
	);
});

const aliasError = computed(() => {
	if (!form.alias) return '';
	const result = runtimeCredentialAliasSchema.safeParse(form.alias);
	return result.success ? '' : i18n.baseText('settings.runtimeCredentials.form.alias.invalid');
});

const aliasHint = computed(() =>
	i18n.baseText('settings.runtimeCredentials.form.alias.hint', {
		interpolate: { expression: `{{ $runtimeCredentials.${form.alias || 'alias'} }}` },
	}),
);

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
	() => [open.value, form.nodeType, form.path.trim()] as const,
	([isOpen, nodeType, path]) => {
		clearTimeout(impactTimer);
		impact.value = null;
		if (!isOpen || !nodeType || !path) return;
		// The saved rule already removes its own field, so only a changed field can break workflows.
		if (props.rule && props.rule.nodeType === nodeType && props.rule.path === path) return;
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
			props.rule?.alias,
		);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.runtimeCredentials.saved'),
		});
		open.value = false;
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.runtimeCredentials.saveError'));
	}
}
</script>

<template>
	<N8nDialog
		v-model:open="open"
		size="medium"
		:header="
			isEditing
				? i18n.baseText('settings.runtimeCredentials.form.editTitle')
				: i18n.baseText('settings.runtimeCredentials.form.addTitle')
		"
		data-test-id="runtime-credentials-dialog"
	>
		<form :class="$style.form" data-test-id="runtime-credentials-form" @submit.prevent="onSubmit">
			<N8nDialogBody>
				<N8nDialogDescription>
					{{ i18n.baseText('settings.runtimeCredentials.form.description') }}
				</N8nDialogDescription>

				<div :class="$style.fields">
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
					<N8nText v-else color="text-light" size="small">
						{{ aliasHint }}
					</N8nText>

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
				</div>
			</N8nDialogBody>

			<N8nDialogFooter>
				<N8nButton
					variant="ghost"
					:label="i18n.baseText('settings.runtimeCredentials.form.cancel')"
					data-test-id="runtime-credentials-cancel"
					@click="open = false"
				/>
				<N8nButton
					type="submit"
					:label="
						isEditing
							? i18n.baseText('settings.runtimeCredentials.form.save')
							: i18n.baseText('settings.runtimeCredentials.form.add')
					"
					:disabled="!canSubmit"
					:loading="store.saving"
					data-test-id="runtime-credentials-submit"
					data-attr="runtime-credentials-submit"
				/>
			</N8nDialogFooter>
		</form>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: contents;
}

.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--sm);
}
</style>
