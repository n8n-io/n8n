<template functional>
	<div :class="$style.container">
		<div :class="$style.heading">
			<component :is="$options.components.N8nHeading" size="xlarge" align="center">{{ props.heading }}</component>
		</div>
		<div :class="$style.description">
			<n8n-text color="text-base"><span v-html="props.description"></span></n8n-text>
		</div>
		<component :is="$options.components.N8nButton" :label="props.buttonText" size="large"
			@click="(e) => listeners.click && listeners.click(e)"
		/>
	</div>
</template>

<script lang="ts">
import N8nButton from '../N8nButton';
import N8nHeading from '../N8nHeading';
import N8nText from '../N8nText';

export default {
	name: 'n8n-action-box',
	props: {
		heading: {
			type: String,
		},
		buttonText: {
			type: String,
		},
		description: {
			type: String,
		},
	},
	components: {
		N8nButton,
		N8nHeading,
		N8nText,
	},
};
</script>

<style lang="scss" module>
.container {
	border: 2px dashed var(--color-foreground-base);
	border-radius: var(--border-radius-large);
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: var(--spacing-3xl) 20%;

	> * {
		margin-bottom: var(--spacing-l);
	}
}

.emoji {
	font-size: 40px;
}

.heading {
	margin-bottom: var(--spacing-l);
}

.description {
	margin-bottom: var(--spacing-xl);
}
</style>
