// This script runs inside the sandbox. The viewer sends diagram source as data.
async function onMessage(event) {
	if (event.source !== window.parent) return;
	// Keep the listener until the viewer sends its request.
	window.removeEventListener('message', onMessage);
	const { code, theme, maxTextSize } = event.data;
	// A string is the diagram. `null` says that Mermaid rejects the source.
	// `false` says that the render failed for another reason.
	let reply = false;
	try {
		const { mermaid } = window;
		mermaid.initialize({
			startOnLoad: false,
			securityLevel: 'strict',
			suppressErrorRendering: true,
			maxTextSize,
			htmlLabels: false,
			theme,
		});
		const parsed = await mermaid.parse(code, { suppressErrors: true });
		if (!parsed || parsed.diagramType === 'error') {
			reply = null;
		} else {
			reply = (await mermaid.render('skill-diagram', code, document.body)).svg;
		}
	} catch {
		// The viewer keeps the source if rendering fails.
	}
	event.ports[0].postMessage(reply);
}

window.addEventListener('message', onMessage);
