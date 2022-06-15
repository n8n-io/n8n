import { StoryFn } from "@storybook/vue";
import N8nHeaderMessage from '.';
import N8nInfoTip from '../N8nInfoTip';
import N8nLink from '../N8nLink';

export default {
	title: 'Atoms/HeaderMessage',
	component: N8nHeaderMessage,
	argTypes: {
		theme: {
			control: 'select',
			options: ['secondary'],
		},
	},
	parameters: {
		design: {
			type: 'figma',
			url: 'https://www.figma.com/file/tPpJvbrnHbP8C496cYuwyW/Node-pinning?node-id=15%3A5777',
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nHeaderMessage,
		N8nInfoTip,
		N8nLink,
	},
	template: `
		<n8n-header-message v-bind="$props">
			${args.message}
		</n8n-header-message>
	`,
});

export const withTrailingLink = Template.bind({});

withTrailingLink.args = {
	theme: 'secondary',
	message: 'Here is a message.',
	actionText: 'Action',
	trailingLinkText: 'Click me',
	trailingLinkUrl: 'https://n8n.io',
};

export const withTrailingIcon = Template.bind({});

withTrailingIcon.args = {
	theme: 'secondary',
	message: 'Here is another message.',
	actionText: 'Action',
	trailingIcon: 'star',
};

export const withInfoTip = Template.bind({});

withInfoTip.args = {
	theme: 'secondary',
	message: `
		<n8n-info-tip v-bind="$props" :icon="'thumbtack'">
			This data is pinned.
		</n8n-info-tip>
	`,
	actionText: 'Unpin',
	trailingLinkText: 'Learn more',
	trailingLinkUrl: 'https://n8n.io',
};
