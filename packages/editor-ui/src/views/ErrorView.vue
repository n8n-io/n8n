<template>
	<div :class="$style.container">
		<font-awesome-icon icon="exclamation-triangle" :class="$style.icon" />
		<div :class="$style.message">
			<div>
				<n8n-text type="heading" size="2xlarge">
					{{message}}
				</n8n-text>
			</div>
			<div>
				<n8n-text type="body" size="large" v-if="errorCode">
					{{errorCode}} error
				</n8n-text>
			</div>
		</div>
		<n8n-button
			label="Go to editor"
			@click="onButtonClick"
		/>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'ErroView',
	props: {
		message: {
			type: String,
			required: true,
		},
		errorCode: {
			type: Number,
		},
	},
	methods: {
		onButtonClick() {
			this.$router.push('/');
		},
	},
});
</script>

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
}

.icon {
	min-height: 96px;
	min-width: 108px;
	margin-bottom: var(--spacing-2xl);
	color: var(--color-foreground-base);
}

.message {
	margin-bottom: var(--spacing-l);

	* {
		margin-bottom: var(--spacing-2xs);
		display: flex;
		justify-content: center;
	}
}
</style>
