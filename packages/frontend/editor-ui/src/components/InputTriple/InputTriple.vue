<script setup lang="ts">
type Props = {
	middleWidth?: string;
};
withDefaults(defineProps<Props>(), { middleWidth: '160px' });
</script>

<template>
	<n8n-resize-observer
		:class="{ [$style.observer]: true }"
		:breakpoints="[
			{ bp: 'stacked', width: 400 },
			{ bp: 'medium', width: 680 },
		]"
	>
		<template #default="{ bp }">
			<div :class="$style.background"></div>
			<div
				:class="{
					[$style.triple]: true,
					[$style.stacked]: bp === 'stacked',
					[$style.medium]: bp === 'medium',
					[$style.default]: bp === 'default',
					[$style.noRightSlot]: !$slots.right,
					[$style.noMiddleSlot]: !$slots.middle,
				}"
			>
				<div v-if="$slots.left" :class="$style.item">
					<slot name="left" :breakpoint="bp"></slot>
				</div>
				<div
					v-if="$slots.middle"
					:class="[$style.item, $style.middle]"
					:style="{ flexBasis: middleWidth }"
				>
					<slot name="middle" :breakpoint="bp"></slot>
				</div>
				<div v-if="$slots.right" :class="$style.item">
					<slot name="right" :breakpoint="bp"></slot>
				</div>
			</div>
		</template>
	</n8n-resize-observer>
</template>

<style lang="scss" module>
.triple {
	display: flex;
	flex-wrap: nowrap;
	align-items: flex-start;
}

.observer {
	--parameter-input-options-height: 22px;
	width: 100%;
	position: relative;
}

.background {
	position: absolute;
	background-color: var(--color-background-input-triple);
	top: var(--parameter-input-options-height);
	bottom: 0;
	left: 0;
	right: 0;
	border: 1px solid var(--border-color-base);
	border-radius: var(--border-radius-base);
}

.item {
	position: relative;
	flex-shrink: 0;
	flex-basis: 240px;
	flex-grow: 1;
	z-index: 0;

	--input-border-radius: 0;

	&:focus-within {
		z-index: 1;
	}
}

.default .item:not(:first-child) {
	margin-left: -1px;
}

.middle {
	flex-grow: 0;
	flex-basis: 160px;
	padding-top: var(--parameter-input-options-height);
}

.item:first-of-type {
	--input-border-top-left-radius: var(--border-radius-base);
	--input-border-bottom-left-radius: var(--border-radius-base);
	--input-border-top-right-radius: 0;
	--input-border-bottom-right-radius: 0;
}

.item:last-of-type {
	--input-border-top-left-radius: 0;
	--input-border-bottom-left-radius: 0;
	--input-border-top-right-radius: var(--border-radius-base);
	--input-border-bottom-right-radius: var(--border-radius-base);
}

.medium:not(.noRightSlot) {
	flex-wrap: wrap;

	.middle {
		margin-left: -1px;

		--input-border-top-right-radius: var(--border-radius-base);
		--input-border-bottom-right-radius: 0;
	}

	.item:first-of-type {
		--input-border-top-left-radius: var(--border-radius-base);
		--input-border-top-right-radius: 0;
		--input-border-bottom-left-radius: 0;
	}

	.item:last-of-type {
		flex-basis: 400px;
		margin-top: -1px;

		--input-border-top-left-radius: 0;
		--input-border-top-right-radius: 0;
		--input-border-bottom-left-radius: var(--border-radius-base);
		--input-border-bottom-right-radius: var(--border-radius-base);
	}
}

.stacked {
	display: block;

	.middle {
		padding-top: 0;
	}

	.middle:not(.item:last-of-type) {
		width: 100%;
		--input-border-radius: 0;
	}

	.item:first-of-type {
		--input-border-top-left-radius: var(--border-radius-base);
		--input-border-top-right-radius: var(--border-radius-base);
		--input-border-bottom-left-radius: 0;
		--input-border-bottom-right-radius: 0;
	}

	.item:not(:first-of-type) {
		margin-top: -1px;
	}

	.item:last-of-type {
		--input-border-top-left-radius: 0;
		--input-border-top-right-radius: 0;
		--input-border-bottom-left-radius: var(--border-radius-base);
		--input-border-bottom-right-radius: var(--border-radius-base);
	}
}
</style>
