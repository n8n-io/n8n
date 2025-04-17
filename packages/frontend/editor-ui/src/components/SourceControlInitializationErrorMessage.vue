<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';
import { RouterLink } from 'vue-router';
import { VIEWS } from '@/constants';

const i18n = useI18n();
</script>

<template>
	<i18n-t keypath="settings.sourceControl.connection.error.message" tag="div">
		<template #link>
			<RouterLink :to="{ name: VIEWS.SOURCE_CONTROL }">
				{{ i18n.baseText('settings.sourceControl.connection.error.link') }}
			</RouterLink>
		</template>
	</i18n-t>
</template>
