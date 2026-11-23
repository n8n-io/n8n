import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { HTML_NODE_TYPE } from 'n8n-workflow';

const HtmlDisplayModeView = async () => await import('./HtmlDisplayModeView.vue');

export const HtmlDisplayModeModule = defineFrontendModule({
	// No backend twin, so `isModuleActive` is always false. Display modes register regardless.
	id: 'html-display-mode',
	name: 'HTML display mode',
	description: 'Show the HTML that the HTML node generates',
	icon: 'file-code',
	runDataDisplayModes: [
		{
			// Stored choices, telemetry and end-to-end tests use this id
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
