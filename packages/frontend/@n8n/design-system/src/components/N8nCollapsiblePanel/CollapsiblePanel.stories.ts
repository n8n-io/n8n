import type { StoryFn } from '@storybook/vue3-vite';
import { ElSwitch } from 'element-plus';
import { ref } from 'vue';

import N8nButton from '../N8nButton';
import N8nCollapsiblePanel from './CollapsiblePanel.vue';
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

export const Default = Template.bind({});
Default.args = {
	title: 'Query Parameter 1',
	modelValue: true,
	showActionsOnHover: true,
	actions: [
		{
			icon: 'grip-vertical',
			label: 'Drag to reorder',
			onClick: () => console.log('drag'),
		},
		{
			icon: 'trash-2',
			label: 'Delete',
			onClick: () => console.log('delete'),
		},
	],
};

export const Collapsed = Template.bind({});
Collapsed.args = {
	...Default.args,
	modelValue: false,
};

export const WithoutActions = Template.bind({});
WithoutActions.args = {
	title: 'Query Parameter 1',
	modelValue: true,
	actions: [],
};

export const ReadOnly = Template.bind({});
ReadOnly.args = {
	title: 'Query Parameter 1',
	modelValue: true,
	actions: [],
};

export const AlwaysVisibleActions = Template.bind({});
AlwaysVisibleActions.args = {
	title: 'Parameters',
	modelValue: true,
	showActionsOnHover: false,
	actions: [
		{
			icon: 'plus',
			label: 'Add Parameter',
			onClick: () => console.log('add'),
		},
	],
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
		N8nInput,
		N8nInputLabel,
	},
	template: `
		<div>
			<N8nCollapsiblePanel
				title="Query Parameter 1"
				v-model="isOpen1"
				:actions="[
					{ icon: 'grip-vertical', label: 'Drag to reorder', onClick: () => {} },
					{ icon: 'trash-2', label: 'Delete', onClick: () => {} }
				]"
			>
				<div>
					<N8nInputLabel label="Name" :bold="false" size="small" />
					<N8nInput placeholder="eg. page" model-value="page" size="small" />
					<N8nInputLabel label="Value" :bold="false" size="small" style="margin-top: 12px;" />
					<N8nInput placeholder="1" model-value="1" size="small" />
				</div>
			</N8nCollapsiblePanel>

			<N8nCollapsiblePanel
				title="Query Parameter 2"
				v-model="isOpen2"
				:actions="[
					{ icon: 'grip-vertical', label: 'Drag to reorder', onClick: () => {} },
					{ icon: 'trash-2', label: 'Delete', onClick: () => {} }
				]"
			>
				<div>
					<N8nInputLabel label="Name" :bold="false" size="small" />
					<N8nInput placeholder="eg. limit" model-value="limit" size="small" />
					<N8nInputLabel label="Value" :bold="false" size="small" style="margin-top: 12px;" />
					<N8nInput placeholder="10" model-value="10" size="small" />
				</div>
			</N8nCollapsiblePanel>

			<N8nCollapsiblePanel
				title="Query Parameter 3"
				v-model="isOpen3"
				:actions="[
					{ icon: 'grip-vertical', label: 'Drag to reorder', onClick: () => {} },
					{ icon: 'trash-2', label: 'Delete', onClick: () => {} }
				]"
			>
				<div>
					<N8nInputLabel label="Name" :bold="false" size="small" />
					<N8nInput placeholder="eg. sort" model-value="sort" size="small" />
					<N8nInputLabel label="Value" :bold="false" size="small" style="margin-top: 12px;" />
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
		return { args, isOpenPagination, isOpenParameters, isOpenParam1 };
	},
	props: Object.keys(argTypes),
	components: {
		N8nButton,
		N8nCollapsiblePanel,
		ElSwitch,
		N8nInput,
		N8nInputLabel,
		N8nSelect,
		N8nOption,
	},
	template: `
		<div>
			<N8nCollapsiblePanel
				title="Pagination"
				v-model="isOpenPagination"
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
						:actions="[{ icon: 'plus', label: 'Add Parameter', onClick: () => {} }]"
						style="margin-top: 12px;"
					>
						<N8nCollapsiblePanel
							title="Query Parameter 1"
							v-model="isOpenParam1"
							:actions="[
								{ icon: 'trash-2', label: 'Delete', onClick: () => {} },
								{ icon: 'grip-vertical', label: 'Drag to reorder', onClick: () => {} }
							]"
						>
							<div>
								<N8nInputLabel label="Type" :bold="false" size="small" />
								<N8nSelect model-value="query" placeholder="Select type" size="small">
									<N8nOption value="query" label="Query" />
									<N8nOption value="header" label="Header" />
								</N8nSelect>
								<N8nInputLabel label="Name" :bold="false" size="small" style="margin-top: 12px;" />
								<N8nInput placeholder="eg. page" model-value="page" size="small" />
								<N8nInputLabel label="Value" :bold="false" size="small" style="margin-top: 12px;" />
								<N8nInput placeholder="1" model-value="{{ $pageCount }}" size="small" />
								<div style="margin-top: 12px; color: var(--color--text--tint-2); font-size: var(--font-size--2xs);">
									Use expression mode and $response to access response data
								</div>
							</div>
						</N8nCollapsiblePanel>
						<div style="margin-top: 12px;">
							<N8nButton size="small" type="secondary" icon="plus" label="Add Parameter" />
						</div>
					</N8nCollapsiblePanel>

					<div style="margin-top: 12px;">
						<N8nInputLabel label="Pagination Complete When" :bold="false" size="small" />
						<N8nSelect model-value="responseEmpty" placeholder="Select condition" size="small">
							<N8nOption value="responseEmpty" label="Response Is Empty" />
							<N8nOption value="other" label="Other Condition" />
						</N8nSelect>
					</div>

					<div style="margin-top: 12px;">
						<N8nInputLabel label="Limit Pages Fetched" :bold="false" size="small" />
						<ElSwitch :model-value="false" />
					</div>

					<div style="margin-top: 12px;">
						<N8nInputLabel label="Interval Between Requests (ms)" :bold="false" size="small" />
						<N8nInput placeholder="0" model-value="0" size="small" />
						<div style="margin-top: 4px; color: var(--color--text--tint-2); font-size: var(--font-size--2xs);">
							At 0 no delay will be added
						</div>
					</div>

					<div style="margin-top: 12px;">
						<N8nButton size="small" type="secondary" icon="plus" label="Add Option" />
					</div>
				</div>
			</N8nCollapsiblePanel>
		</div>
	`,
});

export const NestedCollections = NestedTemplate.bind({});

const SubtitleTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => {
		const isOpen1 = ref(true);
		const isOpen2 = ref(false);
		const isOpen3 = ref(true);
		return { args, isOpen1, isOpen2, isOpen3 };
	},
	props: Object.keys(argTypes),
	components: {
		N8nCollapsiblePanel,
		N8nInput,
		N8nInputLabel,
	},
	template: `
		<div>
			<N8nCollapsiblePanel
				title="Query Parameter 1"
				subtitle="page"
				v-model="isOpen1"
				:actions="[
					{ icon: 'grip-vertical', label: 'Drag to reorder', onClick: () => {} },
					{ icon: 'trash-2', label: 'Delete', onClick: () => {} }
				]"
			>
				<div>
					<N8nInputLabel label="Name" :bold="false" size="small" />
					<N8nInput placeholder="eg. page" model-value="page" size="small" />
					<N8nInputLabel label="Value" :bold="false" size="small" style="margin-top: 12px;" />
					<N8nInput placeholder="1" model-value="1" size="small" />
				</div>
			</N8nCollapsiblePanel>

			<N8nCollapsiblePanel
				title="Query Parameter 2"
				subtitle="limit"
				v-model="isOpen2"
				:actions="[
					{ icon: 'grip-vertical', label: 'Drag to reorder', onClick: () => {} },
					{ icon: 'trash-2', label: 'Delete', onClick: () => {} }
				]"
			>
				<div>
					<N8nInputLabel label="Name" :bold="false" size="small" />
					<N8nInput placeholder="eg. limit" model-value="limit" size="small" />
					<N8nInputLabel label="Value" :bold="false" size="small" style="margin-top: 12px;" />
					<N8nInput placeholder="10" model-value="10" size="small" />
				</div>
			</N8nCollapsiblePanel>

			<N8nCollapsiblePanel
				title="Query Parameter 3"
				subtitle="This is a very long subtitle that should be truncated with ellipsis when it overflows the available space"
				v-model="isOpen3"
				:actions="[
					{ icon: 'grip-vertical', label: 'Drag to reorder', onClick: () => {} },
					{ icon: 'trash-2', label: 'Delete', onClick: () => {} }
				]"
			>
				<div>
					<N8nInputLabel label="Name" :bold="false" size="small" />
					<N8nInput placeholder="eg. sort" model-value="sort" size="small" />
					<N8nInputLabel label="Value" :bold="false" size="small" style="margin-top: 12px;" />
					<N8nInput placeholder="asc" model-value="asc" size="small" />
				</div>
			</N8nCollapsiblePanel>
		</div>
	`,
});

export const WithSubtitles = SubtitleTemplate.bind({});
