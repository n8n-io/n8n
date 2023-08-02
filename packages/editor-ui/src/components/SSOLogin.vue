<script lang="ts" setup>
import { useSSOStore } from '@/stores/sso.store';
import { useI18n, useToast } from '@/composables';

const i18n = useI18n();
const ssoStore = useSSOStore();
const toast = useToast();

const onSSOLogin = async () => {
	try {
		window.location.href = await ssoStore.getSSORedirectUrl();
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
		<n8n-button
			@click="onSSOLogin"
			size="large"
			type="primary"
			outline
			:label="i18n.baseText('sso.login.button')"
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
		padding: var(--spacing-xl) var(--spacing-l);
		background: var(--color-foreground-xlight);
	}
}
</style>
