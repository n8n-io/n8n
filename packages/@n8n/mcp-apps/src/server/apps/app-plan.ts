import type { McpUiResourceMeta } from '@modelcontextprotocol/ext-apps';

import { APP_PLAN_APP_URI, RESOURCE_MIME_TYPE } from '../constants';
import type { McpAppResourceServer } from './workflow-preview';

/**
 * A minimal MCP App: it completes the host handshake, waits for the tool
 * result, and replaces itself with the wireframe document in
 * `structuredContent.html`. The wireframe brings its own hover overlay.
 */
const APP_PLAN_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;font:13px system-ui,sans-serif;color:#666}p{padding:16px}</style></head>
<body><p>Loading the app plan…</p><script>
(function () {
	var nextId = 1;
	var pending = {};
	function send(message) { window.parent.postMessage(message, '*'); }
	function request(method, params) {
		var id = nextId++;
		send({ jsonrpc: '2.0', id: id, method: method, params: params });
		return new Promise(function (resolve) { pending[id] = resolve; });
	}
	window.addEventListener('message', function (event) {
		if (event.source !== window.parent) return;
		var message = event.data;
		if (!message || message.jsonrpc !== '2.0') return;
		if (message.id !== undefined && pending[message.id]) {
			pending[message.id](message.result);
			delete pending[message.id];
			return;
		}
		if (message.method !== 'ui/notifications/tool-result') return;
		var content = message.params && message.params.structuredContent;
		if (!content || typeof content.html !== 'string') return;
		send({ jsonrpc: '2.0', method: 'ui/notifications/size-changed', params: { height: 720 } });
		document.open();
		document.write(content.html);
		document.close();
	});
	request('ui/initialize', {
		appInfo: { name: 'n8n app plan', version: '0.1.0' },
		appCapabilities: {},
		protocolVersion: '2026-01-26',
	}).then(function () {
		send({ jsonrpc: '2.0', method: 'ui/notifications/initialized', params: {} });
	});
})();
</script></body></html>
`;

const uiMeta: McpUiResourceMeta = {
	csp: { resourceDomains: ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'] },
	prefersBorder: true,
};

export function registerAppPlanApp(server: McpAppResourceServer): void {
	server.registerResource(
		'app-plan',
		APP_PLAN_APP_URI,
		{
			description: 'Wireframe of an n8n App plan',
			mimeType: RESOURCE_MIME_TYPE,
			_meta: { ui: uiMeta },
		},
		// eslint-disable-next-line @typescript-eslint/require-await
		async () => ({
			contents: [
				{
					uri: APP_PLAN_APP_URI,
					mimeType: RESOURCE_MIME_TYPE,
					text: APP_PLAN_HTML,
					_meta: { ui: uiMeta },
				},
			],
		}),
	);
}

export { APP_PLAN_HTML };
