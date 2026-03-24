import { z } from 'zod';

import type { BrowserConnection } from '../connection';
import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import {
	createConnectedTool,
	elementTargetSchema,
	pageIdField,
	withSnapshotEnvelope,
} from './helpers';

export function createInteractionTools(connection: BrowserConnection): ToolDefinition[] {
	return [
		browserClick(connection),
		browserType(connection),
		browserSelect(connection),
		browserDrag(connection),
		browserHover(connection),
		browserPress(connection),
		browserScroll(connection),
		browserUpload(connection),
		browserDialog(connection),
	];
}

// ---------------------------------------------------------------------------
// browser_click
// ---------------------------------------------------------------------------

const browserClickSchema = z
	.object({
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

const browserClickOutputSchema = withSnapshotEnvelope({
	clicked: z.boolean(),
	ref: z.string().optional(),
});

function browserClick(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_click',
		'Click an element. Use ref from browser_snapshot (preferred) or a selector as fallback.',
		browserClickSchema,
		async (state, input, pageId) => {
			await state.adapter.click(pageId, input.element, {
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
		{ autoSnapshot: true, waitForCompletion: true },
	);
}

// ---------------------------------------------------------------------------
// browser_type
// ---------------------------------------------------------------------------

const browserTypeSchema = z
	.object({
		element: elementTargetSchema.describe('Element to type into'),
		text: z.string().describe('Text to type'),
		clear: z.boolean().optional().describe('Clear existing text first'),
		submit: z.boolean().optional().describe('Press Enter after typing'),
		delay: z.number().optional().describe('Delay between keystrokes in ms'),
		pageId: pageIdField,
	})
	.describe('Type text into an element');

const browserTypeOutputSchema = withSnapshotEnvelope({
	typed: z.boolean(),
	ref: z.string().optional(),
	text: z.string(),
});

function browserType(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_type',
		'Type text into an element. Use ref from browser_snapshot (preferred) or a selector as fallback.',
		browserTypeSchema,
		async (state, input, pageId) => {
			await state.adapter.type(pageId, input.element, input.text, {
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
		{ autoSnapshot: true, waitForCompletion: true },
	);
}

// ---------------------------------------------------------------------------
// browser_select
// ---------------------------------------------------------------------------

const browserSelectSchema = z
	.object({
		element: elementTargetSchema.describe('Select element to interact with'),
		values: z.array(z.string()).describe('Option values or labels to select'),
		pageId: pageIdField,
	})
	.describe('Select option(s) in a <select> element');

const browserSelectOutputSchema = withSnapshotEnvelope({
	selected: z.array(z.string()),
});

function browserSelect(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_select',
		'Select option(s) in a <select> element. Use ref from browser_snapshot (preferred) or a selector as fallback.',
		browserSelectSchema,
		async (state, input, pageId) => {
			const selected = await state.adapter.select(pageId, input.element, input.values);
			return formatCallToolResult({ selected });
		},
		browserSelectOutputSchema,
		{ autoSnapshot: true, waitForCompletion: true },
	);
}

// ---------------------------------------------------------------------------
// browser_drag
// ---------------------------------------------------------------------------

const browserDragSchema = z
	.object({
		from: elementTargetSchema.describe('Source element to drag from'),
		to: elementTargetSchema.describe('Target element to drag to'),
		pageId: pageIdField,
	})
	.describe('Drag from one element to another');

const browserDragOutputSchema = withSnapshotEnvelope({
	dragged: z.boolean(),
});

function browserDrag(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_drag',
		'Drag from one element to another. Use refs from browser_snapshot (preferred) or selectors as fallback.',
		browserDragSchema,
		async (state, input, pageId) => {
			await state.adapter.drag(pageId, input.from, input.to);
			return formatCallToolResult({ dragged: true });
		},
		browserDragOutputSchema,
		{ autoSnapshot: true, waitForCompletion: true },
	);
}

// ---------------------------------------------------------------------------
// browser_hover
// ---------------------------------------------------------------------------

const browserHoverSchema = z
	.object({
		element: elementTargetSchema.describe('Element to hover over'),
		pageId: pageIdField,
	})
	.describe('Hover over an element');

const browserHoverOutputSchema = withSnapshotEnvelope({
	hovered: z.boolean(),
});

function browserHover(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_hover',
		'Hover over an element. Use ref from browser_snapshot (preferred) or a selector as fallback.',
		browserHoverSchema,
		async (state, input, pageId) => {
			await state.adapter.hover(pageId, input.element);
			return formatCallToolResult({ hovered: true });
		},
		browserHoverOutputSchema,
		{ autoSnapshot: true, waitForCompletion: true },
	);
}

// ---------------------------------------------------------------------------
// browser_press
// ---------------------------------------------------------------------------

const browserPressSchema = z
	.object({
		keys: z.string().describe('Key or key combination (e.g. "Enter", "Control+A")'),
		pageId: pageIdField,
	})
	.describe('Press keyboard key(s)');

const browserPressOutputSchema = withSnapshotEnvelope({
	pressed: z.string(),
});

function browserPress(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_press',
		'Press keyboard key(s). Examples: "Enter", "Control+A", "Escape".',
		browserPressSchema,
		async (state, input, pageId) => {
			await state.adapter.press(pageId, input.keys);
			return formatCallToolResult({ pressed: input.keys });
		},
		browserPressOutputSchema,
		{ autoSnapshot: true, waitForCompletion: true },
	);
}

// ---------------------------------------------------------------------------
// browser_scroll
// ---------------------------------------------------------------------------

const scrollToElementSchema = z.object({
	mode: z.literal('element').describe('Scroll an element into view'),
	element: elementTargetSchema.describe('Element to scroll into view'),
	pageId: pageIdField,
});

const scrollByDirectionSchema = z.object({
	mode: z.literal('direction').describe('Scroll the page by direction/amount'),
	direction: z.enum(['up', 'down']).describe('Scroll direction'),
	amount: z.number().optional().describe('Pixels to scroll (default: 500)'),
	pageId: pageIdField,
});

const browserScrollSchema = z
	.discriminatedUnion('mode', [scrollToElementSchema, scrollByDirectionSchema])
	.describe('Scroll an element into view, or scroll the page by direction/amount');

const browserScrollOutputSchema = withSnapshotEnvelope({
	scrolled: z.boolean(),
});

function browserScroll(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_scroll',
		'Scroll an element into view (mode: "element"), or scroll the page by direction/amount (mode: "direction").',
		browserScrollSchema,
		async (state, input, pageId) => {
			if (input.mode === 'element') {
				await state.adapter.scroll(pageId, input.element, {});
			} else {
				await state.adapter.scroll(pageId, undefined, {
					direction: input.direction,
					amount: input.amount,
				});
			}
			return formatCallToolResult({ scrolled: true });
		},
		browserScrollOutputSchema,
		{ autoSnapshot: true, waitForCompletion: true },
	);
}

// ---------------------------------------------------------------------------
// browser_upload
// ---------------------------------------------------------------------------

const browserUploadSchema = z
	.object({
		element: elementTargetSchema
			.optional()
			.describe('File input element (not needed when a file chooser dialog is pending)'),
		files: z.array(z.string()).describe('Absolute file paths to upload'),
		pageId: pageIdField,
	})
	.describe('Set files on a file input element or fulfill a pending file chooser dialog');

const browserUploadOutputSchema = withSnapshotEnvelope({
	uploaded: z.boolean(),
	files: z.array(z.string()),
});

function browserUpload(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_upload',
		'Set files on a file input element, or fulfill a pending file chooser dialog. If a file chooser is pending, no element target is needed.',
		browserUploadSchema,
		async (state, input, pageId) => {
			await state.adapter.upload(pageId, input.element, input.files);
			return formatCallToolResult({ uploaded: true, files: input.files });
		},
		browserUploadOutputSchema,
		{ autoSnapshot: true, waitForCompletion: true },
	);
}

// ---------------------------------------------------------------------------
// browser_dialog
// ---------------------------------------------------------------------------

const browserDialogSchema = z
	.object({
		action: z.enum(['accept', 'dismiss']).describe('How to handle the dialog'),
		text: z.string().optional().describe('Text to enter (for prompt dialogs)'),
		pageId: pageIdField,
	})
	.describe('Handle a JavaScript dialog');

const browserDialogOutputSchema = withSnapshotEnvelope({
	handled: z.boolean(),
	action: z.string(),
	dialogType: z.string(),
});

function browserDialog(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_dialog',
		'Handle a JavaScript dialog (alert, confirm, prompt, beforeunload). Call before the action that triggers the dialog, or when a dialog is already pending.',
		browserDialogSchema,
		async (state, input, pageId) => {
			const dialogType = await state.adapter.dialog(pageId, input.action, input.text);
			return formatCallToolResult({ handled: true, action: input.action, dialogType });
		},
		browserDialogOutputSchema,
		{ autoSnapshot: true, waitForCompletion: true },
	);
}
