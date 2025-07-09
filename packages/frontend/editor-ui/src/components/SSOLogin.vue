<script lang="ts" setup>
import { useSSOStore } from '@/stores/sso.store';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { useRoute } from 'vue-router';

const i18n = useI18n();
const ssoStore = useSSOStore();
const toast = useToast();
const route = useRoute();

const onSSOLogin = async () => {
	try {
		const redirectUrl = ssoStore.isDefaultAuthenticationSaml
			? await ssoStore.getSSORedirectUrl(
					typeof route.query?.redirect === 'string' ? route.query.redirect : '',
				)
			: ssoStore.oidc.loginUrl;
		window.location.href = redirectUrl ?? '';
	} catch (error) {
		toast.showError(error, 'Error', error.message);
	}
};
</script>

<template>
	<div v-if="ssoStore.showSsoLoginButton" :class="$style.ssoLogin">
		<div :class="$style.divider">
			<span>{{ i18n.baseText('sso.login.divider') }}</span>
		</div>
		<N8nButton
			size="large"
			type="primary"
			outline
			:label="i18n.baseText('sso.login.button')"
			@click="onSSOLogin"
		/>
	</div>
</template>

<style lang="scss" module>
.ssoLogin {
	text-align: center;
}

.divider {
	position: relative;
	text-transform: uppercase;

	&::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 0;
		width: 100%;
		height: 1px;
		background-color: var(--color-foreground-base);
	}

	span {
		position: relative;
		display: inline-block;
		margin: var(--spacing-2xs) auto;
		padding: var(--spacing-l);
		background: var(--color-background-xlight);
	}
}
</style>
