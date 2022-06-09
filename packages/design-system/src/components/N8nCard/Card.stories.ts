/* tslint:disable:variable-name */

import N8nCard from './Card.vue';
import {StoryFn} from "@storybook/vue";

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

export const WithHeaderAndFooter: StoryFn = (args, {argTypes}) => ({
	props: Object.keys(argTypes),
	components: {
		N8nCard,
	},
	template: `<n8n-card v-bind="$props">
		<template #header>Header</template>
		This is a card.
		<template #footer>Footer</template>
	</n8n-card>`,
});
