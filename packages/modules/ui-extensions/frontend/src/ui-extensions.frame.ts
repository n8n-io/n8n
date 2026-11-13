import { UI_EXTENSION_VIEW_FACTORY_GLOBAL } from '@n8n/api-types';

import type { ViewRuntimeAssets } from './ui-extensions.types';

/**
 * The policy of the view frame. The frame cannot fetch, open sockets or load
 * images from the network. Its scripts load from `data:` URLs, and
 * `unsafe-eval` lets Vue compile the `template` of a view.
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
 * Scripts go in as `data:` URLs, not as inline text: an inline script ends at
 * the first `</script` in it, and HTML parses `<!--` in it specially.
 */
function scriptUrl(text: string): string {
	return `data:text/javascript;base64,${toBase64(text)}`;
}

function runtimeUrl(runtime: ViewRuntimeAssets): string {
	let url = runtimeUrls.get(runtime);
	if (!url) {
		url = scriptUrl(runtime.js);
		runtimeUrls.set(runtime, url);
	}
	return url;
}

/**
 * Turns the source of a view into the view script of the frame. A view is one
 * ES module with no imports, and its default export is the component. The
 * script sets a factory that runs the module with the `Vue` and `n8n` globals.
 * Throws an error that names the problem when the source is not a view.
 */
export function viewSourceToScript(source: string): string {
	if (/^\s*import[\s{*]/m.test(source)) {
		throw new Error('A view cannot use import statements. Use the Vue and n8n globals.');
	}
	const exports = source.match(/\bexport\s+default\b/g) ?? [];
	if (exports.length !== 1) {
		throw new Error('A view must have exactly one "export default".');
	}

	const body = source.replace(/\bexport\s+default\b/, 'return ');
	return `window.${UI_EXTENSION_VIEW_FACTORY_GLOBAL} = function (Vue, n8n) {\n"use strict";\n${body}\n};\n`;
}

function escapeAttribute(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * Builds the `srcdoc` of a view frame. Throws when the source is not a view.
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
	const viewScript = viewSourceToScript(source);
	const css = runtime.css.replace(/<\/style/gi, '<\\/style');
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
		`<script${nonceAttribute} src="${runtimeUrl(runtime)}"></script>`,
		`<script${nonceAttribute} src="${scriptUrl(viewScript)}"></script>`,
		'</body>',
		'</html>',
	].join('\n');
}
