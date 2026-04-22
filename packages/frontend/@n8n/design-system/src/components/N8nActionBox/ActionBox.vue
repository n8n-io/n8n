<script lang="ts" setup>
import type { ButtonVariant } from '../../types/button';
import N8nButton from '../N8nButton';
import N8nCallout, { type CalloutTheme } from '../N8nCallout';
import N8nHeading from '../N8nHeading';
import N8nIcon from '../N8nIcon';
import { type IconName } from '../N8nIcon/icons';
import type { IconOrEmoji } from '../N8nIconPicker/types';
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip/Tooltip.vue';

interface ActionBoxProps {
	icon?: IconOrEmoji;
	heading?: string;
	buttonText?: string;
	buttonVariant?: ButtonVariant;
	buttonDisabled?: boolean;
	buttonIcon?: IconName;
	description?: string;
	calloutText?: string;
	calloutTheme?: CalloutTheme;
	calloutIcon?: IconName;
}

defineOptions({ name: 'N8nActionBox' });
withDefaults(defineProps<ActionBoxProps>(), {
	calloutTheme: 'info',
	buttonIcon: undefined,
});
</script>

<template>
	<div :class="['n8n-action-box', $style.container]" data-test-id="action-box">
		<div v-if="icon" :class="$style.icon">
			<N8nIcon
				v-if="icon.type === 'icon'"
				:icon="icon.value"
				:size="40"
				:stroke-width="1.5"
				color="foreground-xdark"
			/>
			<span v-else>{{ icon.value }}</span>
		</div>
		<div v-if="heading || $slots.heading" :class="$style.heading">
			<N8nHeading size="xlarge" align="center">
				<slot name="heading">{{ heading }}</slot>
			</N8nHeading>
		</div>
		<div v-if="description" :class="$style.description" @click="$emit('descriptionClick', $event)">
			<N8nText color="text-base">
				<slot name="description">
					<span v-n8n-html="description"></span>
				</slot>
			</N8nText>
		</div>
		<N8nTooltip v-if="buttonText" :disabled="!buttonDisabled">
			<template #content>
				<slot name="disabledButtonTooltip"></slot>
			</template>
			<N8nButton
				:label="buttonText"
				:variant="buttonVariant"
				:disabled="buttonDisabled"
				:icon="buttonIcon"
				size="large"
				role="button"
				@click="$emit('click:button', $event)"
			/>
		</N8nTooltip>
		<div v-if="$slots.additionalContent" :class="$style['additional-content']">
			<slot name="additionalContent"></slot>
		</div>
		<N8nCallout
			v-if="calloutText"
			:theme="calloutTheme"
			:icon="calloutIcon"
			:class="$style.callout"
		>
			<N8nText color="text-base">
				<span v-n8n-html="calloutText" size="small"></span>
			</N8nText>
		</N8nCallout>
	</div>
</template>

<style lang="scss" module>
.container {
	border: 2px dashed var(--color--foreground);
	border-radius: var(--radius--lg);
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: var(--spacing--3xl);

	> * {
		margin-bottom: var(--spacing--lg);

		&:last-child {
			margin-bottom: 0;
		}
	}
}

.icon {
	font-size: 40px;
}

.heading {
	margin-bottom: var(--spacing--lg);
	text-align: center;
}

.description {
	color: var(--color--text);
	margin-bottom: var(--spacing--xl);
	text-align: center;
}

.callout {
	width: 100%;
	text-align: left;
}

.additional-content {
	display: flex;
	margin-top: 0;
	justify-content: center;
}
</style>
