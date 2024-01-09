<template>
	<n8n-resize-observer
		:class="{ [$style.observer]: true }"
		:breakpoints="[
			{ bp: 'stacked', width: 340 },
			{ bp: 'medium', width: 520 },
		]"
	>
		<template #default="{ bp }">
			<div
				:class="{
					[$style.triple]: true,
					[$style.stacked]: bp === 'stacked',
					[$style.medium]: bp === 'medium',
					[$style.noRightSlot]: !$slots.right,
					[$style.noMiddleSlot]: !$slots.middle,
				}"
			>
				<div v-if="$slots.left" :class="$style.item">
					<slot name="left" :breakpoint="bp"></slot>
				</div>
				<div v-if="$slots.middle" :class="[$style.item, $style.middle]">
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
	align-items: flex-end;
}

.observer {
	width: 100%;
}

.item {
	flex-shrink: 0;
	flex-basis: 160px;
	flex-grow: 1;
	--input-border-radius: 0;
	--input-border-right-color: transparent;

	&.middle {
		flex-grow: 0;
	}
}

.item:first-of-type {
	--input-border-top-left-radius: var(--border-radius-base);
	--input-border-bottom-left-radius: var(--border-radius-base);
	--input-border-top-right-radius: 0;
	--input-border-bottom-right-radius: 0;
	--input-border-right-color: transparent;
}

.item:last-of-type {
	--input-border-top-left-radius: 0;
	--input-border-bottom-left-radius: 0;
	--input-border-top-right-radius: var(--border-radius-base);
	--input-border-bottom-right-radius: var(--border-radius-base);
	--input-border-right-color: var(--input-border-color-base);
}

.medium:not(.noRightSlot) {
	flex-wrap: wrap;

	.middle {
		--input-border-top-right-radius: var(--border-radius-base);
		--input-border-bottom-right-radius: 0;
		--input-border-bottom-color: transparent;
		--input-border-right-color: var(--input-border-color-base);
	}

	.item:first-of-type {
		--input-border-top-left-radius: var(--border-radius-base);
		--input-border-top-right-radius: 0;
		--input-border-bottom-left-radius: 0;
		--input-border-right-color: transparent;
		--input-border-bottom-color: transparent;
	}

	.item:last-of-type {
		flex-basis: 340px;
		--input-border-top-left-radius: 0;
		--input-border-top-right-radius: 0;
		--input-border-bottom-left-radius: var(--border-radius-base);
		--input-border-bottom-right-radius: var(--border-radius-base);
	}
}

.stacked {
	display: block;

	.middle:not(.item:last-of-type) {
		width: 100%;
		--input-border-right-color: var(--input-border-color-base);
		--input-border-bottom-color: transparent;
		--input-border-radius: 0;
	}

	.item:first-of-type {
		--input-border-right-color: var(--input-border-color-base);
		--input-border-bottom-color: transparent;
		--input-border-top-left-radius: var(--border-radius-base);
		--input-border-top-right-radius: var(--border-radius-base);
		--input-border-bottom-left-radius: 0;
		--input-border-bottom-right-radius: 0;
	}

	.item:last-of-type {
		--input-border-top-left-radius: 0;
		--input-border-top-right-radius: 0;
		--input-border-bottom-left-radius: var(--border-radius-base);
		--input-border-bottom-right-radius: var(--border-radius-base);
		--input-border-right-color: var(--input-border-color-base);
	}
}
</style>
