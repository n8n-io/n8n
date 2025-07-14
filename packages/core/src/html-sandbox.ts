/**
 * Sandboxes the HTML response to prevent possible exploitation. Embeds the
 * response in an iframe to make sure the HTML has a different origin.
 */
export const sandboxHtmlResponse = (html: string) => {
	// Escape & and " as mentioned in the spec:
	// https://html.spec.whatwg.org/multipage/iframe-embed-object.html#the-iframe-element
	const escapedHtml = html.replaceAll('&', '&amp;').replaceAll('"', '&quot;');

	return `
		<iframe srcdoc="${escapedHtml}" sandbox="allow-scripts allow-forms allow-popups allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
			style="position:fixed; top:0; left:0; width:100vw; height:100vh; border:none; overflow:auto;"
			allowtransparency="true">
		</iframe>`;
};

/**
 * Checks if the given content type is something a browser might render
 * as HTML.
 */
export const isHtmlRenderedContentType = (contentType: string) => {
	const contentTypeLower = contentType.toLowerCase();

	return (
		// The content-type can also contain a charset, e.g. "text/html; charset=utf-8"
		contentTypeLower.startsWith('text/html') || contentTypeLower.startsWith('application/xhtml+xml')
	);
};
