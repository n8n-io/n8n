const { mergeConfig } = require('vite');
const { resolve } = require('path');

module.exports = {
	stories: [
		'../src/styleguide/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nActionBox/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nActionDropdown/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nActionToggle/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nAlert/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nAvatar/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nBadge/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nBlockUi/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nButton/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nCallout/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nCard/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nDatatable/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nHeading/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nIcon/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nIconButton/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nInfoAccordion/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nInfoTip/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nInput/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nInputLabel/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nInputNumber/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nLink/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nLoading/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nMarkdown/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nMenu/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nMenuItem/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nNodeCreatorNode/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nNodeIcon/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nNotice/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nOption/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nPulse/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nPopover/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nRadioButtons/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nSelect/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nSpinner/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nSticky/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nTabs/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nTag/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nTags/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nText/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nTooltip/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nTree/*.stories.@(js|jsx|ts|tsx)',
		'../src/components/N8nUserInfo/*.stories.@(js|jsx|ts|tsx)',
	],
	addons: [
		'@storybook/addon-styling',
		'@storybook/addon-links',
		'@storybook/addon-essentials',
		// Disabled until this is actually used rather otherwise its a blank tab
		// '@storybook/addon-interactions',
		'@storybook/addon-a11y',
		'storybook-dark-mode',
	],
	staticDirs: ['../public'],
	framework: {
		name: '@storybook/vue3-vite',
		options: {},
	},
	disableTelemetry: true,
	async viteFinal(config, { configType }) {
		// return the customized config
		return mergeConfig(config, {
			// customize the Vite config here
			resolve: {
				alias: [
					{
						find: /^@n8n-design-system\//,
						replacement: `${resolve(__dirname, '..')}/src/`,
					},
				],
			},
			define: { 'process.env': {} },
		});
	},
	docs: {
		autodocs: true,
	},
};
