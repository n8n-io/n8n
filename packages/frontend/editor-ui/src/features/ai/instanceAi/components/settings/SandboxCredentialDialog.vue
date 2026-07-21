<script setup lang="ts">
import { computed, ref, toRaw, watch } from 'vue';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import {
	N8nButton,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { IUpdateInformation } from '@/Interface';
import { provideWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import ConnectionFields from './ConnectionFields.vue';

const DAYTONA_DEFAULT_API_URL = 'https://app.daytona.io/api';
const N8N_SANDBOX_HEADER = 'x-api-key';

const open = defineModel<boolean>('open', { required: true });

const props = withDefaults(defineProps<{ setup?: boolean }>(), { setup: false });

const emit = defineEmits<{ saved: []; back: [] }>();

const i18n = useI18n();
const store = useInstanceAiSettingsStore();
const credentialsStore = useCredentialsStore();

provideWorkflowDocumentStore();

type SandboxSelection = '' | 'daytona' | 'n8n-sandbox';

const selectedProvider = ref<SandboxSelection>('');
const fieldsData = ref<ICredentialDataDecryptedObject>({});
const apiKeyValue = ref('');
const isLoading = ref(false);

let hydratedProvider: SandboxSelection = '';
let hydratedData: ICredentialDataDecryptedObject = {};
let hydratedSnapshot = '';

const assignedProvider = computed<SandboxSelection>(() => {
	if (store.settings?.daytonaCredentialId) return 'daytona';
	if (store.settings?.n8nSandboxCredentialId) return 'n8n-sandbox';
	return '';
});
const assignedId = computed(() =>
	assignedProvider.value === 'daytona'
		? (store.settings?.daytonaCredentialId ?? null)
		: assignedProvider.value === 'n8n-sandbox'
			? (store.settings?.n8nSandboxCredentialId ?? null)
			: null,
);

const providerOptions = [
	{ value: 'daytona', label: 'Daytona' },
	{ value: 'n8n-sandbox', label: 'n8n Sandbox Service' },
] as const;

function snapshot() {
	return JSON.stringify({
		p: selectedProvider.value,
		d: fieldsData.value,
		k: apiKeyValue.value,
	});
}

function freshData(provider: SandboxSelection): ICredentialDataDecryptedObject {
	return provider === 'daytona' ? { apiUrl: DAYTONA_DEFAULT_API_URL } : {};
}

async function hydrate() {
	selectedProvider.value =
		assignedProvider.value ||
		(store.settings?.sandboxEnvConfigured ? '' : (store.settings?.sandboxProvider ?? ''));
	fieldsData.value = freshData(selectedProvider.value);
	apiKeyValue.value = '';
	if (assignedId.value) {
		isLoading.value = true;
		try {
			const credential = await credentialsStore.getCredentialData({ id: assignedId.value });
			const data = (
				credential && 'data' in credential ? (credential.data ?? {}) : {}
			) as ICredentialDataDecryptedObject;
			if (assignedProvider.value === 'n8n-sandbox') {
				apiKeyValue.value = typeof data.value === 'string' ? data.value : '';
			} else {
				fieldsData.value = data;
			}
		} catch {
			fieldsData.value = freshData(selectedProvider.value);
		} finally {
			isLoading.value = false;
		}
	}
	hydratedProvider = selectedProvider.value;
	hydratedData = { ...fieldsData.value };
	hydratedSnapshot = snapshot();
}

watch(
	open,
	async (isOpen) => {
		if (isOpen) await hydrate();
	},
	{ immediate: true },
);

function selectProvider(next: SandboxSelection) {
	if (next === selectedProvider.value) return;
	selectedProvider.value = next;
	// Switching providers starts clean; only the hydrated provider keeps its values.
	fieldsData.value = next === hydratedProvider ? { ...hydratedData } : freshData(next);
	if (next !== hydratedProvider) apiKeyValue.value = '';
}

function setFieldValue(name: string, value: IUpdateInformation['value']) {
	fieldsData.value = { ...fieldsData.value, [name]: value } as ICredentialDataDecryptedObject;
}

const noneLabel = computed(() =>
	store.settings?.sandboxEnvConfigured
		? i18n.baseText('settings.n8nAgent.modelCredential.none')
		: i18n.baseText('settings.n8nAgent.modelCredential.noneNoEnv'),
);

const readOnly = computed(() => !store.canManageInstanceCredentials);
const isComplete = computed(() =>
	selectedProvider.value === 'n8n-sandbox' ? apiKeyValue.value.trim().length > 0 : true,
);
const isChanged = computed(() => snapshot() !== hydratedSnapshot);
const saveDisabled = computed(() => {
	if (store.isSaving || isLoading.value || readOnly.value || !isComplete.value) return true;
	if (props.setup) return !isChanged.value && !selectedProvider.value;
	return !isChanged.value;
});

async function handleSave() {
	if (isChanged.value) {
		if (!selectedProvider.value) {
			store.setField('sandboxConnection', null);
		} else if (selectedProvider.value === 'daytona') {
			store.setField('sandboxConnection', {
				type: 'daytonaApi',
				data: { ...toRaw(fieldsData.value) },
			});
		} else {
			store.setField('sandboxConnection', {
				type: 'httpHeaderAuth',
				data: { name: N8N_SANDBOX_HEADER, value: apiKeyValue.value.trim() },
			});
		}
		if (!(await store.save())) return;
		void store.refreshCredentials();
	}
	open.value = false;
	emit('saved');
}

function handleBack() {
	open.value = false;
	emit('back');
}

const title = computed(() =>
	props.setup
		? i18n.baseText('settings.n8nAgent.sandboxDialog.setupTitle')
		: i18n.baseText('settings.n8nAgent.sandboxDialog.title'),
);
</script>

<template>
	<N8nDialog v-model:open="open" size="medium" data-test-id="n8n-agent-sandbox-dialog">
		<N8nDialogHeader>
			<N8nText
				v-if="setup"
				:class="$style.step"
				size="xsmall"
				color="text-light"
				bold
				tag="p"
				data-test-id="n8n-agent-sandbox-dialog-step"
			>
				{{ i18n.baseText('settings.n8nAgent.setup.step2') }}
			</N8nText>
			<N8nDialogTitle>{{ title }}</N8nDialogTitle>
			<N8nDialogDescription>
				{{ i18n.baseText('settings.n8nAgent.sandboxDialog.description') }}
			</N8nDialogDescription>
		</N8nDialogHeader>

		<div :class="$style.fields">
			<N8nInputLabel :label="i18n.baseText('settings.n8nAgent.sandboxDialog.provider')">
				<N8nSelect
					:model-value="selectedProvider"
					size="medium"
					:disabled="store.isSaving || readOnly"
					data-test-id="n8n-agent-sandbox-provider-select"
					@update:model-value="selectProvider(($event ?? '') as SandboxSelection)"
				>
					<N8nOption v-if="!setup" value="" :label="noneLabel" />
					<N8nOption
						v-for="option in providerOptions"
						:key="option.value"
						:value="option.value"
						:label="option.label"
					/>
				</N8nSelect>
				<N8nText tag="p" :class="$style.providerHint" size="small" color="text-light">
					{{ i18n.baseText('settings.n8nAgent.sandboxDialog.providerHint') }}
				</N8nText>
			</N8nInputLabel>

			<ConnectionFields
				v-if="selectedProvider === 'daytona' && !isLoading"
				credential-type="daytonaApi"
				:data="fieldsData"
				data-test-id="n8n-agent-sandbox-connection-fields"
				@update="setFieldValue"
			/>

			<N8nInputLabel
				v-if="selectedProvider === 'n8n-sandbox'"
				:label="i18n.baseText('settings.n8nAgent.sandboxCredential.apiKey')"
			>
				<N8nInput
					:model-value="apiKeyValue"
					type="password"
					size="medium"
					:disabled="store.isSaving || readOnly"
					autocomplete="off"
					data-test-id="n8n-agent-sandbox-api-key-input"
					@update:model-value="apiKeyValue = String($event)"
				/>
			</N8nInputLabel>
		</div>

		<N8nDialogFooter>
			<N8nButton
				v-if="setup"
				variant="outline"
				size="medium"
				:label="i18n.baseText('generic.back')"
				data-test-id="n8n-agent-sandbox-dialog-back"
				@click="handleBack"
			/>
			<N8nButton
				v-else
				variant="outline"
				size="medium"
				:label="i18n.baseText('generic.cancel')"
				@click="open = false"
			/>
			<N8nButton
				variant="solid"
				size="medium"
				:label="i18n.baseText('generic.save')"
				:disabled="saveDisabled"
				data-test-id="n8n-agent-sandbox-dialog-save"
				@click="handleSave"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	margin: var(--spacing--sm) 0;
}

.providerHint {
	margin: var(--spacing--4xs) 0 0;
}

.step {
	margin: 0;
	text-transform: uppercase;
	letter-spacing: var(--letter-spacing--wide);
}
</style>
