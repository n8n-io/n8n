import type { ElementContext } from './collectElementContext';

export type Annotation = {
	id: string;
	prompt: string;
	contexts: ElementContext[];
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

function buildMultiSummary(contexts: ElementContext[]): string {
	const summaries = contexts.map((c) => c.summary ?? 'element');
	const head = summaries.slice(0, 5).join(', ');
	const extra = summaries.length > 5 ? ` +${summaries.length - 5} more` : '';
	return `${contexts.length} elements: ${head}${extra}`;
}

function formatContextMeta(context: ElementContext, indent = ''): string[] {
	const lines: string[] = [];
	if (context.domPath) lines.push(`${indent}**Location:** ${context.domPath}`);
	const source = formatSource(context);
	if (source) lines.push(`${indent}**Source:** ${source}`);
	if (context.component) lines.push(`${indent}**Vue:** <${context.component}>`);
	if (context.testid) lines.push(`${indent}**Test ID:** ${context.testid}`);
	return lines;
}

function formatAnnotation(annotation: Annotation, index: number): string[] {
	const { contexts, prompt } = annotation;
	const isMulti = contexts.length > 1;
	const primary = contexts[0];
	const summary = isMulti ? buildMultiSummary(contexts) : (primary?.summary ?? 'element');
	const lines: string[] = [`### ${index + 1}. ${summary}`];

	if (isMulti) {
		contexts.forEach((context, i) => {
			lines.push(`- Element ${i + 1}: ${context.summary ?? 'element'}`);
			for (const metaLine of formatContextMeta(context, '  - ')) {
				lines.push(metaLine);
			}
		});
	} else if (primary) {
		for (const metaLine of formatContextMeta(primary)) {
			lines.push(metaLine);
		}
	}

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
