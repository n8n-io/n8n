import { z } from 'zod';

import type { SessionManager } from '../session-manager';
import type { ToolDefinition } from '../types';
import { resolveElementTarget } from '../utils';
import { createSessionTool, pageIdField, refField, selectorField, sessionIdField } from './helpers';

export function createInteractionTools(sessionManager: SessionManager): ToolDefinition[] {
	return [
		browserClick(sessionManager),
		browserType(sessionManager),
		browserSelect(sessionManager),
		browserDrag(sessionManager),
		browserHover(sessionManager),
		browserPress(sessionManager),
		browserScroll(sessionManager),
		browserUpload(sessionManager),
		browserDialog(sessionManager),
	];
}

// ---------------------------------------------------------------------------
// browser_click
// ---------------------------------------------------------------------------

function browserClick(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_click',
		'Click an element. Use ref from browser_snapshot (preferred) or a selector as fallback.',
		{
			sessionId: sessionIdField,
			ref: refField,
			selector: selectorField,
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
		},
		async (session, input, pageId) => {
			const target = resolveElementTarget(input);
			await session.adapter.click(pageId, target, {
				button: input.button,
				clickCount: input.clickCount,
				modifiers: input.modifiers,
			});
			return { clicked: true, ...(input.ref !== undefined ? { ref: input.ref } : {}) };
		},
	);
}

// ---------------------------------------------------------------------------
// browser_type
// ---------------------------------------------------------------------------

function browserType(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_type',
		'Type text into an element. Use ref from browser_snapshot (preferred) or a selector as fallback.',
		{
			sessionId: sessionIdField,
			ref: refField,
			selector: selectorField,
			text: z.string().describe('Text to type'),
			clear: z.boolean().optional().describe('Clear existing text first'),
			submit: z.boolean().optional().describe('Press Enter after typing'),
			delay: z.number().optional().describe('Delay between keystrokes in ms'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			const target = resolveElementTarget(input);
			await session.adapter.type(pageId, target, input.text, {
				clear: input.clear,
				submit: input.submit,
				delay: input.delay,
			});
			return {
				typed: true,
				...(input.ref !== undefined ? { ref: input.ref } : {}),
				text: input.text,
			};
		},
	);
}

// ---------------------------------------------------------------------------
// browser_select
// ---------------------------------------------------------------------------

function browserSelect(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_select',
		'Select option(s) in a <select> element. Use ref from browser_snapshot (preferred) or a selector as fallback.',
		{
			sessionId: sessionIdField,
			ref: refField,
			selector: selectorField,
			values: z.array(z.string()).describe('Option values or labels to select'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			const target = resolveElementTarget(input);
			const selected = await session.adapter.select(pageId, target, input.values);
			return { selected };
		},
	);
}

// ---------------------------------------------------------------------------
// browser_drag
// ---------------------------------------------------------------------------

function browserDrag(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_drag',
		'Drag from one element to another. Use refs from browser_snapshot (preferred) or selectors as fallback.',
		{
			sessionId: sessionIdField,
			fromRef: z.string().optional().describe('Source element ref from snapshot'),
			from: z.string().optional().describe('Source element selector (fallback)'),
			toRef: z.string().optional().describe('Target element ref from snapshot'),
			to: z.string().optional().describe('Target element selector (fallback)'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			const fromTarget = resolveElementTarget({
				ref: input.fromRef,
				selector: input.from,
			});
			const toTarget = resolveElementTarget({
				ref: input.toRef,
				selector: input.to,
			});
			await session.adapter.drag(pageId, fromTarget, toTarget);
			return { dragged: true };
		},
	);
}

// ---------------------------------------------------------------------------
// browser_hover
// ---------------------------------------------------------------------------

function browserHover(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_hover',
		'Hover over an element. Use ref from browser_snapshot (preferred) or a selector as fallback.',
		{
			sessionId: sessionIdField,
			ref: refField,
			selector: selectorField,
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			const target = resolveElementTarget(input);
			await session.adapter.hover(pageId, target);
			return { hovered: true };
		},
	);
}

// ---------------------------------------------------------------------------
// browser_press
// ---------------------------------------------------------------------------

function browserPress(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_press',
		'Press keyboard key(s). Examples: "Enter", "Control+A", "Escape".',
		{
			sessionId: sessionIdField,
			keys: z.string().describe('Key or key combination (e.g. "Enter", "Control+A")'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			await session.adapter.press(pageId, input.keys);
			return { pressed: input.keys };
		},
	);
}

// ---------------------------------------------------------------------------
// browser_scroll
// ---------------------------------------------------------------------------

function browserScroll(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_scroll',
		'Scroll an element into view, or scroll the page by direction/amount.',
		{
			sessionId: sessionIdField,
			ref: refField,
			selector: selectorField,
			direction: z
				.enum(['up', 'down'])
				.optional()
				.describe('Scroll direction (when no ref/selector)'),
			amount: z
				.number()
				.optional()
				.describe('Pixels to scroll (default: 500, when no ref/selector)'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			const hasTarget = input.ref !== undefined || input.selector !== undefined;
			const target = hasTarget
				? resolveElementTarget({ ref: input.ref, selector: input.selector })
				: undefined;
			await session.adapter.scroll(pageId, target, {
				direction: input.direction,
				amount: input.amount,
			});
			return { scrolled: true };
		},
	);
}

// ---------------------------------------------------------------------------
// browser_upload
// ---------------------------------------------------------------------------

function browserUpload(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_upload',
		'Set files on a file input element. Use ref from browser_snapshot (preferred) or a selector as fallback.',
		{
			sessionId: sessionIdField,
			ref: refField,
			selector: selectorField,
			files: z.array(z.string()).describe('Absolute file paths to upload'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			const target = resolveElementTarget(input);
			await session.adapter.upload(pageId, target, input.files);
			return { uploaded: true, files: input.files };
		},
	);
}

// ---------------------------------------------------------------------------
// browser_dialog
// ---------------------------------------------------------------------------

function browserDialog(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_dialog',
		'Handle a JavaScript dialog (alert, confirm, prompt, beforeunload). Call before the action that triggers the dialog, or when a dialog is already pending.',
		{
			sessionId: sessionIdField,
			action: z.enum(['accept', 'dismiss']).describe('How to handle the dialog'),
			text: z.string().optional().describe('Text to enter (for prompt dialogs)'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			const dialogType = await session.adapter.dialog(pageId, input.action, input.text);
			return { handled: true, action: input.action, dialogType };
		},
	);
}
