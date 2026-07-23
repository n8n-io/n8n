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

const iconClass = computed<Record<Theme, string>>(() => ({
	success: $style.icon,
	warning: $style.warningIcon,
	danger: $style.dangerIcon,
	// `info` renders without an icon; this entry is only here to satisfy the type.
	info: $style.icon,
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
		<N8nIcon
			v-if="theme !== 'info'"
			:icon="theme === 'success' ? 'circle-check' : 'triangle-alert'"
			:class="iconClass[props.theme]"
		/>
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

// `info` has no leading icon, so it drops the icon gutter and sits flush, and
// carries a neutral (non-alerting) background.
.containerInfo {
	padding-left: var(--spacing--sm);

	// Element Plus sets the tag background AND border through
	// `.el-tag--info.el-tag--light`, which outranks a single class — match its
	// specificity to apply our neutral fill + border. Alpha overlays so both read
	// against the modal in either theme (a flat grey token collapses into the
	// surface in dark mode). The border sits past the fill in the same direction —
	// darker than the fill in light mode, lighter in dark mode.
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
	// ElTag is inline-flex, so the row must claim the full tag width for the
	// text side to shrink and the fixed-width action button to keep its size.
	width: 100%;
}

.content {
	flex-grow: 1;
	// Allow the text side to shrink/wrap so the fixed-width action button keeps
	// its size instead of being squeezed and clipped on narrow widths.
	min-width: 0;
	min-height: 26px;
	display: flex;
	align-items: center;

	// The inner text wrapper is itself a flex item; without min-width:0 it keeps
	// its intrinsic width and the text overflows across the action button.
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
