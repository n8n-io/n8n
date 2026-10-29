<script setup lang="ts">
import { N8nLogo } from '@n8n/design-system';
import type { FormFieldValueUpdate, IFormBoxConfig } from '@/Interface';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { EmailOrLdapLoginIdAndPassword } from './SigninView.vue';

import { N8nFormBox, N8nText } from '@n8n/design-system';
withDefaults(
	defineProps<{
		/** The standard form box. Omit it when the default slot renders the card instead. */
		form?: IFormBoxConfig;
		formLoading?: boolean;
		subtitle?: string;
	}>(),
	{
		form: undefined,
		formLoading: false,
		subtitle: undefined,
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

const {
	settings: { releaseChannel },
} = useSettingsStore();
</script>

<template>
	<div :class="$style.container">
		<N8nLogo size="large" :release-channel="releaseChannel" />
		<div v-if="subtitle" :class="$style.textContainer">
			<N8nText size="large">{{ subtitle }}</N8nText>
		</div>
		<div :class="$style.formContainer">
			<slot>
				<N8nFormBox
					v-if="form"
					v-bind="form"
					data-test-id="auth-form"
					:button-loading="formLoading"
					submit-button-variant="brand"
					@secondary-click="onSecondaryClick"
					@submit="onSubmit"
					@update="onUpdate"
				/>
			</slot>
		</div>
	</div>
</template>

<style lang="scss" module>
body {
	background-color: var(--color--background--light-2);
}

.container {
	display: flex;
	align-items: center;
	flex-direction: column;
	padding-top: var(--spacing--2xl);

	> * {
		width: 352px;
	}
}

.textContainer {
	text-align: center;
}

.formContainer {
	padding-bottom: var(--spacing--xl);
}
</style>
