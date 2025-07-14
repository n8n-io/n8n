<script lang="ts" setup>
import N8nTooltip from '@n8n/design-system/components/N8nTooltip/Tooltip.vue';
import type { ButtonType } from '@n8n/design-system/types/button';

import N8nButton from '../N8nButton';
import N8nCallout, { type CalloutTheme } from '../N8nCallout';
import N8nHeading from '../N8nHeading';
import { type IconName } from '../N8nIcon/icons';
import N8nText from '../N8nText';

interface ActionBoxProps {
	emoji?: string;
	heading?: string;
	buttonText?: string;
	buttonType?: ButtonType;
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
		<div v-if="emoji" :class="$style.emoji">
			{{ emoji }}
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
		<N8nTooltip :disabled="!buttonDisabled">
			<template #content>
				<slot name="disabledButtonTooltip"></slot>
			</template>
			<N8nButton
				v-if="buttonText"
				:label="buttonText"
				:type="buttonType"
				:disabled="buttonDisabled"
				:icon="buttonIcon"
				size="large"
				@click="$emit('click:button', $event)"
			/>
		</N8nTooltip>
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
	border: 2px dashed var(--color-foreground-base);
	border-radius: var(--border-radius-large);
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: var(--spacing-3xl);

	> * {
		margin-bottom: var(--spacing-l);

		&:last-child {
			margin-bottom: 0;
		}
	}
}

.emoji {
	font-size: 40px;
}

.heading {
	margin-bottom: var(--spacing-l);
	text-align: center;
}

.description {
	color: var(--color-text-base);
	margin-bottom: var(--spacing-xl);
	text-align: center;
}

.callout {
	width: 100%;
	text-align: left;
}
</style>
