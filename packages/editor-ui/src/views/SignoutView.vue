<template>
	<div :class="$style.container">
		<div :class="$style.logoContainer">
			<Logo />
		</div>
		<div :class="$style.message">
			<div>
				<n8n-heading size="2xlarge">
					{{ $locale.baseText('auth.signout.success') }}
				</n8n-heading>
			</div>
			<div>
				<n8n-text size="large">
					{{ $locale.baseText('auth.signout.success.description') }}
				</n8n-text>
			</div>
		</div>
		<n8n-button
			:label="$locale.baseText('auth.signin')"
			@click="onButtonClick"
		/>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import Logo from '../components/Logo.vue';

export default Vue.extend({
	name: 'SignoutView',
	components: {
		Logo,
	},
	methods: {
		onButtonClick() {
			window.location.replace('/');
		},
	},
});
</script>

<style lang="scss" module>
.container {
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	margin-top: calc(var(--spacing-2xl) * -1);

	> * {
		margin-bottom: var(--spacing-l);
	}
}

.message {
	*:not(:last-child) {
		margin-bottom: var(--spacing-2xs);
		display: flex;
		justify-content: center;
	}
}
</style>
