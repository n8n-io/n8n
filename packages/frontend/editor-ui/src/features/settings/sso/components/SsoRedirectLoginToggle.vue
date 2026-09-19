<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { N8nSwitch } from '@n8n/design-system';

import { useSSOStore } from '../sso.store';

const i18n = useI18n();
const ssoStore = useSSOStore();

const modelValue = defineModel<boolean>({ required: true });
</script>

<template>
	<div :class="$style.card">
		<div
			data-test-id="sso-redirect-login-toggle"
			:class="[$style.settingsItem, $style.settingsItemNoBorder]"
		>
			<div :class="$style.settingsItemLabel">
				<label>{{ i18n.baseText('settings.sso.settings.redirectToSso.label') }}</label>
				<small>{{ i18n.baseText('settings.sso.settings.redirectToSso.description') }}</small>
			</div>
			<div :class="$style.settingsItemControl">
				<N8nSwitch
					v-model="modelValue"
					:disabled="ssoStore.ssoManagedByEnv"
					data-test-id="sso-redirect-login-switch"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module src="../styles/sso-form.module.scss" />
