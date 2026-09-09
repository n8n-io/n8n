import type { ErrorPayload } from 'vite';

// Reports compile and runtime errors to the n8n editor that embeds the live
// preview, so they reach the assistant with the user's next message. Loaded by
// `vite dev` and by n8n's preview build (see main.ts); a publish build never
// includes this file.

type PreviewDiagnostic = {
	kind: 'vite-error' | 'uncaught';
	message: string;
	file?: string;
	line?: number;
	column?: number;
	stack?: string;
};

// The document runs on an opaque origin (`location.origin` is "null") but still
// knows its own URL, which is the editor's origin.
const parentOrigin = new URL(location.href).origin;

const post = (diagnostic: PreviewDiagnostic): void => {
	if (window.parent === window) return;
	window.parent.postMessage(
		{ source: 'n8n-app-preview', v: 1, at: new Date().toISOString(), ...diagnostic },
		parentOrigin,
	);
};

const clip = (value: string, max: number): string => value.slice(0, max);

// The dev server's base is the preview's capability URL; script URLs in file
// names and stack frames must not carry it into the reported diagnostics.
const base = import.meta.env.BASE_URL;
const secretPrefixes = base === '/' ? [] : [parentOrigin + base, base];
const stripBase = (value: string): string =>
	secretPrefixes.reduce((result, prefix) => result.split(prefix).join('/'), value);

const messageOf = (value: unknown): string => clip(stripBase(String(value)), 2048);
const fileOf = (value: string | undefined): string | undefined =>
	value ? clip(stripBase(value), 512) : undefined;
const stackOf = (value: string | undefined): string | undefined =>
	value ? clip(stripBase(value), 4096) : undefined;

type AppFrame = { file: string; line: number; column: number };

// An uncaught error surfaces in the framework chunk that called the app code;
// the app's own frame is the first `/src/` one in the stripped stack. Chrome:
// `at boom (/src/pages/Home.vue?t=1:7:13)`, Firefox: `boom@/src/pages/Home.vue:7:13`.
const appFrameOf = (stack: string | undefined): AppFrame | undefined => {
	const match = stack ? /(?:^|[\s(@])(\/src\/[^\s()]*?):(\d+):(\d+)/.exec(stack) : null;
	return match ? { file: match[1], line: Number(match[2]), column: Number(match[3]) } : undefined;
};

import.meta.hot?.on('vite:error', (payload: ErrorPayload) => {
	post({
		kind: 'vite-error',
		message: messageOf(payload.err.message),
		file: fileOf(payload.err.id ?? payload.err.loc?.file),
		line: payload.err.loc?.line,
		column: payload.err.loc?.column,
	});
});

window.addEventListener('error', (event) => {
	const stack = stackOf(event.error instanceof Error ? event.error.stack : undefined);
	const frame = appFrameOf(stack);
	post({
		kind: 'uncaught',
		message: messageOf(event.message),
		file: fileOf(frame?.file ?? (event.filename || undefined)),
		line: frame?.line ?? (event.lineno || undefined),
		column: frame?.column ?? (event.colno || undefined),
		stack,
	});
});

window.addEventListener('unhandledrejection', (event) => {
	const reason: unknown = event.reason;
	const error = reason instanceof Error ? reason : undefined;
	const stack = stackOf(error?.stack);
	post({
		kind: 'uncaught',
		message: messageOf(error?.message ?? reason),
		...appFrameOf(stack),
		stack,
	});
});
