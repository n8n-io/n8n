<script lang="ts" setup>
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon } from '@n8n/design-system';

import { VIEWS } from '@/app/constants';

const i18n = useI18n();
const router = useRouter();

async function goBack() {
	await router.push({ name: VIEWS.AUTHENTICATION_SETTINGS });
}
</script>

<template>
	<!-- The SSO and LDAP pages predate N8nSettingsLayout; this mirrors its back action. -->
	<div :class="$style.backRow">
		<N8nButton
			variant="ghost"
			size="small"
			:class="$style.backButton"
			data-test-id="settings-authentication-back"
			@click="goBack"
		>
			<template #icon>
				<N8nIcon icon="arrow-left" />
			</template>
			{{ i18n.baseText('settings.authentication.back') }}
		</N8nButton>
	</div>
</template>

<style lang="scss" module>
.backRow {
	display: flex;
	margin-bottom: var(--spacing--lg);
}

.backButton {
	/* Pull the ghost button's inner padding so the arrow aligns with the page heading. */
	margin-inline-start: calc(-1 * var(--spacing--xs));
}
</style>
