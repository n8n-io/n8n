<template functional>
	<div :class="$style.container">
		<span :class="$style.emoji">{{props.emoji}}</span>
		<div :class="$style.description">
			<n8n-heading size="xlarge">{{ props.heading }}</n8n-heading>
			<n8n-text>{{ props.description }}</n8n-text>
		</div>
		<n8n-button :label="props.buttonText" size="large"></n8n-button>
	</div>
</template>

<script lang="ts">
import N8nButton from '../N8nButton';
import N8nHeading from '../N8nHeading';
import N8nText from '../N8nText';

export default {
	name: 'n8n-action-box',
	props: {
		emoji: {
			type: String,
		},
		heading: {
			type: String,
		},
		description: {
			type: String,
		},
		buttonText: {
			type: String,
		},
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

.description {
	display: flex;
	flex-direction: column;
	text-align: center;

	> *:first-child {
		margin-bottom: var(--spacing-2xs);
	}
}
</style>
