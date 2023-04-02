<script lang="ts" setup>
import { Notification } from 'element-ui';
import { useSettingsStore } from '@/stores/settings';
import GoogleAuthButton from '@/components/CredentialEdit/GoogleAuthButton.vue';
import MicrosoftAuthButton from '@/components/CredentialEdit/MicrosoftAuthButton.vue';

const settingStore = useSettingsStore();

const onOpenIDLogin = async () => {
	try {
		window.location.href = settingStore.openIDLoginURL;
	} catch (error) {
		Notification.error({
			title: 'Error',
			message: error.message,
			position: 'bottom-right',
		});
	}
};
</script>

<template>
	<div v-if="settingStore.isOpenIDLoginEnabled" :class="$style.ssoLogin">
		<div :class="$style.divider">
			<span>{{ $locale.baseText('sso.login.divider') }}</span>
		</div>
		<GoogleAuthButton
			v-if="settingStore.openIDServiceProvider === 'google'"
			@click="onOpenIDLogin"
		/>
		<MicrosoftAuthButton
			v-else-if="settingStore.openIDServiceProvider === 'microsoft'"
			@click="onOpenIDLogin"
		/>
		<n8n-button
			v-else
			@click="onOpenIDLogin"
			size="large"
			type="tertiary"
			:icon="['fab', 'openid']"
			:block="true"
			outline
			:label="settingStore.openIDButtonName"
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
