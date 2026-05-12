<script lang="ts" setup>
import { computed, watch } from 'vue';
import {
	N8nHeading,
	N8nInput,
	N8nInputNumber,
	N8nSelect,
	N8nOption,
	N8nInputLabel,
} from '@n8n/design-system';
import { ElSwitch } from 'element-plus';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useSettingsField } from './useSettingsField';

const CREATE_NEW = '__create__';

const i18n = useI18n();
const uiStore = useUIStore();
const { store, getString, getNumber, getBool } = useSettingsField();

const provider = computed(() => {
	return store.draft.sandboxProvider ?? store.settings?.sandboxProvider ?? 'daytona';
});

const showDaytonaFields = computed(() => {
	return provider.value === 'daytona';
});

const showN8nSandboxFields = computed(() => {
	return provider.value === 'n8n-sandbox';
});

const showImageField = computed(() => {
	return provider.value === 'daytona';
});

const daytonaCredentials = computed(() =>
	store.serviceCredentials.filter((c) => c.type === 'daytonaApi'),
);

const n8nSandboxCredentials = computed(() =>
	store.serviceCredentials.filter((c) => c.type === 'httpHeaderAuth'),
);

const selectedDaytonaCredentialId = computed(() => {
	if (store.draft.daytonaCredentialId !== undefined) return store.draft.daytonaCredentialId ?? '';
	return store.settings?.daytonaCredentialId ?? '';
});

const selectedN8nSandboxCredentialId = computed(() => {
	if (store.draft.n8nSandboxCredentialId !== undefined) {
		return store.draft.n8nSandboxCredentialId ?? '';
	}
	return store.settings?.n8nSandboxCredentialId ?? '';
});

let creatingCredential = false;
let creatingCredentialType: 'daytonaApi' | 'httpHeaderAuth' | null = null;

function handleDaytonaCredentialChange(value: string | number | boolean | null) {
	if (value === CREATE_NEW) {
		creatingCredential = true;
		creatingCredentialType = 'daytonaApi';
		uiStore.openNewCredential('daytonaApi');
		return;
	}
	store.setField('daytonaCredentialId', value ? String(value) : null);
}

function handleN8nSandboxCredentialChange(value: string | number | boolean | null) {
	if (value === CREATE_NEW) {
		creatingCredential = true;
		creatingCredentialType = 'httpHeaderAuth';
		uiStore.openNewCredential('httpHeaderAuth');
		return;
	}
	store.setField('n8nSandboxCredentialId', value ? String(value) : null);
}

// Re-fetch credentials when the credential edit modal closes, auto-select if newly created
watch(
	() => uiStore.isModalActiveById[CREDENTIAL_EDIT_MODAL_KEY],
	async (isOpen, wasOpen) => {
		if (!wasOpen || isOpen) return;
		const previousIds = new Set(daytonaCredentials.value.map((c) => c.id));
		const previousSandboxIds = new Set(n8nSandboxCredentials.value.map((c) => c.id));
		await store.refreshCredentials();
		if (creatingCredential) {
			creatingCredential = false;
			if (creatingCredentialType === 'daytonaApi') {
				const newCred = daytonaCredentials.value.find((c) => !previousIds.has(c.id));
				if (newCred) {
					store.setField('daytonaCredentialId', newCred.id);
				}
			}
			if (creatingCredentialType === 'httpHeaderAuth') {
				const newCred = n8nSandboxCredentials.value.find((c) => !previousSandboxIds.has(c.id));
				if (newCred) {
					store.setField('n8nSandboxCredentialId', newCred.id);
				}
			}
			creatingCredentialType = null;
		}
	},
);
</script>

<template>
	<div :class="$style.section">
		<N8nHeading tag="h2" size="small">
			{{ i18n.baseText('instanceAi.settings.section.sandbox') }}
		</N8nHeading>

		<div :class="$style.switchRow">
			<span :class="$style.switchLabel">{{
				i18n.baseText('instanceAi.settings.sandboxEnabled.label')
			}}</span>
			<ElSwitch
				:model-value="getBool('sandboxEnabled')"
				@update:model-value="store.setField('sandboxEnabled', Boolean($event))"
			/>
		</div>

		<N8nInputLabel
			:label="i18n.baseText('instanceAi.settings.sandboxProvider.label')"
			:bold="false"
			size="small"
		>
			<N8nSelect
				:model-value="provider"
				size="small"
				@update:model-value="store.setField('sandboxProvider', String($event))"
			>
				<N8nOption value="daytona" label="Daytona" />
				<N8nOption value="n8n-sandbox" label="n8n Sandbox Service" />
				<N8nOption value="local" label="Local" />
			</N8nSelect>
		</N8nInputLabel>

		<template v-if="showDaytonaFields">
			<N8nInputLabel
				:label="i18n.baseText('instanceAi.settings.daytonaCredential.label')"
				:bold="false"
				size="small"
			>
				<N8nSelect
					:model-value="selectedDaytonaCredentialId"
					size="small"
					:placeholder="i18n.baseText('instanceAi.settings.credential.placeholder')"
					@update:model-value="handleDaytonaCredentialChange"
				>
					<N8nOption value="" :label="i18n.baseText('instanceAi.settings.credential.none')" />
					<N8nOption
						v-for="cred in daytonaCredentials"
						:key="cred.id"
						:value="cred.id"
						:label="cred.name"
					/>
					<N8nOption
						:value="CREATE_NEW"
						:label="i18n.baseText('instanceAi.settings.credential.createNew')"
					/>
				</N8nSelect>
			</N8nInputLabel>
		</template>

		<template v-if="showN8nSandboxFields">
			<N8nInputLabel
				:label="i18n.baseText('instanceAi.settings.n8nSandboxCredential.label' as BaseTextKey)"
				:bold="false"
				size="small"
			>
				<N8nSelect
					:model-value="selectedN8nSandboxCredentialId"
					size="small"
					:placeholder="i18n.baseText('instanceAi.settings.credential.placeholder')"
					@update:model-value="handleN8nSandboxCredentialChange"
				>
					<N8nOption value="" :label="i18n.baseText('instanceAi.settings.credential.none')" />
					<N8nOption
						v-for="cred in n8nSandboxCredentials"
						:key="cred.id"
						:value="cred.id"
						:label="cred.name"
					/>
					<N8nOption
						:value="CREATE_NEW"
						:label="i18n.baseText('instanceAi.settings.credential.createNew')"
					/>
				</N8nSelect>
			</N8nInputLabel>
		</template>

		<N8nInputLabel
			v-if="showImageField"
			:label="i18n.baseText('instanceAi.settings.sandboxImage.label')"
			:bold="false"
			size="small"
		>
			<N8nInput
				:model-value="getString('sandboxImage')"
				size="small"
				@update:model-value="store.setField('sandboxImage', $event)"
			/>
		</N8nInputLabel>

		<N8nInputLabel
			:label="i18n.baseText('instanceAi.settings.sandboxTimeout.label')"
			:bold="false"
			size="small"
		>
			<N8nInputNumber
				:class="$style.numberInput"
				:model-value="getNumber('sandboxTimeout') ?? 300000"
				size="small"
				:min="0"
				:step="10000"
				@update:model-value="store.setField('sandboxTimeout', $event ?? 300000)"
			/>
		</N8nInputLabel>
	</div>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.numberInput {
	max-width: 140px;
}

.switchRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--4xs) 0;
}

.switchLabel {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}
</style>
