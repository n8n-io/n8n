import type { INodeProperties } from 'n8n-workflow';

export const computerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['computer'],
			},
		},
		options: [
			{
				name: 'Click and Drag',
				value: 'left_click_drag',
				description: 'Click and drag to a position',
				action: 'Click and drag',
			},
			{
				name: 'Cursor Position',
				value: 'cursor_position',
				description: 'Get the current cursor position',
				action: 'Get cursor position',
			},
			{
				name: 'Double Click',
				value: 'double_click',
				description: 'Perform a double click',
				action: 'Perform double click',
			},
			{
				name: 'Hold Key',
				value: 'hold_key',
				description: 'Hold a key for a duration',
				action: 'Hold key',
			},
			{
				name: 'Left Click',
				value: 'left_click',
				description: 'Perform a left mouse click',
				action: 'Perform left click',
			},
			{
				name: 'Middle Click',
				value: 'middle_click',
				description: 'Perform a middle mouse click',
				action: 'Perform middle click',
			},
			{
				name: 'Mouse Down',
				value: 'left_mouse_down',
				description: 'Press and hold the left mouse button',
				action: 'Press mouse button',
			},
			{
				name: 'Mouse Move',
				value: 'mouse_move',
				description: 'Move the mouse cursor to a position',
				action: 'Move mouse cursor',
			},
			{
				name: 'Mouse Up',
				value: 'left_mouse_up',
				description: 'Release the left mouse button',
				action: 'Release mouse button',
			},
			{
				name: 'Press Key',
				value: 'key',
				description: 'Press a key or key combination (e.g., ctrl+c)',
				action: 'Press key',
			},
			{
				name: 'Right Click',
				value: 'right_click',
				description: 'Perform a right mouse click',
				action: 'Perform right click',
			},
			{
				name: 'Screenshot',
				value: 'screenshot',
				description: 'Capture a screenshot of the screen',
				action: 'Take a screenshot',
			},
			{
				name: 'Scroll',
				value: 'scroll',
				description: 'Scroll the screen',
				action: 'Scroll the screen',
			},
			{
				name: 'Triple Click',
				value: 'triple_click',
				description: 'Perform a triple click',
				action: 'Perform triple click',
			},
			{
				name: 'Type Text',
				value: 'type',
				description: 'Type a text string',
				action: 'Type text',
			},
			{
				name: 'Wait',
				value: 'wait',
				description: 'Wait for a duration',
				action: 'Wait',
			},
		],
		default: 'screenshot',
	},
];

export const computerFields: INodeProperties[] = [
	// Coordinate field for mouse_move (required)
	{
		displayName: 'X Coordinate',
		name: 'coordinateX',
		type: 'number',
		required: true,
		default: 0,
		description: 'The X coordinate on the screen',
		displayOptions: {
			show: {
				resource: ['computer'],
				operation: ['mouse_move', 'left_click_drag'],
			},
		},
	},
	{
		displayName: 'Y Coordinate',
		name: 'coordinateY',
		type: 'number',
		required: true,
		default: 0,
		description: 'The Y coordinate on the screen',
		displayOptions: {
			show: {
				resource: ['computer'],
				operation: ['mouse_move', 'left_click_drag'],
			},
		},
	},

	// Coordinate field for click operations (optional)
	{
		displayName: 'X Coordinate',
		name: 'coordinateX',
		type: 'number',
		default: 0,
		description:
			'The X coordinate on the screen (optional, clicks at current position if not provided)',
		displayOptions: {
			show: {
				resource: ['computer'],
				operation: ['left_click', 'right_click', 'middle_click', 'double_click', 'triple_click'],
			},
		},
	},
	{
		displayName: 'Y Coordinate',
		name: 'coordinateY',
		type: 'number',
		default: 0,
		description:
			'The Y coordinate on the screen (optional, clicks at current position if not provided)',
		displayOptions: {
			show: {
				resource: ['computer'],
				operation: ['left_click', 'right_click', 'middle_click', 'double_click', 'triple_click'],
			},
		},
	},

	// Scroll fields
	{
		displayName: 'Scroll Direction',
		name: 'scrollDirection',
		type: 'options',
		options: [
			{ name: 'Up', value: 'up' },
			{ name: 'Down', value: 'down' },
			{ name: 'Left', value: 'left' },
			{ name: 'Right', value: 'right' },
		],
		default: 'down',
		description: 'The direction to scroll',
		displayOptions: {
			show: {
				resource: ['computer'],
				operation: ['scroll'],
			},
		},
	},
	{
		displayName: 'Scroll Amount',
		name: 'scrollAmount',
		type: 'number',
		default: 3,
		description: 'The number of scroll iterations',
		displayOptions: {
			show: {
				resource: ['computer'],
				operation: ['scroll'],
			},
		},
	},
	{
		displayName: 'X Coordinate',
		name: 'coordinateX',
		type: 'number',
		default: 0,
		description: 'The X coordinate to scroll at (optional)',
		displayOptions: {
			show: {
				resource: ['computer'],
				operation: ['scroll'],
			},
		},
	},
	{
		displayName: 'Y Coordinate',
		name: 'coordinateY',
		type: 'number',
		default: 0,
		description: 'The Y coordinate to scroll at (optional)',
		displayOptions: {
			show: {
				resource: ['computer'],
				operation: ['scroll'],
			},
		},
	},

	// Text field for type operation
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		description: 'The text to type',
		displayOptions: {
			show: {
				resource: ['computer'],
				operation: ['type'],
			},
		},
	},

	// Key field for key operation
	{
		displayName: 'Key',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., ctrl+c, Enter, Tab',
		description: 'The key or key combination to press',
		displayOptions: {
			show: {
				resource: ['computer'],
				operation: ['key'],
			},
		},
	},

	// Key field for hold_key operation
	{
		displayName: 'Key',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., shift, ctrl, alt',
		description: 'The key to hold',
		displayOptions: {
			show: {
				resource: ['computer'],
				operation: ['hold_key'],
			},
		},
	},

	// Duration field for hold_key
	{
		displayName: 'Duration (Seconds)',
		name: 'duration',
		type: 'number',
		required: true,
		default: 1,
		typeOptions: {
			minValue: 0,
			maxValue: 100,
		},
		description: 'The duration to hold the key in seconds (0-100)',
		displayOptions: {
			show: {
				resource: ['computer'],
				operation: ['hold_key'],
			},
		},
	},

	// Duration field for wait
	{
		displayName: 'Duration (Seconds)',
		name: 'duration',
		type: 'number',
		required: true,
		default: 1,
		typeOptions: {
			minValue: 0,
			maxValue: 100,
		},
		description: 'The duration to wait in seconds (0-100)',
		displayOptions: {
			show: {
				resource: ['computer'],
				operation: ['wait'],
			},
		},
	},
];
