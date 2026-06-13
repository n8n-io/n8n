<script setup lang="ts">
/**
 * @TODO Move to design system
 */
import { computed, ref, useCssModule } from 'vue';

import { ElTag } from 'element-plus';
import { N8nButton, N8nIcon, N8nLink } from '@n8n/design-system';

type Theme = 'success' | 'danger' | 'warning';

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
}));

const messageClass = computed<Record<Theme, string>>(() => ({
	success: $style.message,
	warning: $style.warningMessage,
	danger: $style.dangerMessage,
}));
</script>

<template>
	<ElTag :type="theme" :disable-transitions="true" :class="$style.container">
		<N8nIcon
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
				</div>
			</div>

			<slot v-if="$slots.button" name="button" />
			<N8nButton
				variant="outline"
				v-else-if="buttonLabel"
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

.banner {
	display: flex;
	align-items: center;
}

.content {
	flex-grow: 1;
	min-height: 26px;
	display: flex;
	align-items: center;
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
</style>
