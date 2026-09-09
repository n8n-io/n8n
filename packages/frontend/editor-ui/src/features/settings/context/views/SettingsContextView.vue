<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import {
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowConfigure,
	N8nSettingsRowGroup,
} from '@n8n/design-system';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { VIEWS } from '@/app/constants';

import { useContextStore } from '../context.store';

const i18n = useI18n();
const router = useRouter();
const documentTitle = useDocumentTitle();
const contextStore = useContextStore();

const preferenceCount = computed(() =>
	i18n.baseText('settings.context.preferences.count', {
		interpolate: { count: contextStore.count },
		adjustToNumber: contextStore.count,
	}),
);

async function openPreferences() {
	await router.push({ name: VIEWS.SETTINGS_CONTEXT_PREFERENCES });
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.context.title'));
	await contextStore.fetchPreferenceCount();
});
</script>

<template>
	<N8nSettingsLayout :class="$style.layout" data-test-id="settings-context-view">
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.context.title')"
			:description="i18n.baseText('settings.context.description')"
			:show-docs-link="false"
		/>

		<N8nSettingsRowGroup>
			<N8nSettingsRow
				clickable
				:title="i18n.baseText('settings.context.preferences.title')"
				:description="i18n.baseText('settings.context.preferences.subtitle')"
				data-test-id="settings-context-preferences-row"
				@click="openPreferences"
			>
				<template #action>
					<N8nSettingsRowConfigure :value="preferenceCount" />
				</template>
			</N8nSettingsRow>

			<N8nSettingsRow
				:title="i18n.baseText('settings.context.skills.title')"
				:description="i18n.baseText('settings.context.comingSoon')"
				data-test-id="settings-context-skills-row"
			/>

			<N8nSettingsRow
				:title="i18n.baseText('settings.context.sources.title')"
				:description="i18n.baseText('settings.context.comingSoon')"
				data-test-id="settings-context-sources-row"
			/>
		</N8nSettingsRowGroup>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
/* Collapse the layout's own top inset; the settings shell already pads the page top. */
.layout {
	padding-top: 0;
}
</style>
