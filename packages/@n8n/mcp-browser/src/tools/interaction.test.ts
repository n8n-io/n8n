/* eslint-disable @typescript-eslint/no-unsafe-return */
import { createInteractionTools } from './interaction';
import { createMockConnection, findTool, structuredOf, TOOL_CONTEXT } from './test-helpers';

describe('createInteractionTools', () => {
	let mockConnection: ReturnType<typeof createMockConnection>;
	let tools: ReturnType<typeof createInteractionTools>;

	beforeEach(() => {
		mockConnection = createMockConnection();
		tools = createInteractionTools(mockConnection.connection);
	});

	// -----------------------------------------------------------------------
	// browser_click
	// -----------------------------------------------------------------------

	describe('browser_click', () => {
		const getTool = () => findTool(tools, 'browser_click');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_click');
			});

			it('has a non-empty description', () => {
				expect(getTool().description.length).toBeGreaterThan(0);
			});
		});

		describe('inputSchema validation', () => {
			it('accepts element with ref', () => {
				expect(() => getTool().inputSchema.parse({ element: { ref: 'e1' } })).not.toThrow();
			});

			it('accepts element with selector', () => {
				expect(() => getTool().inputSchema.parse({ element: { selector: '#btn' } })).not.toThrow();
			});

			it('rejects missing element', () => {
				expect(() => getTool().inputSchema.parse({})).toThrow();
			});

			it('accepts optional button', () => {
				expect(() =>
					getTool().inputSchema.parse({ element: { ref: 'e1' }, button: 'right' }),
				).not.toThrow();
			});

			it('rejects invalid button', () => {
				expect(() =>
					getTool().inputSchema.parse({ element: { ref: 'e1' }, button: 'back' }),
				).toThrow();
			});

			it('accepts clickCount', () => {
				expect(() =>
					getTool().inputSchema.parse({ element: { ref: 'e1' }, clickCount: 2 }),
				).not.toThrow();
			});

			it('accepts modifiers', () => {
				expect(() =>
					getTool().inputSchema.parse({ element: { ref: 'e1' }, modifiers: ['Control', 'Shift'] }),
				).not.toThrow();
			});

			it('rejects invalid modifier', () => {
				expect(() =>
					getTool().inputSchema.parse({ element: { ref: 'e1' }, modifiers: ['Super'] }),
				).toThrow();
			});
		});

		describe('execute', () => {
			it('calls adapter.click with ref target', async () => {
				const result = await getTool().execute(
					{ element: { ref: 'e1' }, button: 'left' },
					TOOL_CONTEXT,
				);
				const data = structuredOf(result);

				expect(mockConnection.adapter.click).toHaveBeenCalledWith(
					'page1',
					{ ref: 'e1' },
					{
						button: 'left',
						clickCount: undefined,
						modifiers: undefined,
					},
				);
				expect(data.clicked).toBe(true);
				expect(data.ref).toBe('e1');
			});

			it('calls adapter.click with selector target', async () => {
				const result = await getTool().execute({ element: { selector: '#btn' } }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(data.clicked).toBe(true);
				expect(data.ref).toBeUndefined();
			});

			it('uses waitForCompletion', async () => {
				await getTool().execute({ element: { ref: 'e1' } }, TOOL_CONTEXT);

				expect(mockConnection.adapter.waitForCompletion).toHaveBeenCalled();
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_type
	// -----------------------------------------------------------------------

	describe('browser_type', () => {
		const getTool = () => findTool(tools, 'browser_type');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_type');
			});
		});

		describe('inputSchema validation', () => {
			it('requires element and text', () => {
				expect(() =>
					getTool().inputSchema.parse({ element: { ref: 'e1' }, text: 'hello' }),
				).not.toThrow();
			});

			it('rejects missing text', () => {
				expect(() => getTool().inputSchema.parse({ element: { ref: 'e1' } })).toThrow();
			});

			it('rejects missing element', () => {
				expect(() => getTool().inputSchema.parse({ text: 'hello' })).toThrow();
			});

			it('accepts optional clear, submit, delay', () => {
				expect(() =>
					getTool().inputSchema.parse({
						element: { ref: 'e1' },
						text: 'hello',
						clear: true,
						submit: true,
						delay: 50,
					}),
				).not.toThrow();
			});
		});

		describe('execute', () => {
			it('calls adapter.type with correct args', async () => {
				const result = await getTool().execute(
					{ element: { ref: 'e1' }, text: 'hello', clear: true, submit: false },
					TOOL_CONTEXT,
				);
				const data = structuredOf(result);

				expect(mockConnection.adapter.type).toHaveBeenCalledWith('page1', { ref: 'e1' }, 'hello', {
					clear: true,
					submit: false,
					delay: undefined,
				});
				expect(data.typed).toBe(true);
				expect(data.text).toBe('hello');
				expect(data.ref).toBe('e1');
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_select
	// -----------------------------------------------------------------------

	describe('browser_select', () => {
		const getTool = () => findTool(tools, 'browser_select');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_select');
			});
		});

		describe('inputSchema validation', () => {
			it('requires element and values', () => {
				expect(() =>
					getTool().inputSchema.parse({ element: { ref: 'e1' }, values: ['opt1'] }),
				).not.toThrow();
			});

			it('rejects missing values', () => {
				expect(() => getTool().inputSchema.parse({ element: { ref: 'e1' } })).toThrow();
			});

			it('rejects non-array values', () => {
				expect(() =>
					getTool().inputSchema.parse({ element: { ref: 'e1' }, values: 'opt1' }),
				).toThrow();
			});
		});

		describe('execute', () => {
			it('calls adapter.select and returns selected values', async () => {
				mockConnection.adapter.select.mockResolvedValue(['option1', 'option2']);

				const result = await getTool().execute(
					{ element: { selector: 'select#color' }, values: ['option1', 'option2'] },
					TOOL_CONTEXT,
				);
				const data = structuredOf(result);

				expect(mockConnection.adapter.select).toHaveBeenCalledWith(
					'page1',
					{ selector: 'select#color' },
					['option1', 'option2'],
				);
				expect(data.selected).toEqual(['option1', 'option2']);
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_drag
	// -----------------------------------------------------------------------

	describe('browser_drag', () => {
		const getTool = () => findTool(tools, 'browser_drag');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_drag');
			});
		});

		describe('inputSchema validation', () => {
			it('requires from and to', () => {
				expect(() =>
					getTool().inputSchema.parse({
						from: { ref: 'e1' },
						to: { ref: 'e2' },
					}),
				).not.toThrow();
			});

			it('accepts mixed ref and selector', () => {
				expect(() =>
					getTool().inputSchema.parse({
						from: { ref: 'e1' },
						to: { selector: '#drop-zone' },
					}),
				).not.toThrow();
			});

			it('rejects missing from', () => {
				expect(() => getTool().inputSchema.parse({ to: { ref: 'e2' } })).toThrow();
			});

			it('rejects missing to', () => {
				expect(() => getTool().inputSchema.parse({ from: { ref: 'e1' } })).toThrow();
			});
		});

		describe('execute', () => {
			it('calls adapter.drag with from and to', async () => {
				const result = await getTool().execute(
					{ from: { ref: 'e1' }, to: { ref: 'e2' } },
					TOOL_CONTEXT,
				);
				const data = structuredOf(result);

				expect(mockConnection.adapter.drag).toHaveBeenCalledWith(
					'page1',
					{ ref: 'e1' },
					{ ref: 'e2' },
				);
				expect(data.dragged).toBe(true);
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_hover
	// -----------------------------------------------------------------------

	describe('browser_hover', () => {
		const getTool = () => findTool(tools, 'browser_hover');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_hover');
			});
		});

		describe('inputSchema validation', () => {
			it('requires element', () => {
				expect(() => getTool().inputSchema.parse({ element: { ref: 'e1' } })).not.toThrow();
			});

			it('rejects missing element', () => {
				expect(() => getTool().inputSchema.parse({})).toThrow();
			});
		});

		describe('execute', () => {
			it('calls adapter.hover', async () => {
				const result = await getTool().execute(
					{ element: { selector: '.menu-item' } },
					TOOL_CONTEXT,
				);
				const data = structuredOf(result);

				expect(mockConnection.adapter.hover).toHaveBeenCalledWith('page1', {
					selector: '.menu-item',
				});
				expect(data.hovered).toBe(true);
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_press
	// -----------------------------------------------------------------------

	describe('browser_press', () => {
		const getTool = () => findTool(tools, 'browser_press');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_press');
			});
		});

		describe('inputSchema validation', () => {
			it('requires keys', () => {
				expect(() => getTool().inputSchema.parse({ keys: 'Enter' })).not.toThrow();
			});

			it('rejects missing keys', () => {
				expect(() => getTool().inputSchema.parse({})).toThrow();
			});

			it('rejects non-string keys', () => {
				expect(() => getTool().inputSchema.parse({ keys: 13 })).toThrow();
			});
		});

		describe('execute', () => {
			it('calls adapter.press with keys', async () => {
				const result = await getTool().execute({ keys: 'Control+A' }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.press).toHaveBeenCalledWith('page1', 'Control+A');
				expect(data.pressed).toBe('Control+A');
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_scroll
	// -----------------------------------------------------------------------

	describe('browser_scroll', () => {
		const getTool = () => findTool(tools, 'browser_scroll');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_scroll');
			});
		});

		describe('inputSchema validation', () => {
			it('accepts element mode', () => {
				expect(() =>
					getTool().inputSchema.parse({ mode: 'element', element: { ref: 'e1' } }),
				).not.toThrow();
			});

			it('accepts direction mode', () => {
				expect(() =>
					getTool().inputSchema.parse({ mode: 'direction', direction: 'down' }),
				).not.toThrow();
			});

			it('accepts direction mode with amount', () => {
				expect(() =>
					getTool().inputSchema.parse({ mode: 'direction', direction: 'up', amount: 500 }),
				).not.toThrow();
			});

			it('rejects element mode without element', () => {
				expect(() => getTool().inputSchema.parse({ mode: 'element' })).toThrow();
			});

			it('rejects direction mode without direction', () => {
				expect(() => getTool().inputSchema.parse({ mode: 'direction' })).toThrow();
			});

			it('rejects invalid direction', () => {
				expect(() =>
					getTool().inputSchema.parse({ mode: 'direction', direction: 'left' }),
				).toThrow();
			});

			it('rejects missing mode', () => {
				expect(() => getTool().inputSchema.parse({})).toThrow();
			});
		});

		describe('execute', () => {
			it('scrolls element into view', async () => {
				const result = await getTool().execute(
					{ mode: 'element', element: { ref: 'e5' } },
					TOOL_CONTEXT,
				);
				const data = structuredOf(result);

				expect(mockConnection.adapter.scroll).toHaveBeenCalledWith('page1', { ref: 'e5' }, {});
				expect(data.scrolled).toBe(true);
			});

			it('scrolls by direction', async () => {
				const result = await getTool().execute(
					{ mode: 'direction', direction: 'down', amount: 300 },
					TOOL_CONTEXT,
				);
				const data = structuredOf(result);

				expect(mockConnection.adapter.scroll).toHaveBeenCalledWith('page1', undefined, {
					direction: 'down',
					amount: 300,
				});
				expect(data.scrolled).toBe(true);
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_upload
	// -----------------------------------------------------------------------

	describe('browser_upload', () => {
		const getTool = () => findTool(tools, 'browser_upload');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_upload');
			});
		});

		describe('inputSchema validation', () => {
			it('requires files array', () => {
				expect(() => getTool().inputSchema.parse({ files: ['/path/to/file.txt'] })).not.toThrow();
			});

			it('accepts optional element', () => {
				expect(() =>
					getTool().inputSchema.parse({
						element: { ref: 'e1' },
						files: ['/path/to/file.txt'],
					}),
				).not.toThrow();
			});

			it('rejects missing files', () => {
				expect(() => getTool().inputSchema.parse({})).toThrow();
			});

			it('rejects non-array files', () => {
				expect(() => getTool().inputSchema.parse({ files: '/path/to/file.txt' })).toThrow();
			});
		});

		describe('execute', () => {
			it('calls adapter.upload with files', async () => {
				const files = ['/tmp/a.png', '/tmp/b.pdf'];
				const result = await getTool().execute({ element: { ref: 'e1' }, files }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.upload).toHaveBeenCalledWith('page1', { ref: 'e1' }, files);
				expect(data.uploaded).toBe(true);
				expect(data.files).toEqual(files);
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_dialog
	// -----------------------------------------------------------------------

	describe('browser_dialog', () => {
		const getTool = () => findTool(tools, 'browser_dialog');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_dialog');
			});
		});

		describe('inputSchema validation', () => {
			it('requires action', () => {
				expect(() => getTool().inputSchema.parse({ action: 'accept' })).not.toThrow();
			});

			it('accepts dismiss', () => {
				expect(() => getTool().inputSchema.parse({ action: 'dismiss' })).not.toThrow();
			});

			it('accepts optional text', () => {
				expect(() =>
					getTool().inputSchema.parse({ action: 'accept', text: 'my input' }),
				).not.toThrow();
			});

			it('rejects missing action', () => {
				expect(() => getTool().inputSchema.parse({})).toThrow();
			});

			it('rejects invalid action', () => {
				expect(() => getTool().inputSchema.parse({ action: 'close' })).toThrow();
			});
		});

		describe('execute', () => {
			it('calls adapter.dialog and returns dialog type', async () => {
				mockConnection.adapter.dialog.mockResolvedValue('confirm');

				const result = await getTool().execute({ action: 'accept', text: 'yes' }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.dialog).toHaveBeenCalledWith('page1', 'accept', 'yes');
				expect(data.handled).toBe(true);
				expect(data.action).toBe('accept');
				expect(data.dialogType).toBe('confirm');
			});
		});
	});
});
