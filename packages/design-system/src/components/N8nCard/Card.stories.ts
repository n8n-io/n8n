/* tslint:disable:variable-name */

import N8nCard from './Card.vue';
import {StoryFn} from "@storybook/vue";
import N8nButton from "../N8nButton/Button.vue";
import N8nIcon from "../N8nIcon/Icon.vue";
import N8nText from "../N8nText/Text.vue";

export default {
	title: 'Atoms/Card',
	component: N8nCard,
};

export const Default: StoryFn = (args, {argTypes}) => ({
	props: Object.keys(argTypes),
	components: {
		N8nCard,
	},
	template: `<n8n-card v-bind="$props">This is a card.</n8n-card>`,
});


export const WithSlots: StoryFn = (args, {argTypes}) => ({
	props: Object.keys(argTypes),
	components: {
		N8nCard,
		N8nButton,
		N8nIcon,
		N8nText,
	},
	template: `<n8n-card v-bind="$props">
		<template slot="prepend">
			<n8n-icon icon="check" size="large" />
		</template>
		<template slot="header">
			<strong>Card header</strong>
		</template>
		<n8n-text color="text-light" size="medium" class="mt-2xs mb-2xs">
			This is the card body.
		</n8n-text>
		<template slot="footer">
			<n8n-text size="medium">
				Card footer
			</n8n-text>
		</template>
		<template slot="append">
			<n8n-button>Click me</n8n-button>
		</template>
	</n8n-card>`,
});
