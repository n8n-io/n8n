<script lang="ts" setup>
import { computed, useCssModule, ref, onMounted } from 'vue';

import type { IconSize } from 'n8n-design-system/types/icon';

import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';

const THEMES = ['info', 'success', 'secondary', 'warning', 'danger', 'custom'] as const;
export type CalloutTheme = (typeof THEMES)[number];

const CALLOUT_DEFAULT_ICONS: Record<string, string> = {
	info: 'info-circle',
	success: 'check-circle',
	warning: 'exclamation-triangle',
	danger: 'exclamation-triangle',
};

interface CalloutProps {
	theme: CalloutTheme;
	icon?: string;
	iconSize?: IconSize;
	iconless?: boolean;
	slim?: boolean;
	roundCorners?: boolean;
	onlyBottomBorder?: boolean;
	closeable?: boolean;
	id?: string;
}

defineOptions({ name: 'N8nCallout' });
const props = withDefaults(defineProps<CalloutProps>(), {
	iconSize: 'medium',
	roundCorners: true,
	closeable: false,
	id: undefined,
});

const emit = defineEmits<{
	close: [id: string | undefined];
}>();

const isVisible = ref(true);

// Handle storage of closed state
const storageKey = computed(() => (props.id ? `n8n-callout-${props.id}-closed` : null));

onMounted(() => {
	if (storageKey.value && localStorage.getItem(storageKey.value) === 'true') {
		isVisible.value = false;
	}
});

const handleClose = () => {
	isVisible.value = false;
	if (storageKey.value) {
		localStorage.setItem(storageKey.value, 'true');
	}
	emit('close', props.id);
};

const $style = useCssModule();
const classes = computed(() => [
	'n8n-callout',
	$style.callout,
	$style[props.theme],
	props.slim ? $style.slim : '',
	props.roundCorners ? $style.round : '',
	props.onlyBottomBorder ? $style.onlyBottomBorder : '',
	props.closeable ? $style.closeable : '',
]);

const getIcon = computed(
	() => props.icon ?? CALLOUT_DEFAULT_ICONS?.[props.theme] ?? CALLOUT_DEFAULT_ICONS.info,
);

const getIconSize = computed<IconSize>(() => {
	if (props.iconSize) {
		return props.iconSize;
	}
	if (props.theme === 'secondary') {
		return 'medium';
	}
	return 'large';
});

defineExpose({
	close: handleClose,
});
</script>

<template>
	<div v-if="isVisible" :class="classes" role="alert">
		<div :class="$style.messageSection">
			<div v-if="!iconless" :class="$style.icon">
				<N8nIcon :icon="getIcon" :size="getIconSize" />
			</div>
			<N8nText size="small">
				<slot />
			</N8nText>
			&nbsp;
			<slot name="actions" />
		</div>

		<div :class="$style.trailingContent">
			<slot name="trailingContent" />
			<N8nIcon
				v-if="closeable"
				:class="$style.closeIcon"
				icon="times"
				size="small"
				@click="handleClose"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.callout {
	display: flex;
	justify-content: space-between;
	font-size: var(--font-size-2xs);
	padding: var(--spacing-xs);
	border: var(--border-width-base) var(--border-style-base);
	align-items: center;
	line-height: var(--font-line-height-loose);
	border-color: var(--color-callout-info-border);
	background-color: var(--color-callout-info-background);
	color: var(--color-callout-info-font);

	&.slim {
		line-height: var(--font-line-height-loose);
		padding: var(--spacing-3xs) var(--spacing-2xs);
	}
}

.round {
	border-radius: var(--border-radius-base);
}

.onlyBottomBorder {
	border-top: 0;
	border-left: 0;
	border-right: 0;
}

.messageSection {
	display: flex;
	align-items: center;
}

.info,
.custom {
	border-color: var(--color-callout-info-border);
	background-color: var(--color-callout-info-background);
	color: var(--color-callout-info-font);

	.icon {
		color: var(--color-callout-info-icon);
	}
}

.success {
	border-color: var(--color-callout-success-border);
	background-color: var(--color-callout-success-background);
	color: var(--color-callout-success-font);

	.icon {
		color: var(--color-callout-success-icon);
	}
}

.warning {
	border-color: var(--color-callout-warning-border);
	background-color: var(--color-callout-warning-background);
	color: var(--color-callout-warning-font);

	.icon {
		color: var(--color-callout-warning-icon);
	}
}

.danger {
	border-color: var(--color-callout-danger-border);
	background-color: var(--color-callout-danger-background);
	color: var(--color-callout-danger-font);

	.icon {
		color: var(--color-callout-danger-icon);
	}
}

.icon {
	line-height: 1;
	margin-right: var(--spacing-2xs);
}

.secondary {
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-bold);
	border-color: var(--color-callout-secondary-border);
	background-color: var(--color-callout-secondary-background);
	color: var(--color-callout-secondary-font);

	.icon {
		color: var(--color-callout-secondary-icon);
	}
}

.trailingContent {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
}

.closeIcon {
	cursor: pointer;
	transition: opacity 0.2s ease;
	color: var(--color-text-base);

	&:hover {
		color: var(--color-text-dark);
	}
}
</style>
