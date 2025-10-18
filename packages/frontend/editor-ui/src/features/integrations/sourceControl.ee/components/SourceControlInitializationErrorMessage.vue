<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/constants';
import { I18nT } from 'vue-i18n';

const i18n = useI18n();
</script>

<template>
	<I18nT keypath="settings.sourceControl.connection.error.message" tag="div" scope="global">
		<template #link>
			<RouterLink :to="{ name: VIEWS.SOURCE_CONTROL }">
				{{ i18n.baseText('settings.sourceControl.connection.error.link') }}
			</RouterLink>
		</template>
	</I18nT>
</template>
