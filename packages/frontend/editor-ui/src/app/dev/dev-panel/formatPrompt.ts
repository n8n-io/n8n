import type { ElementContext } from './collectElementContext';

export type Annotation = {
	id: string;
	prompt: string;
	context: ElementContext;
};

export type ClipboardPayload = {
	pagePath: string;
	viewport: { width: number; height: number };
	annotations: Annotation[];
};

function stripProjectPrefix(file: string): string {
	const packagesIdx = file.indexOf('/packages/');
	if (packagesIdx !== -1) return file.slice(packagesIdx + 1);
	const srcIdx = file.indexOf('/src/');
	if (srcIdx !== -1) return file.slice(srcIdx + 1);
	return file;
}

function formatSource(context: ElementContext): string | undefined {
	if (!context.file) return undefined;
	const rel = stripProjectPrefix(context.file);
	if (!context.line) return rel;
	return context.col ? `${rel}:${context.line}:${context.col}` : `${rel}:${context.line}`;
}

function formatAnnotation(annotation: Annotation, index: number): string[] {
	const { context, prompt } = annotation;
	const summary = context.summary ?? 'element';
	const lines: string[] = [`### ${index + 1}. ${summary}`];

	if (context.domPath) lines.push(`**Location:** ${context.domPath}`);

	const source = formatSource(context);
	if (source) lines.push(`**Source:** ${source}`);

	if (context.component) lines.push(`**Vue:** <${context.component}>`);
	if (context.testid) lines.push(`**Test ID:** ${context.testid}`);

	lines.push(`**Feedback:** ${prompt.trim()}`);
	return lines;
}

export function formatAnnotationsForClipboard(payload: ClipboardPayload): string {
	const sections: string[] = [
		`## Page Feedback: ${payload.pagePath}`,
		`**Viewport:** ${payload.viewport.width}×${payload.viewport.height}`,
	];

	for (const [index, annotation] of payload.annotations.entries()) {
		sections.push(formatAnnotation(annotation, index).join('\n'));
	}

	return `${sections.join('\n\n')}\n`;
}

export function currentPagePath(): string {
	return window.location.pathname + window.location.hash;
}

export function currentViewport(): { width: number; height: number } {
	return { width: window.innerWidth, height: window.innerHeight };
}
