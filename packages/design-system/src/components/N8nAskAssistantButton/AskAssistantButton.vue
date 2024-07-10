<script setup lang="ts">
import AssistantIcon from './AssistantIcon.vue';
import AssistantText from './AssistantText.vue';

interface Props {
	size: 'small' | 'medium';
	static: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	size: 'medium',
	static: false,
});

const sizes = {
	medium: {
		fontSize: '12px',
		iconSize: 12,
		lineHeight: '16px',
		padding: '0px 12px',
		height: '28px',
	},
	small: {
		fontSize: '9px',
		iconSize: 9,
		lineHeight: '12px',
		padding: '0px 3px',
		height: '18px',
	},
};
// todo if static, disable click
// todo hoverable class not clean below
</script>

<template>
	<button
		:class="[$style.button, props.static ? '' : $style.hoverable]"
		:style="{ height: sizes[props.size].height }"
	>
		<div>
			<div :style="{ padding: sizes[props.size].padding }">
				<AssistantIcon :size="sizes[props.size].iconSize" :class="$style.icon" />
				<AssistantText
					:font-size="sizes[props.size].fontSize"
					:line-height="sizes[props.size].lineHeight"
					text="Ask Assistant"
				/>
			</div>
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
	position: relative;
	border: 0;
	padding: 1px;

	background: linear-gradient(105deg, #5b60e8 0%, #aa7bec 50%, #ec7b8e 100%);

	> div {
		background: var(--color-background-xlight);
		border-radius: inherit;
		height: 100%;

		> div {
			height: 100%;
			display: flex;
			align-items: center;
			justify-content: center;
			line-height: unset;
		}
	}
}

.hoverable {
	&:hover {
		cursor: pointer;

		> div > div {
			background: linear-gradient(
				108.82deg,
				rgba(236, 123, 142, 0.12) 0%,
				rgba(170, 123, 236, 0.12) 50.5%,
				rgba(91, 96, 232, 0.12) 100%
			);
		}
	}

	&:active {
		> div > div {
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
