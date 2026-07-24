<script setup lang="ts">
/**
 * @TODO Move to design system
 */
import { computed, ref, useCssModule } from 'vue';

import { ElTag } from 'element-plus';
import { N8nButton, N8nIcon, N8nLink } from '@n8n/design-system';

type Theme = 'success' | 'danger' | 'warning' | 'info';

interface Props {
	theme: Theme;
	message: string;
	buttonLabel?: string;
	buttonLoadingLabel?: string;
	buttonTitle?: string;
	details?: string;
	buttonLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	buttonLoading: false,
	buttonLabel: '',
	buttonLoadingLabel: '',
	buttonTitle: '',
	details: '',
});

const emit = defineEmits<{
	click: [];
}>();

const expanded = ref(false);

const expand = () => {
	expanded.value = true;
};

const onClick = () => {
	expanded.value = false;
	emit('click');
};

const $style = useCssModule();

// A theme's leading icon, or `undefined` when it renders without one (info).
const icon = computed(() => {
	const icons: Record<Theme, 'circle-check' | 'triangle-alert' | undefined> = {
		success: 'circle-check',
		warning: 'triangle-alert',
		danger: 'triangle-alert',
		info: undefined,
	};
	return icons[props.theme];
});

const iconClass = computed<Record<Theme, string>>(() => ({
	success: $style.icon,
	warning: $style.warningIcon,
	danger: $style.dangerIcon,
	info: $style.icon, // unused (info has no icon), satisfies the type
}));

const messageClass = computed<Record<Theme, string>>(() => ({
	success: $style.message,
	warning: $style.warningMessage,
	danger: $style.dangerMessage,
	info: $style.infoMessage,
}));
</script>

<template>
	<ElTag
		:type="theme"
		:disable-transitions="true"
		:class="[$style.container, theme === 'info' && $style.containerInfo]"
	>
		<N8nIcon v-if="icon" :icon="icon" :class="iconClass[props.theme]" />
		<div :class="$style.banner">
			<div :class="$style.content">
				<div>
					<span :class="messageClass[props.theme]"> {{ message }}&nbsp; </span>
					<N8nLink v-if="details && !expanded" :bold="true" size="small" @click="expand">
						<span :class="$style.moreDetails">More details</span>
					</N8nLink>
					<div v-if="$slots.subtitle" :class="$style.subtitle">
						<slot name="subtitle" />
					</div>
				</div>
			</div>

			<div v-if="$slots.button" :class="$style.actions">
				<slot name="button" />
			</div>
			<N8nButton
				v-else-if="buttonLabel"
				variant="outline"
				:class="$style.actions"
				:label="buttonLoading && buttonLoadingLabel ? buttonLoadingLabel : buttonLabel"
				:title="buttonTitle"
				:loading="buttonLoading"
				size="small"
				@click.stop="onClick"
			/>
		</div>

		<div v-if="expanded" :class="$style.details">
			{{ details }}
		</div>
	</ElTag>
</template>

<style module lang="scss">
.icon {
	position: absolute;
	left: 14px;
	top: 0;
	bottom: 0;
	margin: auto 0;
}

.dangerIcon {
	composes: icon;
	color: var(--color--danger);
}

.warningIcon {
	composes: icon;
	color: var(--color--warning);
}

.container {
	width: 100%;
	position: relative;
	padding-left: 40px;
	border: none;
}

// `info` has no icon, so it drops the icon gutter and gets a neutral fill.
.containerInfo {
	padding-left: var(--spacing--sm);

	// Match Element Plus's specificity to override the tag's fill + border.
	// Alpha overlays read against the modal in both themes; the border steps one
	// notch past the fill (darker in light mode, lighter in dark).
	&:global(.el-tag--info.el-tag--light) {
		background-color: light-dark(var(--color--black-alpha-50), var(--color--white-alpha-100));
		border: var(--border-width) solid
			light-dark(var(--color--black-alpha-100), var(--color--white-alpha-300));
	}
}

.message {
	white-space: normal;
	line-height: var(--line-height--md);
	overflow: hidden;
	word-break: break-word;
}

.dangerMessage {
	composes: message;
	color: var(--callout--color--text--danger);
}

.warningMessage {
	composes: message;
	color: var(--callout--color--text--warning);
}

.infoMessage {
	composes: message;
	color: var(--color--text);
}

.banner {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	// ElTag is inline-flex; claim full width so the text shrinks, not the button.
	width: 100%;
}

.content {
	flex-grow: 1;
	// Let the text side shrink/wrap instead of clipping the fixed-width button.
	min-width: 0;
	min-height: 26px;
	display: flex;
	align-items: center;

	// Inner text wrapper is a flex item too; let it shrink so text wraps.
	> div {
		min-width: 0;
	}
}

.actions {
	flex-shrink: 0;
}

.details {
	composes: message;
	margin-top: var(--spacing--3xs);
	color: var(--color--text);
	font-size: var(--font-size--2xs);
}

.moreDetails {
	font-size: var(--font-size--xs);
}

.subtitle {
	margin-top: var(--spacing--4xs);
	line-height: var(--line-height--md);
	// ElTag defaults to nowrap; let the subtitle wrap instead of overflowing.
	white-space: normal;
}
</style>
