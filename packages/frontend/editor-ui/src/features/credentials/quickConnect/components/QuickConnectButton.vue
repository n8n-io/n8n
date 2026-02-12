<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import CredentialIcon from '../../components/CredentialIcon.vue';
import GoogleAuthButton from '../../components/CredentialEdit/GoogleAuthButton.vue';
import { useCredentialOAuth } from '../../composables/useCredentialOAuth';

const props = defineProps<{
	credentialTypeName: string;
	serviceName: string;
	label?: string;
	disabled?: boolean;
	disabledTooltip?: string;
}>();

defineEmits<{
	click: [];
}>();

const i18n = useI18n();
const { isGoogleOAuthType } = useCredentialOAuth();

const buttonLabel = computed(() => {
	if (props.label) return props.label;
	return i18n.baseText('nodeCredentials.quickConnect.connectTo', {
		interpolate: { provider: props.serviceName },
	});
});
</script>

<template>
	<N8nTooltip :disabled="!disabled || !disabledTooltip" placement="top">
		<template #content>{{ disabledTooltip }}</template>
		<span>
			<GoogleAuthButton
				v-if="isGoogleOAuthType(credentialTypeName)"
				:disabled="disabled"
				@click="$emit('click')"
			/>
			<N8nButton
				v-else
				type="highlightFill"
				size="small"
				:class="$style.quickConnectButton"
				:disabled="disabled"
				@click="$emit('click')"
			>
				<CredentialIcon :credential-type-name="credentialTypeName" :size="16" />
				<span>{{ buttonLabel }}</span>
			</N8nButton>
		</span>
	</N8nTooltip>
</template>

<style lang="scss" module>
.quickConnectButton {
	display: inline-flex;
	align-items: center;
	--button--color--text: var(--color--neutral-900);
	--button--border-color: var(--color--neutral-700);
	--button--color--background: var(--color--neutral-100);
	--button--color--text--hover: var(--color--neutral-950);
	--button--border-color--hover: var(--color--neutral-950);
	--button--color--background--hover: var(--color--neutral-250);
	--button--color--text--active: var(--color--neutral-950);
	--button--border-color--active: var(--color--neutral-950);
	--button--color--background--active: var(--color--neutral-250);
	--button--color--text--focus: var(--color--neutral-950);
	--button--border-color--focus: var(--color--neutral-950);
	--button--color--background--focus: var(--color--neutral-250);
}
</style>
