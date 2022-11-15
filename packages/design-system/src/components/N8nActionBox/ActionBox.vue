<template>
	<div :class="['n8n-action-box', $style.container]">
		<div :class="$style.emoji" v-if="emoji">
			{{ emoji }}
		</div>
		<div :class="$style.heading" v-if="heading || $slots.heading">
			<n8n-heading size="xlarge" align="center">
				<slot name="heading">{{ heading }}</slot>
			</n8n-heading>
		</div>
		<div :class="$style.description" @click="$emit('descriptionClick', $event)">
			<n8n-text color="text-base">
				<slot name="description">
					<span v-html="description"></span>
				</slot>
			</n8n-text>
		</div>
		<n8n-button
			v-if="buttonText"
			:label="buttonText"
			:type="buttonType"
			size="large"
			@click="$emit('click', $event)"
		/>
		<n8n-callout
			v-if="calloutText"
			:theme="calloutTheme"
			:icon="calloutIcon"
			:class="$style.callout"
		>
			<template>
				<n8n-text color="text-base">
					<span size="small" v-html="calloutText"></span>
				</n8n-text>
			</template>
		</n8n-callout>
	</div>
</template>

<script lang="ts">
import N8nButton from '../N8nButton';
import N8nHeading from '../N8nHeading';
import N8nText from '../N8nText';
import N8nCallout from '../N8nCallout';
import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-action-box',
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
