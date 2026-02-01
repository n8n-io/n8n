<script lang="ts" setup>
import { computed, useCssModule } from 'vue';

import type { IconSize, CalloutTheme } from '../../types';
import N8nIcon from '../N8nIcon';
import { type IconName } from '../N8nIcon/icons';
import N8nText from '../N8nText';

const CALLOUT_DEFAULT_ICONS: Record<string, IconName> = {
	info: 'info',
	success: 'circle-check',
	warning: 'triangle-alert',
	danger: 'triangle-alert',
};

interface CalloutProps {
	theme: CalloutTheme;
	icon?: IconName;
	iconSize?: IconSize;
	iconless?: boolean;
	slim?: boolean;
	roundCorners?: boolean;
	onlyBottomBorder?: boolean;
}

defineOptions({ name: 'N8nCallout' });
const props = withDefaults(defineProps<CalloutProps>(), {
	iconSize: 'medium',
	roundCorners: true,
});

const $style = useCssModule();
const classes = computed(() => [
	'n8n-callout',
	$style.callout,
	$style[props.theme],
	props.slim ? $style.slim : '',
	props.roundCorners ? $style.round : '',
	props.onlyBottomBorder ? $style.onlyBottomBorder : '',
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
</script>

<template>
	<div :class="classes" role="alert">
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

		<slot name="trailingContent" />
	</div>
</template>

<style lang="scss" module>
.callout {
	display: flex;
	justify-content: space-between;
	font-size: var(--font-size--2xs);
	padding: var(--spacing--xs);
	border: var(--border-width) var(--border-style);
	align-items: center;
	line-height: var(--line-height--xl);
	border-color: var(--callout--border-color--info);
	background-color: var(--callout--color--background--info);
	color: var(--callout--color--text--info);

	&.slim {
		line-height: var(--line-height--xl);
		padding: var(--spacing--3xs) var(--spacing--2xs);
	}

	a {
		color: var(--link--color--secondary);
		font-weight: var(--font-weight--medium);
		text-decoration-line: underline;
		text-decoration-style: solid;
		text-decoration-skip-ink: none;
		text-decoration-thickness: auto;
		text-underline-offset: auto;
		text-underline-position: from-font;
	}
}

.round {
	border-radius: var(--radius);
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
	border-color: var(--callout--border-color--info);
	background-color: var(--callout--color--background--info);
	color: var(--callout--color--text--info);

	.icon {
		color: var(--callout--icon-color--info);
	}
}

.success {
	border-color: var(--callout--border-color--success);
	background-color: var(--callout--color--background--success);
	color: var(--callout--color--text--success);

	.icon {
		color: var(--callout--icon-color--success);
	}
}

.warning {
	border-color: var(--callout--border-color--warning);
	background-color: var(--callout--color--background--warning);
	color: var(--callout--color--text--warning);

	.icon {
		color: var(--callout--icon-color--warning);
	}
}

.danger {
	border-color: var(--callout--border-color--danger);
	background-color: var(--callout--color--background--danger);
	color: var(--callout--color--text--danger);

	.icon {
		color: var(--callout--icon-color--danger);
	}
}

.icon {
	line-height: 1;
	margin-right: var(--spacing--xs);
}

.secondary {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	border-color: var(--callout--border-color--secondary);
	background-color: var(--callout--color--background--secondary);
	color: var(--callout--color--text--secondary);

	.icon {
		color: var(--callout--icon-color--secondary);
	}
}
</style>
