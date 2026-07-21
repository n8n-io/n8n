<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
	N8nButton,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import { useInstanceCredentialDialog } from '../../composables/useInstanceCredentialDialog';

const open = defineModel<boolean>('open', { required: true });

const props = withDefaults(defineProps<{ setup?: boolean }>(), { setup: false });

const emit = defineEmits<{ saved: []; back: [] }>();

const i18n = useI18n();
const store = useInstanceAiSettingsStore();

const savedProvider = computed(() => store.settings?.sandboxProvider ?? 'n8n-sandbox');
const selectedProvider = ref<'daytona' | 'n8n-sandbox'>(savedProvider.value);
const providerOptions = [
	{ value: 'daytona', label: 'Daytona' },
	{ value: 'n8n-sandbox', label: 'n8n Sandbox Service' },
] as const;
const credentialType = computed(() =>
	selectedProvider.value === 'daytona' ? 'daytonaApi' : 'httpHeaderAuth',
);
const credentialField = computed(() =>
	selectedProvider.value === 'daytona'
		? ('daytonaCredentialId' as const)
		: ('n8nSandboxCredentialId' as const),
);
const credentials = computed(() =>
	store.serviceCredentials.filter((credential) => credential.type === credentialType.value),
);

const { credentialId, openCreate, openEdit } = useInstanceCredentialDialog({
	open,
	current: () => store.settings?.[credentialField.value] ?? '',
	hydrate: () => {
		selectedProvider.value = savedProvider.value;
	},
	credentials: () => credentials.value,
	refresh: async () => await store.refreshCredentials(),
});

watch(selectedProvider, () => {
	credentialId.value = store.settings?.[credentialField.value] ?? '';
});

const isChanged = computed(
	() =>
		selectedProvider.value !== savedProvider.value ||
		credentialId.value !== (store.settings?.[credentialField.value] ?? ''),
);

const noneLabel = computed(() =>
	selectedProvider.value === savedProvider.value && store.settings?.sandboxEnvConfigured
		? i18n.baseText('settings.n8nAgent.modelCredential.none')
		: i18n.baseText('settings.n8nAgent.modelCredential.noneNoEnv'),
);

async function handleSave() {
	if (selectedProvider.value !== savedProvider.value) {
		store.setField('sandboxProvider', selectedProvider.value);
	}
	store.setField(credentialField.value, credentialId.value || null);
	if (!(await store.save())) return;
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
	<N8nDialog v-model:open="open" size="small" data-test-id="n8n-agent-sandbox-dialog">
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
					:disabled="store.isSaving"
					data-test-id="n8n-agent-sandbox-provider-select"
					@update:model-value="selectedProvider = $event"
				>
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

			<N8nInputLabel :label="i18n.baseText('settings.n8nAgent.sandboxCredential.label')">
				<div :class="$style.credentialControls">
					<N8nSelect
						:class="$style.credentialSelect"
						:model-value="credentialId"
						size="medium"
						:disabled="store.isSaving"
						:placeholder="i18n.baseText('settings.n8nAgent.sandboxCredential.placeholder')"
						data-test-id="n8n-agent-sandbox-credential-select"
						@update:model-value="credentialId = String($event ?? '')"
					>
						<N8nOption v-if="!setup" value="" :label="noneLabel" />
						<N8nOption
							v-for="credential in credentials"
							:key="credential.id"
							:value="credential.id"
							:label="credential.name"
						/>
					</N8nSelect>

					<N8nButton
						v-if="credentialId && store.canManageInstanceCredentials"
						variant="outline"
						size="medium"
						:label="i18n.baseText('settings.n8nAgent.credentials.edit')"
						:disabled="store.isSaving"
						data-test-id="n8n-agent-sandbox-credential-edit"
						@click="openEdit"
					/>

					<N8nButton
						v-if="store.canManageInstanceCredentials"
						variant="outline"
						size="medium"
						:label="i18n.baseText('settings.n8nAgent.modelCredential.createNew')"
						:disabled="store.isSaving"
						data-test-id="n8n-agent-sandbox-credential-create"
						@click="openCreate(credentialType)"
					/>
				</div>
				<N8nText
					v-if="selectedProvider === 'n8n-sandbox'"
					tag="p"
					:class="$style.credentialHint"
					size="small"
					color="text-light"
				>
					{{ i18n.baseText('settings.n8nAgent.sandboxCredential.n8nHeaderHint') }}
				</N8nText>
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
				:disabled="store.isSaving || !isChanged || (setup && !credentialId)"
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

.credentialControls {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.credentialSelect {
	flex: 1 1 100%;
	min-width: 0;
}

.providerHint {
	margin: var(--spacing--4xs) 0 0;
}

.credentialHint {
	margin: var(--spacing--2xs) 0 0;
}

.step {
	margin: 0;
	text-transform: uppercase;
	letter-spacing: var(--letter-spacing--wide);
}
</style>
