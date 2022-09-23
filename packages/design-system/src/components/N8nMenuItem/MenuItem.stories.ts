import N8nMenuItem from "."
import N8nMenu from "../N8nMenu";
import { StoryFn } from '@storybook/vue';

export default {
	title: 'Atoms/MenuItem',
	component: N8nMenuItem,
};

const template: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: { N8nMenu, N8nMenuItem },
	template: `
		<n8n-menu>
			<n8n-menu-item v-bind="$props" />
		</n8n-menu>
	`
});

export const defaultMenuItem = template.bind({});
defaultMenuItem.args = {
	item: {
		id: 'workflows',
		icon: 'heart',
		label: 'Workflows',
	}
};

export const link = template.bind({});
link.args = {
	item: {
		id: 'website',
		icon: 'globe',
		label: 'Website',
		type: 'link',
		properties: {
			href: 'https://www.n8n.io',
			newWindow: true,
		},
	},
};

export const withChildren = template.bind({});
withChildren.args = {
	item: {
		id: 'help',
		icon: 'question',
		label: 'Help',
		children: [
			{ icon: 'info', label: 'About n8n', id: 'about' },
			{ icon: 'book', label: 'Documentation', id: 'docs' },
			{
				id: 'quickstart',
				icon: 'video',
				label: 'Quickstart',
				type: 'link',
				properties: {
					href: 'https://www.youtube.com/watch?v=RpjQTGKm-ok',
					newWindow: true,
				},
			},
		]
	}
};
