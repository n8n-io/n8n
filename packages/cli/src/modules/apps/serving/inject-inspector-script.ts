const SCRIPT_TAG = '<script src="/apps-inspector.js" defer></script>';

/**
 * Adds the element-picker script tag to a served App document. Inserted before
 * `</body>` so it runs after the app's own content; appended when a build's HTML
 * has no `</body>` at all, rather than silently doing nothing.
 */
export function injectInspectorScript(html: string): string {
	const bodyClose = html.lastIndexOf('</body>');
	if (bodyClose === -1) return html + SCRIPT_TAG;
	return html.slice(0, bodyClose) + SCRIPT_TAG + html.slice(bodyClose);
}
