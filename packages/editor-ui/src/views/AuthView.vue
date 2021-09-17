<template>
	<div :class="$style.container">
		<!-- <div>
				<Logo />
		</div> -->
		<div :class="$style.formContainer">
			<n8n-form-box
				v-bind="form"
				:buttonLoading="formLoading"
				@submit="onSubmit"
				@input="onInput"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

// import Logo from '../components/Logo.vue';

export default Vue.extend({
	name: 'AuthView',
	components: {
		// Logo,
	},
	props: {
		form: {
		},
		formLoading: {
			type: Boolean,
			default: false,
		},
	},
	methods: {
		onInput(e: {name: string, value: string}) {
			this.$emit('input', e);
		},
		onSubmit(values: {[key: string]: string}) {
			this.$emit('submit', values);
		},
	},
});
</script>

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
	display: flex;
	justify-content: center;
	padding-top: var(--spacing-2xl);
}

.formContainer {
	width: 352px;
}
</style>

