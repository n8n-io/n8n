import mermaidUrl from 'mermaid/dist/mermaid.min.js?url&no-inline';
import sandboxScriptUrl from './skillMermaidSandbox.js?url&no-inline';

const RENDER_TIMEOUT_MS = 10_000;

// Each frame evaluates the whole Mermaid file, so a file with many diagrams must not start them all at once.
const MAX_CONCURRENT_RENDERS = 2;

export const MAX_DIAGRAM_LENGTH = 50_000;

/**
 * `invalid`: Mermaid rejects the source. `failed`: the sandbox replied without a diagram.
 * `timeout`: the sandbox did not reply, for example because a policy blocks its scripts.
 */
export type SkillMermaidResult =
	| { outcome: 'rendered'; svg: string }
	| { outcome: 'invalid' | 'failed' | 'timeout' | 'aborted' };

let activeRenders = 0;
const queuedRenders: Array<() => void> = [];

/** Resolves `true` when the render can start, or `false` if the signal aborts first. */
async function waitForRenderSlot(signal: AbortSignal): Promise<boolean> {
	return await new Promise<boolean>((resolve) => {
		const start = () => {
			signal.removeEventListener('abort', cancel);
			resolve(true);
		};
		const cancel = () => {
			queuedRenders.splice(queuedRenders.indexOf(start), 1);
			resolve(false);
		};
		queuedRenders.push(start);
		signal.addEventListener('abort', cancel, { once: true });
	});
}

function releaseRenderSlot() {
	// The next render in the queue takes the slot over.
	const next = queuedRenders.shift();
	if (next) next();
	else activeRenders--;
}

function sandboxDocument() {
	// srcdoc inherits the editor's policy. Vite exposes the response nonce in this tag.
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
	renderer.src = sandboxScriptUrl;

	return `<!doctype html><html><head>${policy.outerHTML}${mermaid.outerHTML}${renderer.outerHTML}</head><body style="margin: 0"></body></html>`;
}

export async function renderSkillMermaid(
	code: string,
	theme: 'default' | 'dark',
	width: number,
	signal: AbortSignal,
): Promise<SkillMermaidResult> {
	if (signal.aborted) return { outcome: 'aborted' };
	if (activeRenders < MAX_CONCURRENT_RENDERS) activeRenders++;
	else if (!(await waitForRenderSlot(signal))) return { outcome: 'aborted' };

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
	let onAbort: (() => void) | undefined;
	try {
		return await new Promise<SkillMermaidResult>((resolve) => {
			onAbort = () => resolve({ outcome: 'aborted' });
			signal.addEventListener('abort', onAbort);
			// The limit starts with the frame, so the wait in the queue does not count.
			timer = window.setTimeout(() => resolve({ outcome: 'timeout' }), RENDER_TIMEOUT_MS);
			port1.onmessage = ({ data }: MessageEvent<unknown>) => {
				if (typeof data === 'string') resolve({ outcome: 'rendered', svg: data });
				else resolve({ outcome: data === null ? 'invalid' : 'failed' });
			};
			frame.onload = () =>
				frame.contentWindow?.postMessage({ code, theme, maxTextSize: MAX_DIAGRAM_LENGTH }, '*', [
					port2,
				]);
			document.body.append(frame);
		});
	} finally {
		if (onAbort) signal.removeEventListener('abort', onAbort);
		window.clearTimeout(timer);
		port1.close();
		port2.close();
		frame.remove();
		releaseRenderSlot();
	}
}
