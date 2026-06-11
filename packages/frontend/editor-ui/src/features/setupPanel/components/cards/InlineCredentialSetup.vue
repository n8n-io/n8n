<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import {
	N8nButton,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import type {
	ICredentialType,
	INodeProperties,
	INodePropertyOptions,
	NodeParameterValueType,
} from 'n8n-workflow';

import { useCredentialsStore } from '@/features/credentials/credentials.store';
import {
	canCreateCredentialInline,
	getInlineCredentialFields,
} from '@/features/setupPanel/setupPanel.utils';

const props = defineProps<{
	credentialType: string;
}>();

const emit = defineEmits<{
	/** A credential was created (and tested). The parent attaches it to the node(s). */
	credentialCreated: [payload: { credentialType: string; credentialId: string; name: string }];
	/** This credential type can't be created inline (e.g. OAuth) — parent should fall back. */
	unsupported: [];
	/** User chose to use the standard picker instead. */
	useExisting: [];
}>();

const i18n = useI18n();
const credentialsStore = useCredentialsStore();

type FieldValue = string | number | boolean;

const credentialType = computed<ICredentialType | null>(
	() => credentialsStore.getCredentialTypeByName(props.credentialType) ?? null,
);

const isSupported = computed(() => canCreateCredentialInline(credentialType.value ?? undefined));

// Local, in-memory only. Secret values flow straight to the encrypted credential
// store via the REST API — they are never logged and never sent to the AI builder.
const values = ref<Record<string, FieldValue>>({});

type ConnectState = 'idle' | 'connecting' | 'success' | 'error';
const connectState = ref<ConnectState>('idle');
const errorMessage = ref('');

onMounted(() => {
	if (!credentialType.value || !isSupported.value) {
		emit('unsupported');
		return;
	}
	// Seed defaults for every property so hidden/default fields are persisted on create.
	const seeded: Record<string, FieldValue> = {};
	for (const prop of credentialType.value.properties ?? []) {
		if (prop.default !== undefined && isFieldValue(prop.default)) {
			seeded[prop.name] = prop.default;
		}
	}
	values.value = seeded;
});

function isFieldValue(value: NodeParameterValueType): value is FieldValue {
	return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

const visibleFields = computed<INodeProperties[]>(() => {
	if (!credentialType.value) return [];
	return getInlineCredentialFields(credentialType.value, values.value);
});

const displayName = computed(() => credentialType.value?.displayName ?? props.credentialType);

function inputType(prop: INodeProperties): 'text' | 'password' | 'number' {
	if (prop.type === 'number') return 'number';
	if (prop.typeOptions?.password) return 'password';
	return 'text';
}

function isOption(option: unknown): option is INodePropertyOptions {
	return (
		typeof option === 'object' &&
		option !== null &&
		'name' in option &&
		'value' in option &&
		isFieldValue((option as INodePropertyOptions).value)
	);
}

function getOptions(prop: INodeProperties): INodePropertyOptions[] {
	return (prop.options ?? []).filter(isOption);
}

function stringValue(name: string): string {
	const value = values.value[name];
	return value === undefined ? '' : String(value);
}

function onStringInput(prop: INodeProperties, value: string): void {
	values.value = { ...values.value, [prop.name]: prop.type === 'number' ? Number(value) : value };
}

function onOptionSelect(prop: INodeProperties, value: FieldValue): void {
	values.value = { ...values.value, [prop.name]: value };
}

const requiredFilled = computed(() =>
	visibleFields.value
		.filter((prop) => prop.required)
		.every((prop) => {
			const value = values.value[prop.name];
			return value !== undefined && value !== '' && value !== null;
		}),
);

const canConnect = computed(
	() => requiredFilled.value && connectState.value !== 'connecting' && isSupported.value,
);

async function connect(): Promise<void> {
	if (!credentialType.value || !canConnect.value) return;

	connectState.value = 'connecting';
	errorMessage.value = '';

	try {
		const name = await credentialsStore.getNewCredentialName({
			credentialTypeName: props.credentialType,
		});

		const created = await credentialsStore.createNewCredential({
			id: '',
			name,
			type: props.credentialType,
			data: { ...values.value },
		});

		// Attach immediately so the workflow references the credential even if the
		// connection test is slow or the endpoint has no test request.
		emit('credentialCreated', {
			credentialType: props.credentialType,
			credentialId: created.id,
			name: created.name,
		});

		const testResult = await credentialsStore.testCredential({
			id: created.id,
			name: created.name,
			type: props.credentialType,
			data: { ...values.value },
		});

		if (testResult.status === 'OK') {
			connectState.value = 'success';
		} else {
			connectState.value = 'error';
			errorMessage.value =
				testResult.message ??
				i18n.baseText('setupPanel.inlineCredential.testFailed' as BaseTextKey);
		}
	} catch (error) {
		connectState.value = 'error';
		errorMessage.value =
			error instanceof Error
				? error.message
				: i18n.baseText('setupPanel.inlineCredential.createFailed' as BaseTextKey);
	}
}
</script>

<template>
	<div v-if="isSupported" :class="$style.container" data-test-id="inline-credential-setup">
		<div :class="$style.fields">
			<div v-for="prop in visibleFields" :key="prop.name" :class="$style.field">
				<N8nInputLabel :label="prop.displayName" :required="prop.required" :bold="false" size="small">
					<N8nSelect
						v-if="prop.type === 'options'"
						:model-value="values[prop.name]"
						:placeholder="prop.placeholder ?? ''"
						size="small"
						:data-test-id="`inline-credential-field-${prop.name}`"
						@update:model-value="(value: FieldValue) => onOptionSelect(prop, value)"
					>
						<N8nOption
							v-for="option in getOptions(prop)"
							:key="String(option.value)"
							:label="option.name"
							:value="option.value"
						/>
					</N8nSelect>
					<N8nInput
						v-else
						:model-value="stringValue(prop.name)"
						:type="inputType(prop)"
						:placeholder="prop.placeholder ?? ''"
						size="small"
						:data-test-id="`inline-credential-field-${prop.name}`"
						@update:model-value="(value: string) => onStringInput(prop, value)"
					/>
				</N8nInputLabel>
			</div>
		</div>

		<N8nText :class="$style.privacyNote" size="xsmall" color="text-light">
			<N8nIcon icon="lock" size="xsmall" />
			{{ i18n.baseText('setupPanel.inlineCredential.privacyNote' as BaseTextKey) }}
		</N8nText>

		<div v-if="connectState === 'error'" :class="$style.error" data-test-id="inline-credential-error">
			<N8nIcon icon="triangle-alert" size="xsmall" />
			<N8nText size="xsmall" color="danger">{{ errorMessage }}</N8nText>
		</div>

		<div :class="$style.actions">
			<N8nButton
				v-if="connectState !== 'success'"
				type="primary"
				size="small"
				:loading="connectState === 'connecting'"
				:disabled="!canConnect"
				data-test-id="inline-credential-connect"
				:label="
					i18n.baseText('setupPanel.inlineCredential.connect' as BaseTextKey, {
						interpolate: { service: displayName },
					})
				"
				@click="connect"
			/>
			<N8nText
				v-else
				:class="$style.success"
				size="small"
				color="success"
				data-test-id="inline-credential-success"
			>
				<N8nIcon icon="check" size="small" />
				{{
					i18n.baseText('setupPanel.inlineCredential.connected' as BaseTextKey, {
						interpolate: { service: displayName },
					})
				}}
			</N8nText>

			<N8nButton
				v-if="connectState !== 'success'"
				variant="ghost"
				size="small"
				data-test-id="inline-credential-use-existing"
				:label="i18n.baseText('setupPanel.inlineCredential.useExisting' as BaseTextKey)"
				@click="emit('useExisting')"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.field {
	display: flex;
	flex-direction: column;
}

.privacyNote {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.error {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.success {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
</style>
