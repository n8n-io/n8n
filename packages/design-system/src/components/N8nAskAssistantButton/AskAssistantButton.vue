<script setup lang="ts">
import AssistantIcon from './AssistantIcon.vue';
import AssistantText from './AssistantText.vue';

interface Props {
	size: 'small' | 'medium';
}

const props = withDefaults(defineProps<Props>(), {
	size: 'medium',
});

const sizes = {
	medium: {
		fontSize: '12px',
		iconSize: 12,
		lineHeight: '16px',
	},
	small: {
		fontSize: '9px',
		iconSize: 9,
		lineHeight: '12px',
	},
};
</script>

<template>
	<button :class="$style.button">
		<div>
			<AssistantIcon :size="sizes[props.size].iconSize" :class="$style.icon" />
			<AssistantText
				:font-size="sizes[props.size].fontSize"
				:line-height="sizes[props.size].lineHeight"
				text="Ask Assistant"
			/>
		</div>
	</button>
</template>

<style lang="scss" module>
// todo use tokens for colors and stuff
// todo localization?
// todo svg? reuse?
.button {
	$border: 1px;
	border-radius: 4px;
	margin: 1px;
	position: relative;
	border: 0;
	padding: 0;

	> div {
		background: var(--color-background-xlight);
		padding: 5px 12px; // 1px less in vertical padding
		border-radius: inherit; /* !important */
	}

	// border
	&::before {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		left: 0;
		bottom: 0;
		z-index: -1;
		margin: -$border; /* !important */
		border-radius: inherit; /* !important */
		background: linear-gradient(105deg, #5b60e8 0%, #aa7bec 50%, #ec7b8e 100%);
	}

	&:hover {
		> div {
			cursor: pointer;
			background: linear-gradient(
				108.82deg,
				rgba(236, 123, 142, 0.12) 0%,
				rgba(170, 123, 236, 0.12) 50.5%,
				rgba(91, 96, 232, 0.12) 100%
			);
		}
	}

	&:active {
		> div {
			// cursor: pointer;
			background: linear-gradient(
				108.82deg,
				rgba(236, 123, 142, 0.25) 0%,
				rgba(170, 123, 236, 0.25) 50.5%,
				rgba(91, 96, 232, 0.25) 100%
			);
		}
	}
}

.icon {
	margin-right: 6px;
	margin-bottom: -1px; // center icon to align with text
}
</style>
