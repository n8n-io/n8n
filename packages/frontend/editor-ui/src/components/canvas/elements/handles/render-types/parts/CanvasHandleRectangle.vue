<script lang="ts" setup>
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		handleClasses?: string;
		executionStatus?: string;
		hasPinnedData?: boolean;
	}>(),
	{
		handleClasses: undefined,
		executionStatus: undefined,
		hasPinnedData: false,
	},
);

const statusClasses = computed(() => {
	if (props.hasPinnedData) {
		return 'pinned';
	}
	if (['error', 'crashed'].includes(props.executionStatus || '')) {
		return 'error';
	}
	if (props.executionStatus === 'success') {
		return 'success';
	}
	return 'default';
});
</script>

<template>
	<div :class="[$style.rectangle, handleClasses, $style[statusClasses]]" />
</template>

<style lang="scss" module>
.rectangle {
	width: var(--handle--indicator--width);
	height: var(--handle--indicator--height);
	background: var(--color--connection-line);

	&:hover {
		background: var(--color-primary);
	}

	&.pinned {
		background: var(--color-node-pinned-border);

		&:hover {
			background: var(--color-secondary-shade-1);
		}
	}

	&.success {
		background: var(--color-success);

		&:hover {
			background: var(--color-success-shade-1);
		}
	}

	&.error {
		background: var(--color-danger);

		&:hover {
			background: var(--color-danger-shade-1);
		}
	}

	&.default {
		background: var(--color--connection-line);

		&:hover {
			background: var(--color-primary);
		}
	}
}
</style>
