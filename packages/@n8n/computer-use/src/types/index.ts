import { z } from 'zod';

// Tool result type
export interface ToolResult {
	output?: string;
	error?: string;
	base64_image?: string;
	system?: string;
}

// Computer tool schemas
export const ComputerActionSchema = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('screenshot'),
	}),
	z.object({
		action: z.literal('cursor_position'),
	}),
	z.object({
		action: z.literal('mouse_move'),
		coordinate: z.tuple([z.number(), z.number()]),
	}),
	z.object({
		action: z.enum(['left_click', 'right_click', 'middle_click', 'double_click', 'triple_click']),
		coordinate: z.tuple([z.number(), z.number()]).optional(),
	}),
	z.object({
		action: z.literal('left_click_drag'),
		coordinate: z.tuple([z.number(), z.number()]),
	}),
	z.object({
		action: z.enum(['left_mouse_down', 'left_mouse_up']),
	}),
	z.object({
		action: z.literal('scroll'),
		coordinate: z.tuple([z.number(), z.number()]).optional(),
		scroll_amount: z.number().optional(),
		scroll_direction: z.enum(['up', 'down', 'left', 'right']).optional(),
	}),
	z.object({
		action: z.literal('type'),
		text: z.string(),
	}),
	z.object({
		action: z.literal('key'),
		text: z.string(),
	}),
	z.object({
		action: z.literal('hold_key'),
		text: z.string(),
		duration: z.number().min(0).max(100).optional().default(1),
	}),
	z.object({
		action: z.literal('wait'),
		duration: z.number().min(0).max(100),
	}),
	z.object({
		action: z.literal('zoom'),
		region: z.tuple([z.number(), z.number(), z.number(), z.number()]),
	}),
]);

export type ComputerAction = z.infer<typeof ComputerActionSchema>;

// Bash tool schemas
export const BashActionSchema = z.union([
	z.object({
		command: z.string(),
		restart: z.literal(false).optional(),
	}),
	z.object({
		restart: z.literal(true),
		command: z.undefined().optional(),
	}),
]);

export type BashAction = z.infer<typeof BashActionSchema>;

// Edit tool schemas
export const EditActionSchema = z.discriminatedUnion('command', [
	z.object({
		command: z.literal('view'),
		path: z.string(),
		view_range: z.tuple([z.number(), z.number()]).optional(),
	}),
	z.object({
		command: z.literal('create'),
		path: z.string(),
		file_text: z.string(),
	}),
	z.object({
		command: z.literal('str_replace'),
		path: z.string(),
		old_str: z.string(),
		new_str: z.string(),
	}),
	z.object({
		command: z.literal('insert'),
		path: z.string(),
		insert_line: z.number(),
		new_str: z.string(),
	}),
	z.object({
		command: z.literal('undo_edit'),
		path: z.string(),
	}),
]);

export type EditAction = z.infer<typeof EditActionSchema>;
