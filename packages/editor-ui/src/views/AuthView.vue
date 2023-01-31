<template>
	<div :class="$style.container">
		<div :class="$style.logoContainer">
			<Logo />
		</div>
		<div v-if="subtitle" :class="$style.textContainer">
			<n8n-text size="large">{{ subtitle }}</n8n-text>
		</div>
		<div :class="$style.formContainer">
			<n8n-form-box
				v-bind="form"
				data-test-id="auth-form"
				:buttonLoading="formLoading"
				@secondaryClick="onSecondaryClick"
				@submit="onSubmit"
				@input="onInput"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

import Logo from '../components/Logo.vue';

export default Vue.extend({
	name: 'AuthView',
	components: {
		Logo,
	},
	props: {
		form: {},
		formLoading: {
			type: Boolean,
			default: false,
		},
		subtitle: {
			type: String,
		},
	},
	methods: {
		onInput(e: { name: string; value: string }) {
			this.$emit('input', e);
		},
		onSubmit(values: { [key: string]: string }) {
			this.$emit('submit', values);
		},
		onSecondaryClick() {
			this.$emit('secondaryClick');
		},
	},
});
</script>

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
		margin-bottom: var(--spacing-l);
		width: 352px;
	}
}

.logoContainer {
	display: flex;
	justify-content: center;
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
