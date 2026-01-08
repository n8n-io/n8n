<script setup lang="ts">
import SSOLogin from '@/features/settings/sso/components/SSOLogin.vue';
import type { FormFieldValueUpdate, IFormBoxConfig } from '@/Interface';

import type { EmailOrLdapLoginIdAndPassword } from './SigninView.vue';

import { N8nFormBox, N8nText } from '@n8n/design-system';
import OneOriginLogo from '@/assets/oneorigin-logo-dark.svg?url';
withDefaults(
	defineProps<{
		form: IFormBoxConfig;
		formLoading?: boolean;
		subtitle?: string;
		withSso?: boolean;
	}>(),
	{
		formLoading: false,
		withSso: false,
	},
);

const emit = defineEmits<{
	update: [FormFieldValueUpdate];
	submit: [values: EmailOrLdapLoginIdAndPassword];
	secondaryClick: [];
}>();

const onUpdate = (e: FormFieldValueUpdate) => {
	emit('update', e);
};

const onSubmit = (data: unknown) => {
	emit('submit', data as EmailOrLdapLoginIdAndPassword);
};

const onSecondaryClick = () => {
	emit('secondaryClick');
};
</script>

<template>
	<div :class="$style.container">
		<!-- Ambient Background Elements -->
		<div :class="$style.ambienceTop" />

		<img :src="OneOriginLogo" alt="OneOrigin" width="110" :class="$style.logo" />
		<div v-if="subtitle" :class="$style.textContainer">
			<N8nText size="large">{{ subtitle }}</N8nText>
		</div>
		<div :class="$style.formContainer">
			<N8nFormBox
				v-bind="form"
				data-test-id="auth-form"
				:button-loading="formLoading"
				@secondary-click="onSecondaryClick"
				@submit="onSubmit"
				@update="onUpdate"
			>
				<SSOLogin v-if="withSso" />
			</N8nFormBox>
		</div>

		<!-- Footer -->
		<div :class="$style.footer">
			<span>&copy; 2026 OneOrigin Inc.</span>
			<span :class="$style.separator">|</span>
			<span>Powered by n8n</span>
		</div>
	</div>
</template>

<style lang="scss" module>
body {
	background-color: #0f1014; /* Deep premium dark */
}

.container {
	display: flex;
	align-items: center;
	flex-direction: column;
	justify-content: center;
	height: 100vh;
	width: 100vw;
	position: relative;
	overflow: hidden;
	background: radial-gradient(circle at 50% 100%, #1a1d24 0%, #0f1014 100%);

	> * {
		position: relative;
		z-index: 2;
	}
}

.ambienceTop {
	position: absolute;
	top: -20%;
	left: 50%;
	width: 80vw;
	height: 60vh;
	background: radial-gradient(
		ellipse at center,
		rgba(59, 157, 255, 0.12) 0%,
		rgba(59, 157, 255, 0.05) 40%,
		transparent 70%
	);
	transform: translateX(-50%);
	filter: blur(60px);
	z-index: 1;
	pointer-events: none;
}

.logo {
	margin-bottom: var(--spacing--2xl);
	filter: drop-shadow(0 0 20px rgba(59, 157, 255, 0.15));
}

.textContainer {
	text-align: center;
	margin-bottom: var(--spacing--m);
	width: 352px;
}

/* Modifying the internal card style via deep selector */
.formContainer {
	width: 352px;
	padding-bottom: var(--spacing--2xl); /* Increased padding for footer room */

	/* Apply Darker Glass Effect to n8n-card/el-card inside */
	:global(.n8n-form-box) {
		background-color: rgba(22, 23, 29, 0.85) !important;
		backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.08) !important;
		box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5) !important;
		border-radius: var(--border-radius--large) !important;
	}

	/* Target inputs to be harmonious if needed, though Blue Theme handles most */
}

.footer {
	position: absolute;
	bottom: var(--spacing--xl);
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	gap: var(--spacing--s);
	color: var(--color--text--tint-2);
	font-family: var(--font-family--base);
	font-size: var(--font-size--xs);
	letter-spacing: 0.2px;
	z-index: 10;
	opacity: 0.6;
}

.separator {
	opacity: 0.3;
	font-weight: 300;
}
</style>
