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
		<div :class="$style.description" @click="$emit('descriptionClick', $event)">
			<N8nText color="text-base">
				<slot name="description">
					<span v-html="description"></span>
				</slot>
			</N8nText>
		</div>
		<N8nButton
			v-if="buttonText"
			:label="buttonText"
			:type="buttonType"
			size="large"
			@click="$emit('click:button', $event)"
		/>
		<N8nCallout
			v-if="calloutText"
			:theme="calloutTheme"
			:icon="calloutIcon"
			:class="$style.callout"
		>
			<N8nText color="text-base">
				<span size="small" v-html="calloutText"></span>
			</N8nText>
		</N8nCallout>
	</div>
</template>

<script lang="ts" setup>
import N8nButton from '../N8nButton';
import N8nHeading from '../N8nHeading';
import N8nText from '../N8nText';
import N8nCallout, { type CalloutTheme } from '../N8nCallout';
import type { ButtonType } from 'n8n-design-system/types/button';

interface ActionBoxProps {
	emoji: string;
	heading: string;
	buttonText: string;
	buttonType: ButtonType;
	description: string;
	calloutText: string;
	calloutTheme: CalloutTheme;
	calloutIcon: string;
}

defineOptions({ name: 'N8nActionBox' });
withDefaults(defineProps<ActionBoxProps>(), {
	calloutTheme: 'info',
});
</script>

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
