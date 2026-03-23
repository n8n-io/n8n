<script lang="ts" setup>
import { computed, watch } from 'vue';
import {
	N8nIcon,
	N8nInput,
	N8nInputNumber,
	N8nSelect,
	N8nOption,
	N8nInputLabel,
} from '@n8n/design-system';
import { ElSwitch } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useSettingsField } from './useSettingsField';

const CREATE_NEW = '__create__';

const i18n = useI18n();
const uiStore = useUIStore();
const { store, getString, getNumber, getBool } = useSettingsField();

const showDaytonaFields = computed(() => {
	const provider = store.draft.sandboxProvider ?? store.settings?.sandboxProvider ?? 'daytona';
	return provider === 'daytona';
});

const daytonaCredentials = computed(() =>
	store.serviceCredentials.filter((c) => c.type === 'daytonaApi'),
);

const selectedDaytonaCredentialId = computed(() => {
	if (store.draft.daytonaCredentialId !== undefined) return store.draft.daytonaCredentialId ?? '';
	return store.settings?.daytonaCredentialId ?? '';
});

let creatingCredential = false;

function handleDaytonaCredentialChange(value: string | number | boolean | null) {
	if (value === CREATE_NEW) {
		creatingCredential = true;
		uiStore.openNewCredential('daytonaApi');
		return;
	}
	store.setField('daytonaCredentialId', value ? String(value) : null);
}

// Re-fetch credentials when the credential edit modal closes, auto-select if newly created
watch(
	() => uiStore.isModalActiveById[CREDENTIAL_EDIT_MODAL_KEY],
	async (isOpen, wasOpen) => {
		if (!wasOpen || isOpen) return;
		const previousIds = new Set(daytonaCredentials.value.map((c) => c.id));
		await store.refreshCredentials();
		if (creatingCredential) {
			creatingCredential = false;
			const newCred = daytonaCredentials.value.find((c) => !previousIds.has(c.id));
			if (newCred) {
				store.setField('daytonaCredentialId', newCred.id);
			}
		}
	},
);
</script>

<template>
	<div :class="$style.section">
		<div :class="$style.sectionHeader">
			<N8nIcon icon="box" size="small" />
			{{ i18n.baseText('instanceAi.settings.section.sandbox') }}
		</div>

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
				:model-value="getString('sandboxProvider') || 'daytona'"
				size="small"
				@update:model-value="store.setField('sandboxProvider', String($event))"
			>
				<N8nOption value="daytona" label="Daytona" />
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

		<N8nInputLabel
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

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--text-color);
	padding-bottom: var(--spacing--4xs);
	border-bottom: var(--border);
}

.switchRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--4xs) 0;
}

.switchLabel {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
}
</style>
