<script setup lang="ts">
import { computed, ref } from 'vue';
import {
	N8nButton,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nDropdownMenu,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { INSTANCE_MODEL_CREDENTIAL_TYPES } from '../../constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import { useInstanceCredentialDialog } from '../../composables/useInstanceCredentialDialog';

const open = defineModel<boolean>('open', { required: true });

const props = withDefaults(defineProps<{ setup?: boolean }>(), { setup: false });

const emit = defineEmits<{ saved: [] }>();

const i18n = useI18n();
const store = useInstanceAiSettingsStore();
const credentialsStore = useCredentialsStore();

const modelName = ref('');

const { credentialId, openCreate, openEdit } = useInstanceCredentialDialog({
	open,
	current: () => store.settings?.modelCredentialId ?? '',
	hydrate: () => {
		modelName.value = store.settings?.modelName ?? '';
	},
	credentials: () => store.instanceModelCredentials,
	refresh: async () => await store.refreshInstanceModelCredentials(),
	onCreated: (credential) => selectCredential(credential.id),
});

function credentialTypeLabel(type: string) {
	return credentialsStore.getCredentialTypeByName(type)?.displayName ?? type;
}

const createItems = computed<Array<DropdownMenuItemProps<string>>>(() =>
	INSTANCE_MODEL_CREDENTIAL_TYPES.map((type) => ({ id: type, label: credentialTypeLabel(type) })),
);

const noneLabel = computed(() =>
	store.settings?.modelEnvConfigured
		? i18n.baseText('settings.n8nAgent.modelCredential.none')
		: i18n.baseText('settings.n8nAgent.modelCredential.noneNoEnv'),
);

const credentialTypeById = (id: string) =>
	store.instanceModelCredentials.find((credential) => credential.id === id)?.type;

function selectCredential(nextId: string) {
	const previousType = credentialId.value ? credentialTypeById(credentialId.value) : undefined;
	const nextType = nextId ? credentialTypeById(nextId) : undefined;
	if (nextType === undefined || previousType !== nextType) modelName.value = '';
	credentialId.value = nextId;
}

const isComplete = computed(() => !credentialId.value || modelName.value.trim().length > 0);
const isChanged = computed(
	() =>
		credentialId.value !== (store.settings?.modelCredentialId ?? '') ||
		modelName.value.trim() !== (store.settings?.modelName ?? ''),
);
const primaryDisabled = computed(() => {
	if (store.isSaving || !isComplete.value) return true;
	if (props.setup) return !isChanged.value && !credentialId.value;
	return !isChanged.value;
});

async function handlePrimary() {
	if (isChanged.value) {
		store.setField('modelCredentialId', credentialId.value || null);
		store.setField('modelName', credentialId.value ? modelName.value.trim() : null);
		if (!(await store.save())) return;
	}
	open.value = false;
	emit('saved');
}

const title = computed(() =>
	props.setup
		? i18n.baseText('settings.n8nAgent.modelDialog.setupTitle')
		: i18n.baseText('settings.n8nAgent.modelDialog.title'),
);
const description = computed(() =>
	props.setup
		? i18n.baseText('settings.n8nAgent.modelDialog.setupDescription')
		: i18n.baseText('settings.n8nAgent.modelDialog.description'),
);
</script>

<template>
	<N8nDialog v-model:open="open" size="small" data-test-id="n8n-agent-model-dialog">
		<N8nDialogHeader>
			<N8nText
				v-if="setup"
				:class="$style.step"
				size="xsmall"
				color="text-light"
				bold
				tag="p"
				data-test-id="n8n-agent-model-dialog-step"
			>
				{{ i18n.baseText('settings.n8nAgent.setup.step1') }}
			</N8nText>
			<N8nDialogTitle>{{ title }}</N8nDialogTitle>
			<N8nDialogDescription>{{ description }}</N8nDialogDescription>
		</N8nDialogHeader>

		<div :class="$style.fields">
			<N8nInputLabel :label="i18n.baseText('settings.n8nAgent.modelCredential.field')">
				<div :class="$style.credentialControls">
					<N8nSelect
						:class="$style.credentialSelect"
						:model-value="credentialId"
						size="medium"
						:disabled="store.isSaving"
						:placeholder="i18n.baseText('settings.n8nAgent.modelCredential.placeholder')"
						data-test-id="n8n-agent-model-credential-select"
						@update:model-value="selectCredential(String($event ?? ''))"
					>
						<N8nOption v-if="!setup" value="" :label="noneLabel" />
						<N8nOption
							v-for="credential in store.instanceModelCredentials"
							:key="credential.id"
							:value="credential.id"
							:label="`${credential.name} · ${credentialTypeLabel(credential.type)}`"
						/>
					</N8nSelect>

					<N8nButton
						v-if="credentialId && store.canManageInstanceCredentials"
						variant="outline"
						size="medium"
						:label="i18n.baseText('settings.n8nAgent.credentials.edit')"
						:disabled="store.isSaving"
						data-test-id="n8n-agent-model-credential-edit"
						@click="openEdit"
					/>

					<N8nDropdownMenu
						v-if="store.canManageInstanceCredentials"
						:items="createItems"
						placement="bottom-end"
						data-test-id="n8n-agent-model-credential-create"
						@select="openCreate"
					>
						<template #trigger>
							<N8nButton variant="outline" size="medium" :disabled="store.isSaving">
								{{ i18n.baseText('settings.n8nAgent.modelCredential.createNew') }}
								<N8nIcon icon="chevron-down" size="small" />
							</N8nButton>
						</template>
					</N8nDropdownMenu>
				</div>
			</N8nInputLabel>

			<N8nInputLabel
				v-if="credentialId"
				:label="i18n.baseText('settings.n8nAgent.modelName.label')"
			>
				<N8nInput
					:model-value="modelName"
					size="medium"
					:disabled="store.isSaving"
					autocomplete="off"
					:spellcheck="false"
					:placeholder="i18n.baseText('settings.n8nAgent.modelName.placeholder')"
					data-test-id="n8n-agent-model-name-input"
					@update:model-value="modelName = String($event)"
				/>
			</N8nInputLabel>
		</div>

		<N8nText :class="$style.footnote" size="small" color="text-light" tag="p">
			{{ i18n.baseText('settings.n8nAgent.modelDialog.footnote') }}
		</N8nText>

		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				size="medium"
				:label="i18n.baseText('generic.cancel')"
				data-test-id="n8n-agent-model-dialog-cancel"
				@click="open = false"
			/>
			<N8nButton
				variant="solid"
				size="medium"
				:label="
					setup ? i18n.baseText('settings.n8nAgent.setup.continue') : i18n.baseText('generic.save')
				"
				:disabled="primaryDisabled"
				data-test-id="n8n-agent-model-dialog-save"
				@click="handlePrimary"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	margin-top: var(--spacing--sm);
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

.footnote {
	margin: var(--spacing--sm) 0 0;
}

.step {
	margin: 0;
	text-transform: uppercase;
	letter-spacing: var(--letter-spacing--wide);
}
</style>
