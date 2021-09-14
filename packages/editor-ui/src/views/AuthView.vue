<template>
	<div :class="$style.container">
		<!-- <div>
				<Logo />
		</div> -->
		<div :style="formStyles">
			<n8n-form-box
				v-bind="form"
				@action="onAction"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import {
	N8nFormBox,
} from 'n8n-design-system';

// import Logo from '../components/Logo.vue';

export default Vue.extend({
	name: 'AuthView',
	components: {
		N8nFormBox,
		// Logo,
	},
	props: {
		form: {
		},
		formWidth: {
			type: String,
		},
	},
	computed: {
		formStyles() {
			const styles: {[key: string]: string} = {};

			if (this.formWidth) {
				styles.width = this.formWidth;
			}

			return styles;
		},
	},
	methods: {
		onAction(values: {[key: string]: string}) {
			this.$emit('action', values);
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
</style>

