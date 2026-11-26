<script setup lang="ts">
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { RuntimeCredentialRuleImpactDto } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import { fetchRuleImpact } from '../runtime-credentials.api';
import type {
	RuntimeCredentialRule,
	RuntimeCredentialRuleImpact,
} from '../runtime-credentials.api';
import {
	buildTransform,
	findInvalidAllowedDomain,
	normalizeAllowedDomains,
	parseTransform,
} from '../runtime-credentials.utils';
import type { TransformKind } from '../runtime-credentials.utils';

export type RuleFormValue = {
	alias: string;
	nodeType: string;
	path: string;
	credentialType: string;
	transform?: ReturnType<typeof buildTransform>;
	/** Empty string means any host. */
	allowedDomains: string;
};

const {
	open,
	rule = undefined,
	saving = false,
	error = '',
} = defineProps<{
	open: boolean;
	/** The rule to edit. Leave it out to add a rule. */
	rule?: RuntimeCredentialRule;
	saving?: boolean;
	error?: string;
}>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	save: [value: RuleFormValue];
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const alias = ref('');
const nodeType = ref('');
const path = ref('');
const credentialType = ref('');
const transformKind = ref<TransformKind>('none');
const fieldName = ref('');
const allowedDomains = ref('');

const isEdit = computed(() => rule !== undefined);

watch(
	() => [open, rule] as const,
	() => {
		if (!open) return;
		alias.value = rule?.alias ?? '';
		nodeType.value = rule?.nodeType ?? '';
		path.value = rule?.path ?? '';
		credentialType.value = rule?.credentialType ?? '';
		const parsed = parseTransform(rule?.transform);
		transformKind.value = parsed.kind;
		fieldName.value = parsed.fieldName;
		allowedDomains.value = rule?.allowedDomains ?? '';
	},
	{ immediate: true },
);

const invalidDomain = computed(() => findInvalidAllowedDomain(allowedDomains.value));

const isValid = computed(
	() =>
		alias.value.trim() !== '' &&
		nodeType.value.trim() !== '' &&
		path.value.trim() !== '' &&
		credentialType.value.trim() !== '' &&
		(transformKind.value !== 'field' || fieldName.value.trim() !== '') &&
		invalidDomain.value === undefined,
);

const showPathWarning = computed(() => nodeType.value.trim() !== '' && path.value.trim() !== '');

const IMPACT_DEBOUNCE_MS = 400;
const impact = ref<RuntimeCredentialRuleImpact | null>(null);
let impactTimer: ReturnType<typeof setTimeout> | undefined;
let impactRequest = 0;

function clearImpact() {
	clearTimeout(impactTimer);
	impactRequest++;
	impact.value = null;
}

/** On edit, only a changed node type or path removes a value, so only then check. */
watch(
	() => [open, nodeType.value.trim(), path.value.trim()] as const,
	([isOpen, type, currentPath]) => {
		clearImpact();
		if (!isOpen) return;
		if (isEdit.value && type === rule?.nodeType && currentPath === rule.path) return;
		const body = RuntimeCredentialRuleImpactDto.safeParse({ nodeType: type, path: currentPath });
		if (!body.success) return;
		const request = impactRequest;
		impactTimer = setTimeout(async () => {
			try {
				const result = await fetchRuleImpact(rootStore.restApiContext, body.data);
				// A newer input or a closed modal makes this result stale.
				if (request === impactRequest) impact.value = result;
			} catch {
				// The warning is advisory. A failed check must not block saving.
			}
		}, IMPACT_DEBOUNCE_MS);
	},
);

onBeforeUnmount(clearImpact);

const impactWorkflows = computed(() => impact.value?.workflows ?? []);

function onSave() {
	if (!isValid.value) return;
	emit('save', {
		alias: alias.value.trim(),
		nodeType: nodeType.value.trim(),
		path: path.value.trim(),
		credentialType: credentialType.value.trim(),
		transform: buildTransform(transformKind.value, fieldName.value),
		allowedDomains: normalizeAllowedDomains(allowedDomains.value),
	});
}
</script>

<template>
	<N8nDialog
		:open="open"
		:header="
			i18n.baseText(
				isEdit
					? 'runtimeCredentials.rules.modal.editTitle'
					: 'runtimeCredentials.rules.modal.addTitle',
			)
		"
		size="medium"
		@update:open="emit('update:open', $event)"
	>
		<N8nDialogBody>
			<form :class="$style.form" data-test-id="runtime-rule-form" @submit.prevent="onSave">
				<N8nCallout v-if="isEdit" theme="info" slim>
					{{ i18n.baseText('runtimeCredentials.rules.modal.cannotChange') }}
				</N8nCallout>
				<N8nInputLabel
					:label="i18n.baseText('runtimeCredentials.rules.modal.alias')"
					input-name="runtime-rule-alias"
					required
				>
					<N8nInput
						id="runtime-rule-alias"
						v-model="alias"
						:disabled="isEdit"
						:placeholder="i18n.baseText('runtimeCredentials.rules.modal.alias.placeholder')"
						data-test-id="runtime-rule-alias"
					/>
				</N8nInputLabel>
				<N8nInputLabel
					:label="i18n.baseText('runtimeCredentials.rules.modal.nodeType')"
					input-name="runtime-rule-node-type"
					required
				>
					<N8nInput
						id="runtime-rule-node-type"
						v-model="nodeType"
						:placeholder="i18n.baseText('runtimeCredentials.rules.modal.nodeType.placeholder')"
						data-test-id="runtime-rule-node-type"
					/>
				</N8nInputLabel>
				<N8nInputLabel
					:label="i18n.baseText('runtimeCredentials.rules.modal.path')"
					input-name="runtime-rule-path"
					required
				>
					<N8nInput
						id="runtime-rule-path"
						v-model="path"
						:placeholder="i18n.baseText('runtimeCredentials.rules.modal.path.placeholder')"
						data-test-id="runtime-rule-path"
					/>
				</N8nInputLabel>
				<N8nInputLabel
					:label="i18n.baseText('runtimeCredentials.rules.modal.credentialType')"
					input-name="runtime-rule-credential-type"
					required
				>
					<N8nInput
						id="runtime-rule-credential-type"
						v-model="credentialType"
						:disabled="isEdit"
						:placeholder="
							i18n.baseText('runtimeCredentials.rules.modal.credentialType.placeholder')
						"
						data-test-id="runtime-rule-credential-type"
					/>
				</N8nInputLabel>
				<N8nInputLabel
					:label="i18n.baseText('runtimeCredentials.rules.modal.transform')"
					input-name="runtime-rule-transform"
				>
					<N8nSelect v-model="transformKind" data-test-id="runtime-rule-transform">
						<N8nOption
							value="none"
							:label="i18n.baseText('runtimeCredentials.rules.transform.none')"
						/>
						<N8nOption
							value="bearer"
							:label="i18n.baseText('runtimeCredentials.rules.transform.bearer')"
						/>
						<N8nOption
							value="field"
							:label="
								i18n.baseText('runtimeCredentials.rules.transform.field', {
									interpolate: { name: '…' },
								})
							"
						/>
					</N8nSelect>
				</N8nInputLabel>
				<N8nInputLabel
					v-if="transformKind === 'field'"
					:label="i18n.baseText('runtimeCredentials.rules.modal.fieldName')"
					input-name="runtime-rule-field-name"
					required
				>
					<N8nInput
						id="runtime-rule-field-name"
						v-model="fieldName"
						:placeholder="i18n.baseText('runtimeCredentials.rules.modal.fieldName.placeholder')"
						data-test-id="runtime-rule-field-name"
					/>
				</N8nInputLabel>
				<N8nInputLabel
					:label="i18n.baseText('runtimeCredentials.rules.modal.allowedDomains')"
					input-name="runtime-rule-allowed-domains"
					:tooltip-text="i18n.baseText('runtimeCredentials.rules.modal.allowedDomains.tooltip')"
				>
					<N8nInput
						id="runtime-rule-allowed-domains"
						v-model="allowedDomains"
						:placeholder="
							i18n.baseText('runtimeCredentials.rules.modal.allowedDomains.placeholder')
						"
						data-test-id="runtime-rule-allowed-domains"
					/>
					<N8nText
						v-if="invalidDomain !== undefined"
						size="small"
						color="danger"
						data-test-id="runtime-rule-allowed-domains-error"
					>
						{{
							i18n.baseText('runtimeCredentials.rules.modal.allowedDomains.invalid', {
								interpolate: { entry: invalidDomain },
							})
						}}
					</N8nText>
					<N8nText v-else size="small" color="text-light">
						{{ i18n.baseText('runtimeCredentials.rules.modal.allowedDomains.hint') }}
					</N8nText>
					<N8nText
						size="small"
						color="text-light"
						data-test-id="runtime-rule-allowed-domains-scope"
					>
						{{ i18n.baseText('runtimeCredentials.rules.modal.allowedDomains.scope') }}
					</N8nText>
				</N8nInputLabel>
				<N8nCallout
					v-if="showPathWarning"
					theme="warning"
					slim
					data-test-id="runtime-rule-path-warning"
				>
					{{
						i18n.baseText('runtimeCredentials.rules.modal.pathWarning', {
							interpolate: { path: path.trim(), nodeType: nodeType.trim() },
						})
					}}
				</N8nCallout>
				<N8nCallout
					v-if="impactWorkflows.length > 0"
					theme="warning"
					slim
					data-test-id="runtime-rule-impact"
				>
					<div :class="$style.impact">
						<span data-test-id="runtime-rule-impact-title">
							{{
								impactWorkflows.length === 1
									? i18n.baseText('runtimeCredentials.rules.modal.impact.title.one')
									: i18n.baseText('runtimeCredentials.rules.modal.impact.title.other', {
											interpolate: { count: String(impactWorkflows.length) },
										})
							}}
						</span>
						<details>
							<summary data-test-id="runtime-rule-impact-toggle">
								{{ i18n.baseText('runtimeCredentials.rules.modal.impact.show') }}
							</summary>
							<ul :class="$style.impactList">
								<li
									v-for="workflow in impactWorkflows"
									:key="workflow.id"
									data-test-id="runtime-rule-impact-workflow"
								>
									<RouterLink :to="`/workflow/${workflow.id}`" target="_blank">
										{{ workflow.name }}
									</RouterLink>
									<span :class="$style.impactMeta">
										{{ workflow.projectName }}.
										{{
											i18n.baseText('runtimeCredentials.rules.modal.impact.nodes', {
												interpolate: { nodes: workflow.nodeNames.join(', ') },
											})
										}}
									</span>
								</li>
							</ul>
						</details>
						<span
							v-if="impact?.truncated"
							:class="$style.impactMeta"
							data-test-id="runtime-rule-impact-truncated"
						>
							{{ i18n.baseText('runtimeCredentials.rules.modal.impact.truncated') }}
						</span>
					</div>
				</N8nCallout>
				<N8nCallout v-if="error" theme="danger" slim data-test-id="runtime-rule-error">
					{{ error }}
				</N8nCallout>
			</form>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:label="i18n.baseText('generic.cancel')"
				@click="emit('update:open', false)"
			/>
			<N8nButton
				variant="solid"
				:label="i18n.baseText('runtimeCredentials.rules.modal.save')"
				:disabled="!isValid"
				:loading="saving"
				data-test-id="runtime-rule-save"
				@click="onSave"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.impact {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.impactList {
	margin: var(--spacing--2xs) 0 0;
	padding-left: var(--spacing--md);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.impactMeta {
	color: var(--color--text--tint-1);
}
</style>
