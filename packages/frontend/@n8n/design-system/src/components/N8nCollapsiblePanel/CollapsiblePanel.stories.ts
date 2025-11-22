import type { StoryFn } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nCollapsiblePanel from './CollapsiblePanel.vue';
import N8nHeaderAction from '../N8nHeaderAction';
import N8nInput from '../N8nInput';
import N8nInputLabel from '../N8nInputLabel';
import N8nOption from '../N8nOption';
import N8nSelect from '../N8nSelect';

export default {
	title: 'Atoms/CollapsiblePanel',
	component: N8nCollapsiblePanel,
	argTypes: {
		modelValue: {
			control: 'boolean',
		},
		title: {
			control: 'text',
		},
		showActionsOnHover: {
			control: 'boolean',
		},
	},
	parameters: {
		backgrounds: { default: 'white' },
	},
	decorators: [
		() => ({
			template: '<div style="width: 60%; margin: 0 auto; padding-top: 20px;"><story /></div>',
		}),
	],
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => {
		const isOpen = ref(args.modelValue);
		return { args, isOpen };
	},
	props: Object.keys(argTypes),
	components: {
		N8nCollapsiblePanel,
		N8nInput,
		N8nInputLabel,
	},
	template: `
		<N8nCollapsiblePanel v-bind="args" v-model="isOpen">
			<div>
				<N8nInputLabel label="Value" :bold="false" size="small" />
				<N8nInput placeholder="Enter a value" size="small" />
			</div>
		</N8nCollapsiblePanel>
	`,
});

const DefaultWithActions: StoryFn = (args, { argTypes }) => ({
	setup: () => {
		const isOpen = ref(args.modelValue);
		return { args, isOpen };
	},
	props: Object.keys(argTypes),
	components: {
		N8nCollapsiblePanel,
		N8nHeaderAction,
		N8nInput,
		N8nInputLabel,
	},
	template: `
		<N8nCollapsiblePanel v-bind="args" v-model="isOpen">
			<template #actions>
				<N8nHeaderAction
					icon="trash-2"
					label="Delete"
					danger
					@click="() => console.log('delete')"
				/>
				<N8nHeaderAction
					icon="grip-vertical"
					label="Drag to reorder"
					@click="() => console.log('drag')"
				/>
			</template>
			<div>
				<N8nInputLabel label="Value" :bold="false" size="small" />
				<N8nInput placeholder="Enter a value" size="small" />
			</div>
		</N8nCollapsiblePanel>
	`,
});

export const Default = DefaultWithActions.bind({});
Default.args = {
	title: 'Query Parameter 1',
	modelValue: true,
	showActionsOnHover: true,
};

export const Collapsed = DefaultWithActions.bind({});
Collapsed.args = {
	...Default.args,
	modelValue: false,
};

export const WithoutActions = Template.bind({});
WithoutActions.args = {
	title: 'Query Parameter 1',
	modelValue: true,
};

const AlwaysVisibleTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => {
		const isOpen = ref(args.modelValue);
		return { args, isOpen };
	},
	props: Object.keys(argTypes),
	components: {
		N8nCollapsiblePanel,
		N8nHeaderAction,
		N8nInput,
		N8nInputLabel,
	},
	template: `
		<N8nCollapsiblePanel v-bind="args" v-model="isOpen">
			<template #actions>
				<N8nHeaderAction
					icon="plus"
					label="Add Parameter"
					@click="() => console.log('add')"
				/>
			</template>
			<div>
				<N8nInputLabel label="Value" :bold="false" size="small" />
				<N8nInput placeholder="Enter a value" size="small" />
			</div>
		</N8nCollapsiblePanel>
	`,
});

export const AlwaysVisibleActions = AlwaysVisibleTemplate.bind({});
AlwaysVisibleActions.args = {
	title: 'Parameters',
	modelValue: true,
	showActionsOnHover: false,
};

const MultipleTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => {
		const isOpen1 = ref(true);
		const isOpen2 = ref(false);
		const isOpen3 = ref(false);
		return { args, isOpen1, isOpen2, isOpen3 };
	},
	props: Object.keys(argTypes),
	components: {
		N8nCollapsiblePanel,
		N8nHeaderAction,
		N8nInput,
		N8nInputLabel,
	},
	template: `
		<div>
			<N8nCollapsiblePanel title="Query Parameter 1" v-model="isOpen1">
				<template #actions>
					<N8nHeaderAction icon="trash-2" label="Delete" danger @click="() => {}" />
					<N8nHeaderAction icon="grip-vertical" label="Drag to reorder" @click="() => {}" />
				</template>
				<div>
					<N8nInputLabel label="Name" :bold="false" size="small" />
					<N8nInput placeholder="eg. page" model-value="page" size="small" />
					<N8nInputLabel label="Value" :bold="false" size="small" style="margin-top: var(--spacing--xs);" />
					<N8nInput placeholder="1" model-value="1" size="small" />
				</div>
			</N8nCollapsiblePanel>

			<N8nCollapsiblePanel title="Query Parameter 2" v-model="isOpen2">
				<template #actions>
					<N8nHeaderAction icon="trash-2" label="Delete" danger @click="() => {}" />
					<N8nHeaderAction icon="grip-vertical" label="Drag to reorder" @click="() => {}" />
				</template>
				<div>
					<N8nInputLabel label="Name" :bold="false" size="small" />
					<N8nInput placeholder="eg. limit" model-value="limit" size="small" />
					<N8nInputLabel label="Value" :bold="false" size="small" style="margin-top: var(--spacing--xs);" />
					<N8nInput placeholder="10" model-value="10" size="small" />
				</div>
			</N8nCollapsiblePanel>

			<N8nCollapsiblePanel title="Query Parameter 3" v-model="isOpen3">
				<template #actions>
					<N8nHeaderAction icon="trash-2" label="Delete" danger @click="() => {}" />
					<N8nHeaderAction icon="grip-vertical" label="Drag to reorder" @click="() => {}" />
				</template>
				<div>
					<N8nInputLabel label="Name" :bold="false" size="small" />
					<N8nInput placeholder="eg. sort" model-value="sort" size="small" />
					<N8nInputLabel label="Value" :bold="false" size="small" style="margin-top: var(--spacing--xs);" />
					<N8nInput placeholder="asc" model-value="asc" size="small" />
				</div>
			</N8nCollapsiblePanel>
		</div>
	`,
});

export const MultipleItems = MultipleTemplate.bind({});

const NestedTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => {
		const isOpenPagination = ref(true);
		const isOpenParameters = ref(true);
		const isOpenParam1 = ref(true);
		const isOpenParam2 = ref(false);
		return { args, isOpenPagination, isOpenParameters, isOpenParam1, isOpenParam2 };
	},
	props: Object.keys(argTypes),
	components: {
		N8nCollapsiblePanel,
		N8nHeaderAction,
		N8nInput,
		N8nInputLabel,
		N8nSelect,
		N8nOption,
	},
	template: `
		<N8nCollapsiblePanel
			title="Pagination"
			v-model="isOpenPagination"
			data-item-key="pagination"
		>
			<div>
				<N8nInputLabel label="Pagination Mode" :bold="false" size="small" />
				<N8nSelect model-value="updateParameter" placeholder="Select pagination mode" size="small">
					<N8nOption value="updateParameter" label="Update a Parameter in Each Request" />
					<N8nOption value="responseUrl" label="URL From a Response" />
					<N8nOption value="responseData" label="Using a Response Data Key" />
				</N8nSelect>

				<N8nCollapsiblePanel
					title="Parameters"
					v-model="isOpenParameters"
					:show-actions-on-hover="false"
					style="margin-top: var(--spacing--xs);"
				>
					<template #actions>
						<N8nHeaderAction icon="plus" label="Add Parameter" @click="() => {}" />
					</template>
					<div style="padding-left: var(--spacing--xs);">
						<N8nCollapsiblePanel title="Query Parameter 1" v-model="isOpenParam1">
							<template #actions>
								<N8nHeaderAction icon="trash-2" label="Delete" danger @click="() => {}" />
								<N8nHeaderAction icon="grip-vertical" label="Drag to reorder" @click="() => {}" />
							</template>
							<div>
								<N8nInputLabel label="Type" :bold="false" size="small" />
								<N8nSelect model-value="query" placeholder="Select type" size="small">
									<N8nOption value="query" label="Query" />
									<N8nOption value="header" label="Header" />
								</N8nSelect>
								<N8nInputLabel label="Name" :bold="false" size="small" style="margin-top: var(--spacing--xs);" />
								<N8nInput placeholder="eg. page" model-value="page" size="small" />
								<N8nInputLabel label="Value" :bold="false" size="small" style="margin-top: var(--spacing--xs);" />
								<N8nInput placeholder="1" model-value="{{ $pageCount }}" size="small" />
							</div>
						</N8nCollapsiblePanel>
						<N8nCollapsiblePanel title="Query Parameter 2" v-model="isOpenParam2">
							<template #actions>
								<N8nHeaderAction icon="trash-2" label="Delete" danger @click="() => {}" />
								<N8nHeaderAction icon="grip-vertical" label="Drag to reorder" @click="() => {}" />
							</template>
							<div>
								<N8nInputLabel label="Type" :bold="false" size="small" />
								<N8nSelect model-value="header" placeholder="Select type" size="small">
									<N8nOption value="query" label="Query" />
									<N8nOption value="header" label="Header" />
								</N8nSelect>
								<N8nInputLabel label="Name" :bold="false" size="small" style="margin-top: var(--spacing--xs);" />
								<N8nInput placeholder="eg. limit" model-value="limit" size="small" />
								<N8nInputLabel label="Value" :bold="false" size="small" style="margin-top: var(--spacing--xs);" />
								<N8nInput placeholder="10" model-value="10" size="small" />
							</div>
						</N8nCollapsiblePanel>
					</div>
				</N8nCollapsiblePanel>

				<div style="margin-top: var(--spacing--xs);">
					<N8nInputLabel label="Pagination Complete When" :bold="false" size="small" />
					<N8nSelect model-value="responseEmpty" placeholder="Select condition" size="small">
						<N8nOption value="responseEmpty" label="Response Is Empty" />
						<N8nOption value="other" label="Other Condition" />
					</N8nSelect>
				</div>
			</div>
		</N8nCollapsiblePanel>
	`,
});

export const NestedCollections = NestedTemplate.bind({});
