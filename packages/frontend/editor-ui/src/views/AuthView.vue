<script setup lang="ts">
import Logo from '@/components/Logo/Logo.vue';
import SSOLogin from '@/components/SSOLogin.vue';
import type { IFormBoxConfig } from '@/Interface';
import { useSettingsStore } from '@/stores/settings.store';

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
	update: [{ name: string; value: string }];
	submit: [values: { [key: string]: string }];
	secondaryClick: [];
}>();

const onUpdate = (e: { name: string; value: string }) => {
	emit('update', e);
};

const onSubmit = (values: { [key: string]: string }) => {
	emit('submit', values);
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
		<Logo location="authView" :release-channel="releaseChannel" />
		<div v-if="subtitle" :class="$style.textContainer">
			<n8n-text size="large">{{ subtitle }}</n8n-text>
		</div>
		<div :class="$style.formContainer">
			<n8n-form-box
				v-bind="form"
				data-test-id="auth-form"
				:button-loading="formLoading"
				@secondary-click="onSecondaryClick"
				@submit="onSubmit"
				@update="onUpdate"
			>
				<SSOLogin v-if="withSso" />
			</n8n-form-box>
		</div>
	</div>
</template>

<style lang="scss" module>
body {
	background-color: var(--color-background-light);
}

.container {
	display: flex;
	align-items: center;
	flex-direction: column;
	padding-top: var(--spacing-2xl);

	> * {
		width: 352px;
	}
}

.textContainer {
	text-align: center;
}

.formContainer {
	padding-bottom: var(--spacing-xl);
}
</style>

<style lang="scss">
.el-checkbox__label span {
	font-size: var(--font-size-2xs) !important;
}
</style>
