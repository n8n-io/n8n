// This script runs inside the sandbox. The viewer sends diagram source as data.
async function onMessage(event) {
	if (event.source !== window.parent) return;
	// Keep the listener until the viewer sends its request.
	window.removeEventListener('message', onMessage);
	const { code, theme, maxTextSize } = event.data;
	let svg;
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
		if (parsed && parsed.diagramType !== 'error') {
			({ svg } = await mermaid.render('skill-diagram', code, document.body));
		}
	} catch {
		// The viewer keeps the source if rendering fails.
	}
	event.ports[0].postMessage(svg);
}

window.addEventListener('message', onMessage);
