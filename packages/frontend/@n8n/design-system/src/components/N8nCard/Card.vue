<script lang="ts" setup>
import { computed, useAttrs, useCssModule } from 'vue';

interface CardProps {
	hoverable?: boolean;
}

defineOptions({ name: 'N8nCard' });
const props = withDefaults(defineProps<CardProps>(), {
	hoverable: false,
});

const attrs = useAttrs();

function hasClickHandler(): boolean {
	return Boolean(attrs.onClick);
}

const $style = useCssModule();
const classes = computed(function getClasses() {
	return {
		card: true,
		[$style.card]: true,
		[$style.hoverable]: props.hoverable || hasClickHandler(),
	};
});
</script>

<template>
	<div :class="classes" v-bind="$attrs">
		<div v-if="$slots.prepend" data-test-id="card-prepend" :class="$style.icon">
			<slot name="prepend" />
		</div>
		<div :class="$style.content" data-test-id="card-content">
			<div v-if="$slots.header" :class="$style.header">
				<slot name="header" />
			</div>
			<div v-if="$slots.default" :class="$style.body">
				<slot />
			</div>
			<div v-if="$slots.footer" :class="$style.footer">
				<slot name="footer" />
			</div>
		</div>
		<div
			v-if="$slots.append"
			data-test-id="card-append"
			:class="[$style.append, 'n8n-card-append']"
		>
			<slot name="append" />
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	border-radius: var(--radius);
	border: var(--border);
	box-shadow: var(--shadow--xs);
	background-color: var(--background--surface);
	padding: var(--card--padding, var(--spacing--sm));
	display: flex;
	flex-direction: row;
	width: 100%;
	align-items: center;
}

.header,
.footer {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
}

.content {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	flex: 1;
	width: 100%;
}

.body {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	gap: var(--n8n--card-body--gap, 0);
}

.icon {
	width: 24px;
	display: inline-flex;
	justify-content: center;
	align-items: center;
	margin-right: var(--spacing--sm);
}

.hoverable {
	cursor: pointer;
	transition: none;

	&:hover,
	&:focus {
		border-color: var(--border-color--strong);
	}
}

.append {
	display: flex;
	align-items: center;
	cursor: default;
	width: var(--card--append--width, unset);
}
</style>
