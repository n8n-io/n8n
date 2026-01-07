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
		<img
			:src="OneOriginLogo"
			alt="OneOrigin"
			width="110"
			style="margin-bottom: var(--spacing--2xl)"
		/>
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
	</div>
</template>

<style lang="scss" module>
body {
	background-color: var(--color--background--light-1);
}

.container {
	display: flex;
	align-items: center;
	flex-direction: column;
	justify-content: center;
	height: 100%;
	width: 100%;

	background: radial-gradient(
		circle at 50% 30%,
		rgba(59, 157, 255, 0.08) 0%,
		rgba(59, 157, 255, 0.01) 50%,
		transparent 80%
	);

	> * {
		width: 352px;
		position: relative;
		z-index: 1;
	}
}

.container img {
	filter: drop-shadow(0 0 15px rgba(59, 157, 255, 0.25));
}

.textContainer {
	text-align: center;
	margin-bottom: var(--spacing--m);
}

.formContainer {
	padding-bottom: var(--spacing--xl);
	filter: drop-shadow(0 15px 30px rgba(0, 0, 0, 0.15));
}
</style>
