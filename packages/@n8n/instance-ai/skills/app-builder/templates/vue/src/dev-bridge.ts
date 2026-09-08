import type { ErrorPayload } from 'vite';

// Reports compile and runtime errors to the n8n editor that embeds the live
// preview, so they reach the assistant with the user's next message. Loaded
// only by `vite dev` (see main.ts); a build never includes this file.

type PreviewDiagnostic = {
	kind: 'vite-error' | 'uncaught';
	message: string;
	file?: string;
	line?: number;
	column?: number;
	stack?: string;
};

// The document runs on an opaque origin but still knows its own URL, which is the editor's origin.
const parentOrigin = new URL(location.href).origin;

const post = (diagnostic: PreviewDiagnostic): void => {
	if (window.parent === window) return;
	window.parent.postMessage(
		{ source: 'n8n-app-preview', v: 1, at: new Date().toISOString(), ...diagnostic },
		parentOrigin,
	);
};

const clip = (value: unknown, max: number): string => String(value).slice(0, max);

import.meta.hot?.on('vite:error', (payload: ErrorPayload) => {
	post({
		kind: 'vite-error',
		message: clip(payload.err.message, 2048),
		file: payload.err.id ?? payload.err.loc?.file,
		line: payload.err.loc?.line,
		column: payload.err.loc?.column,
	});
});

window.addEventListener('error', (event) => {
	const stack = event.error instanceof Error ? event.error.stack : undefined;
	post({
		kind: 'uncaught',
		message: clip(event.message, 2048),
		file: event.filename || undefined,
		line: event.lineno || undefined,
		column: event.colno || undefined,
		stack: stack ? clip(stack, 4096) : undefined,
	});
});

window.addEventListener('unhandledrejection', (event) => {
	const reason: unknown = event.reason;
	const error = reason instanceof Error ? reason : undefined;
	post({
		kind: 'uncaught',
		message: clip(error?.message ?? reason, 2048),
		stack: error?.stack ? clip(error.stack, 4096) : undefined,
	});
});
