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

<script lang="ts">
import N8nButton from '../N8nButton';
import N8nHeading from '../N8nHeading';
import N8nText from '../N8nText';
import N8nCallout from '../N8nCallout';
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'N8nActionBox',
	components: {
		N8nButton,
		N8nHeading,
		N8nText,
		N8nCallout,
	},
	props: {
		emoji: {
			type: String,
		},
		heading: {
			type: String,
		},
		buttonText: {
			type: String,
		},
		buttonType: {
			type: String,
		},
		description: {
			type: String,
		},
		calloutText: {
			type: String,
		},
		calloutTheme: {
			type: String,
			default: 'info',
		},
		calloutIcon: {
			type: String,
		},
	},
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
