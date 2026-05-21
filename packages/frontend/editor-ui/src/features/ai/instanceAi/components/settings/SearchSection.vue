<script lang="ts" setup>
import { computed, watch } from 'vue';
import { N8nHeading, N8nSelect, N8nOption, N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useSettingsField } from './useSettingsField';

const CREATE_BRAVE = '__create_brave__';
const CREATE_SEARXNG = '__create_searxng__';

const i18n = useI18n();
const uiStore = useUIStore();
const { store } = useSettingsField();

const searchCredentials = computed(() =>
	store.serviceCredentials.filter((c) => c.type === 'braveSearchApi' || c.type === 'searXngApi'),
);

const selectedSearchCredentialId = computed(() => {
	if (store.draft.searchCredentialId !== undefined) return store.draft.searchCredentialId ?? '';
	return store.settings?.searchCredentialId ?? '';
});

let creatingCredential = false;

function handleSearchCredentialChange(value: string | number | boolean | null) {
	if (value === CREATE_BRAVE) {
		creatingCredential = true;
		uiStore.openNewCredential('braveSearchApi');
		return;
	}
	if (value === CREATE_SEARXNG) {
		creatingCredential = true;
		uiStore.openNewCredential('searXngApi');
		return;
	}
	store.setField('searchCredentialId', value ? String(value) : null);
}

watch(
	() => uiStore.isModalActiveById[CREDENTIAL_EDIT_MODAL_KEY],
	async (isOpen, wasOpen) => {
		if (!wasOpen || isOpen) return;
		const previousIds = new Set(searchCredentials.value.map((c) => c.id));
		await store.refreshCredentials();
		if (creatingCredential) {
			creatingCredential = false;
			const newCred = searchCredentials.value.find((c) => !previousIds.has(c.id));
			if (newCred) {
				store.setField('searchCredentialId', newCred.id);
			}
		}
	},
);
</script>

<template>
	<div :class="$style.section">
		<N8nHeading tag="h2" size="small">
			{{ i18n.baseText('instanceAi.settings.section.search') }}
		</N8nHeading>

		<N8nInputLabel
			:label="i18n.baseText('instanceAi.settings.searchCredential.label')"
			:bold="false"
			size="small"
		>
			<N8nSelect
				:model-value="selectedSearchCredentialId"
				size="small"
				:placeholder="i18n.baseText('instanceAi.settings.credential.placeholder')"
				@update:model-value="handleSearchCredentialChange"
			>
				<N8nOption value="" :label="i18n.baseText('instanceAi.settings.credential.none')" />
				<N8nOption
					v-for="cred in searchCredentials"
					:key="cred.id"
					:value="cred.id"
					:label="`${cred.name} (${cred.type === 'braveSearchApi' ? 'Brave' : 'SearXNG'})`"
				/>
				<N8nOption
					:value="CREATE_BRAVE"
					:label="i18n.baseText('instanceAi.settings.credential.createBrave')"
				/>
				<N8nOption
					:value="CREATE_SEARXNG"
					:label="i18n.baseText('instanceAi.settings.credential.createSearxng')"
				/>
			</N8nSelect>
		</N8nInputLabel>
	</div>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
</style>
