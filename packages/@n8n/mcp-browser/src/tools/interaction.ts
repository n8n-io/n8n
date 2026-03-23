import { z } from 'zod';

import type { SessionManager } from '../session-manager';
import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { createSessionTool, elementTargetSchema, pageIdField, sessionIdField } from './helpers';

export function createInteractionTools(
	sessionManager: SessionManager,
	toolGroupId: string,
): ToolDefinition[] {
	return [
		browserClick(sessionManager, toolGroupId),
		browserType(sessionManager, toolGroupId),
		browserSelect(sessionManager, toolGroupId),
		browserDrag(sessionManager, toolGroupId),
		browserHover(sessionManager, toolGroupId),
		browserPress(sessionManager, toolGroupId),
		browserScroll(sessionManager, toolGroupId),
		browserUpload(sessionManager, toolGroupId),
		browserDialog(sessionManager, toolGroupId),
	];
}

// ---------------------------------------------------------------------------
// browser_click
// ---------------------------------------------------------------------------

const browserClickSchema = z
	.object({
		sessionId: sessionIdField,
		element: elementTargetSchema.describe('Element to click'),
		button: z
			.enum(['left', 'right', 'middle'])
			.optional()
			.describe('Mouse button (default: "left")'),
		clickCount: z.number().int().optional().describe('Number of clicks (2 = double-click)'),
		modifiers: z
			.array(z.enum(['Alt', 'Control', 'Meta', 'Shift']))
			.optional()
			.describe('Modifier keys to hold'),
		pageId: pageIdField,
	})
	.describe('Click an element');

const browserClickOutputSchema = z.object({
	clicked: z.boolean(),
	ref: z.string().optional(),
});

function browserClick(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_click',
		'Click an element. Use ref from browser_snapshot (preferred) or a selector as fallback.',
		browserClickSchema,
		async (session, input, pageId) => {
			await session.adapter.click(pageId, input.element, {
				button: input.button,
				clickCount: input.clickCount,
				modifiers: input.modifiers,
			});
			return formatCallToolResult({
				clicked: true,
				...('ref' in input.element ? { ref: input.element.ref } : {}),
			});
		},
		browserClickOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_type
// ---------------------------------------------------------------------------

const browserTypeSchema = z
	.object({
		sessionId: sessionIdField,
		element: elementTargetSchema.describe('Element to type into'),
		text: z.string().describe('Text to type'),
		clear: z.boolean().optional().describe('Clear existing text first'),
		submit: z.boolean().optional().describe('Press Enter after typing'),
		delay: z.number().optional().describe('Delay between keystrokes in ms'),
		pageId: pageIdField,
	})
	.describe('Type text into an element');

const browserTypeOutputSchema = z.object({
	typed: z.boolean(),
	ref: z.string().optional(),
	text: z.string(),
});

function browserType(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_type',
		'Type text into an element. Use ref from browser_snapshot (preferred) or a selector as fallback.',
		browserTypeSchema,
		async (session, input, pageId) => {
			await session.adapter.type(pageId, input.element, input.text, {
				clear: input.clear,
				submit: input.submit,
				delay: input.delay,
			});
			return formatCallToolResult({
				typed: true,
				...('ref' in input.element ? { ref: input.element.ref } : {}),
				text: input.text,
			});
		},
		browserTypeOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_select
// ---------------------------------------------------------------------------

const browserSelectSchema = z
	.object({
		sessionId: sessionIdField,
		element: elementTargetSchema.describe('Select element to interact with'),
		values: z.array(z.string()).describe('Option values or labels to select'),
		pageId: pageIdField,
	})
	.describe('Select option(s) in a <select> element');

const browserSelectOutputSchema = z.object({
	selected: z.array(z.string()),
});

function browserSelect(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_select',
		'Select option(s) in a <select> element. Use ref from browser_snapshot (preferred) or a selector as fallback.',
		browserSelectSchema,
		async (session, input, pageId) => {
			const selected = await session.adapter.select(pageId, input.element, input.values);
			return formatCallToolResult({ selected });
		},
		browserSelectOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_drag
// ---------------------------------------------------------------------------

const browserDragSchema = z
	.object({
		sessionId: sessionIdField,
		from: elementTargetSchema.describe('Source element to drag from'),
		to: elementTargetSchema.describe('Target element to drag to'),
		pageId: pageIdField,
	})
	.describe('Drag from one element to another');

const browserDragOutputSchema = z.object({
	dragged: z.boolean(),
});

function browserDrag(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_drag',
		'Drag from one element to another. Use refs from browser_snapshot (preferred) or selectors as fallback.',
		browserDragSchema,
		async (session, input, pageId) => {
			await session.adapter.drag(pageId, input.from, input.to);
			return formatCallToolResult({ dragged: true });
		},
		browserDragOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_hover
// ---------------------------------------------------------------------------

const browserHoverSchema = z
	.object({
		sessionId: sessionIdField,
		element: elementTargetSchema.describe('Element to hover over'),
		pageId: pageIdField,
	})
	.describe('Hover over an element');

const browserHoverOutputSchema = z.object({
	hovered: z.boolean(),
});

function browserHover(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_hover',
		'Hover over an element. Use ref from browser_snapshot (preferred) or a selector as fallback.',
		browserHoverSchema,
		async (session, input, pageId) => {
			await session.adapter.hover(pageId, input.element);
			return formatCallToolResult({ hovered: true });
		},
		browserHoverOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_press
// ---------------------------------------------------------------------------

const browserPressSchema = z
	.object({
		sessionId: sessionIdField,
		keys: z.string().describe('Key or key combination (e.g. "Enter", "Control+A")'),
		pageId: pageIdField,
	})
	.describe('Press keyboard key(s)');

const browserPressOutputSchema = z.object({
	pressed: z.string(),
});

function browserPress(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_press',
		'Press keyboard key(s). Examples: "Enter", "Control+A", "Escape".',
		browserPressSchema,
		async (session, input, pageId) => {
			await session.adapter.press(pageId, input.keys);
			return formatCallToolResult({ pressed: input.keys });
		},
		browserPressOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_scroll
// ---------------------------------------------------------------------------

const scrollToElementSchema = z.object({
	sessionId: sessionIdField,
	mode: z.literal('element').describe('Scroll an element into view'),
	element: elementTargetSchema.describe('Element to scroll into view'),
	pageId: pageIdField,
});

const scrollByDirectionSchema = z.object({
	sessionId: sessionIdField,
	mode: z.literal('direction').describe('Scroll the page by direction/amount'),
	direction: z.enum(['up', 'down']).describe('Scroll direction'),
	amount: z.number().optional().describe('Pixels to scroll (default: 500)'),
	pageId: pageIdField,
});

const browserScrollSchema = z
	.discriminatedUnion('mode', [scrollToElementSchema, scrollByDirectionSchema])
	.describe('Scroll an element into view, or scroll the page by direction/amount');

const browserScrollOutputSchema = z.object({
	scrolled: z.boolean(),
});

function browserScroll(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_scroll',
		'Scroll an element into view (mode: "element"), or scroll the page by direction/amount (mode: "direction").',
		browserScrollSchema,
		async (session, input, pageId) => {
			if (input.mode === 'element') {
				await session.adapter.scroll(pageId, input.element, {});
			} else {
				await session.adapter.scroll(pageId, undefined, {
					direction: input.direction,
					amount: input.amount,
				});
			}
			return formatCallToolResult({ scrolled: true });
		},
		browserScrollOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_upload
// ---------------------------------------------------------------------------

const browserUploadSchema = z
	.object({
		sessionId: sessionIdField,
		element: elementTargetSchema.describe('File input element'),
		files: z.array(z.string()).describe('Absolute file paths to upload'),
		pageId: pageIdField,
	})
	.describe('Set files on a file input element');

const browserUploadOutputSchema = z.object({
	uploaded: z.boolean(),
	files: z.array(z.string()),
});

function browserUpload(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_upload',
		'Set files on a file input element. Use ref from browser_snapshot (preferred) or a selector as fallback.',
		browserUploadSchema,
		async (session, input, pageId) => {
			await session.adapter.upload(pageId, input.element, input.files);
			return formatCallToolResult({ uploaded: true, files: input.files });
		},
		browserUploadOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_dialog
// ---------------------------------------------------------------------------

const browserDialogSchema = z
	.object({
		sessionId: sessionIdField,
		action: z.enum(['accept', 'dismiss']).describe('How to handle the dialog'),
		text: z.string().optional().describe('Text to enter (for prompt dialogs)'),
		pageId: pageIdField,
	})
	.describe('Handle a JavaScript dialog');

const browserDialogOutputSchema = z.object({
	handled: z.boolean(),
	action: z.string(),
	dialogType: z.string(),
});

function browserDialog(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_dialog',
		'Handle a JavaScript dialog (alert, confirm, prompt, beforeunload). Call before the action that triggers the dialog, or when a dialog is already pending.',
		browserDialogSchema,
		async (session, input, pageId) => {
			const dialogType = await session.adapter.dialog(pageId, input.action, input.text);
			return formatCallToolResult({ handled: true, action: input.action, dialogType });
		},
		browserDialogOutputSchema,
		toolGroupId,
	);
}
