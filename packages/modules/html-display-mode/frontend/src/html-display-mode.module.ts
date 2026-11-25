import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { HTML_NODE_TYPE } from 'n8n-workflow';

const HtmlDisplayModeView = async () => await import('./HtmlDisplayModeView.vue');

export const HtmlDisplayModeModule = defineFrontendModule({
	id: 'html-display-mode',
	name: 'HTML display mode',
	description: 'Show the HTML that the HTML node generates',
	icon: 'file-code',
	runDataDisplayModes: [
		{
			id: 'html',
			label: () => useI18n().baseText('runData.html'),
			icon: 'file-code',
			component: HtmlDisplayModeView,
			canRender: ({ node, pane }) =>
				pane === 'output' &&
				node.type === HTML_NODE_TYPE &&
				node.parameters.operation === 'generateHtmlTemplate',
			autoSelect: true,
			supports: { search: true },
		},
	],
});
