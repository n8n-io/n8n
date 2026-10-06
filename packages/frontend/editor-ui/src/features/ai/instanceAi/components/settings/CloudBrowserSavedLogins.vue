<script setup lang="ts">
/**
 * PROTOTYPE (saved logins): the user's saved logins for the cloud browser, with delete.
 * Per user, so it shows for every viewer of the settings page, admin or not. Hidden when
 * the list cannot load, e.g. when the cloud browser is not configured.
 * TBD: the copy and layout, with design (Q3.2).
 */
import {
	N8nButton,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import { onMounted, ref } from 'vue';

import {
	deleteCloudBrowserSavedLogin,
	fetchCloudBrowserSavedLogins,
	type CloudBrowserSavedLogin,
} from '../../instanceAi.api';

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const logins = ref<CloudBrowserSavedLogin[] | undefined>();
const deleting = ref<string | undefined>();

onMounted(async () => {
	try {
		logins.value = await fetchCloudBrowserSavedLogins(rootStore.restApiContext);
	} catch {
		logins.value = undefined;
	}
});

function formatDate(iso: string | undefined): string {
	return iso
		? new Date(iso).toLocaleDateString()
		: i18n.baseText('settings.n8nAgent.savedLogins.never');
}

function describe(login: CloudBrowserSavedLogin): string {
	return i18n.baseText('settings.n8nAgent.savedLogins.row', {
		interpolate: {
			saved: formatDate(login.createdAt),
			used: formatDate(login.lastUsedAt),
			region: login.region,
		},
	});
}

async function remove(login: CloudBrowserSavedLogin) {
	deleting.value = login.id;
	try {
		await deleteCloudBrowserSavedLogin(rootStore.restApiContext, login.id);
		logins.value = logins.value?.filter((l) => l.id !== login.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.n8nAgent.savedLogins.deleteFailed'));
	} finally {
		deleting.value = undefined;
	}
}
</script>

<template>
	<N8nSettingsSection
		v-if="logins"
		:title="i18n.baseText('settings.n8nAgent.savedLogins.title')"
		:description="i18n.baseText('settings.n8nAgent.savedLogins.description')"
		data-test-id="n8n-agent-saved-logins"
	>
		<N8nSettingsRowGroup>
			<N8nSettingsRow
				v-if="logins.length === 0"
				:title="i18n.baseText('settings.n8nAgent.savedLogins.empty')"
			/>
			<N8nSettingsRow
				v-for="login in logins"
				:key="login.id"
				:title="login.label"
				:description="describe(login)"
				:data-test-id="`n8n-agent-saved-login-${login.site}`"
			>
				<template #action>
					<N8nButton
						variant="outline"
						size="medium"
						:label="i18n.baseText('settings.n8nAgent.savedLogins.delete')"
						:loading="deleting === login.id"
						:disabled="deleting !== undefined"
						@click="remove(login)"
					/>
				</template>
			</N8nSettingsRow>
		</N8nSettingsRowGroup>
	</N8nSettingsSection>
</template>
