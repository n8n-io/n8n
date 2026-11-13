import type { ViewRuntimeAssets } from './ui-extensions.types';

/**
 * The policy of the view frame. The frame cannot fetch, open sockets or load
 * images from the network. `unsafe-eval` lets the runtime run the view module
 * and compile its template. The runtime loads from a `data:` URL.
 */
export const VIEW_FRAME_CONTENT_SECURITY_POLICY = [
	"default-src 'none'",
	"script-src data: 'unsafe-eval'",
	"style-src 'unsafe-inline'",
	'img-src data:',
	'font-src data:',
	"connect-src 'none'",
	"form-action 'none'",
	"base-uri 'none'",
].join('; ');

/** The `sandbox` of the view frame. Scripts run, with an opaque origin and nothing more. */
export const VIEW_FRAME_SANDBOX = 'allow-scripts';

const runtimeUrls = new WeakMap<ViewRuntimeAssets, string>();

function toBase64(text: string): string {
	const bytes = new TextEncoder().encode(text);
	let binary = '';
	const chunkSize = 0x8000;
	for (let index = 0; index < bytes.length; index += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
	}
	return btoa(binary);
}

/**
 * The runtime goes in as a `data:` URL, not as inline text: an inline script
 * ends at the first `</script` in it, and HTML parses `<!--` in it specially.
 */
function runtimeUrl(runtime: ViewRuntimeAssets): string {
	let url = runtimeUrls.get(runtime);
	if (!url) {
		url = `data:text/javascript;base64,${toBase64(runtime.js)}`;
		runtimeUrls.set(runtime, url);
	}
	return url;
}

function escapeAttribute(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * Builds the `srcdoc` of a view frame. The view source goes in as JSON with `<`
 * escaped, so no source can close its script element.
 */
export function buildViewDocument({
	runtime,
	source,
	nonce,
	theme,
}: {
	runtime: ViewRuntimeAssets;
	source: string;
	/** The script nonce of the editor page. A `srcdoc` frame inherits its policy. */
	nonce?: string;
	theme?: 'light' | 'dark';
}): string {
	const css = runtime.css.replace(/<\/style/gi, '<\\/style');
	const sourceJson = JSON.stringify(source).replace(/</g, '\\u003c');
	const nonceAttribute = nonce ? ` nonce="${escapeAttribute(nonce)}"` : '';
	const themeAttribute = theme ? ` data-theme="${theme}"` : '';

	return [
		'<!doctype html>',
		'<html>',
		'<head>',
		'<meta charset="utf-8">',
		`<meta http-equiv="Content-Security-Policy" content="${VIEW_FRAME_CONTENT_SECURITY_POLICY}">`,
		`<style>${css}</style>`,
		'</head>',
		`<body${themeAttribute}>`,
		'<div id="app"></div>',
		`<script type="application/json" id="view-source">${sourceJson}</script>`,
		`<script${nonceAttribute} src="${runtimeUrl(runtime)}"></script>`,
		'</body>',
		'</html>',
	].join('\n');
}
