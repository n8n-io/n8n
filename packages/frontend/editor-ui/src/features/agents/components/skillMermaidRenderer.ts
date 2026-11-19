import mermaidUrl from 'mermaid/dist/mermaid.min.js?url&no-inline';

const RENDER_TIMEOUT_MS = 10_000;

export const MAX_DIAGRAM_LENGTH = 50_000;

// The sandbox runs this script. Send diagram source as data, never as markup.
const bootstrap = `
window.addEventListener('message', async (event) => {
	if (event.source !== window.parent) return;
	const { code, theme } = event.data;
	let svg;
	try {
		mermaid.initialize({
			startOnLoad: false,
			securityLevel: 'strict',
			suppressErrorRendering: true,
			maxTextSize: ${MAX_DIAGRAM_LENGTH},
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
}, { once: true });
`;

function sandboxDocument() {
	// srcdoc inherits the editor's policy. Only these two trusted scripts need its nonce.
	const editorNonce = document.querySelector<HTMLMetaElement>('meta[property="csp-nonce"]')?.nonce;
	const nonce =
		editorNonce && /^[\w+/=-]+$/.test(editorNonce)
			? editorNonce
			: btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
	const policy = document.createElement('meta');
	policy.httpEquiv = 'Content-Security-Policy';
	policy.content = `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src data:`;
	const mermaid = document.createElement('script');
	mermaid.setAttribute('nonce', nonce);
	mermaid.src = mermaidUrl;
	const renderer = document.createElement('script');
	renderer.setAttribute('nonce', nonce);
	renderer.textContent = bootstrap;

	return `<!doctype html><html><head>${policy.outerHTML}${mermaid.outerHTML}${renderer.outerHTML}</head><body style="margin: 0"></body></html>`;
}

export async function renderSkillMermaid(
	code: string,
	theme: 'default' | 'dark',
	width: number,
	signal: AbortSignal,
): Promise<string | undefined> {
	if (signal.aborted) return;

	// Each render has its own document and Mermaid queue.
	const frame = document.createElement('iframe');
	frame.setAttribute('sandbox', 'allow-scripts');
	frame.setAttribute('aria-hidden', 'true');
	frame.tabIndex = -1;
	frame.referrerPolicy = 'no-referrer';
	frame.width = String(width);
	frame.height = '0';
	frame.style.cssText = 'position: fixed; visibility: hidden; border: 0';
	frame.srcdoc = sandboxDocument();

	const { port1, port2 } = new MessageChannel();
	let timer: number | undefined;
	let fallback: (() => void) | undefined;
	try {
		return await new Promise<string | undefined>((resolve) => {
			fallback = () => resolve(undefined);
			signal.addEventListener('abort', fallback);
			timer = window.setTimeout(fallback, RENDER_TIMEOUT_MS);
			port1.onmessage = ({ data }: MessageEvent<unknown>) => {
				resolve(typeof data === 'string' ? data : undefined);
			};
			frame.onload = () => frame.contentWindow?.postMessage({ code, theme }, '*', [port2]);
			document.body.append(frame);
		});
	} finally {
		if (fallback) signal.removeEventListener('abort', fallback);
		window.clearTimeout(timer);
		port1.close();
		port2.close();
		frame.remove();
	}
}
