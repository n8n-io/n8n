import { createRichInteractionTool } from '../rich-interaction-tool';

describe('createRichInteractionTool', () => {
	it('should build a tool with the correct name', () => {
		const tool = createRichInteractionTool().build();

		expect(tool.name).toBe('rich_interaction');
	});

	it('should have suspend and resume schemas', () => {
		const tool = createRichInteractionTool().build();

		expect(tool.suspendSchema).toBeDefined();
		expect(tool.resumeSchema).toBeDefined();
	});

	function makeCtx() {
		return {
			resumeData: undefined,
			suspend: jest.fn().mockResolvedValue(undefined as never),
			parentTelemetry: undefined,
		};
	}

	it('should return resumeData when present', async () => {
		const tool = createRichInteractionTool().build();
		const resumeData = { type: 'button', value: 'ok' };
		const ctx = { ...makeCtx(), resumeData };

		const result = await tool.handler!(
			{ components: [{ type: 'button', label: 'OK', value: 'ok' }] },
			ctx,
		);

		expect(result).toEqual(resumeData);
		expect(ctx.suspend).not.toHaveBeenCalled();
	});

	it('should suspend when actionable components exist and no resumeData', async () => {
		const tool = createRichInteractionTool().build();
		const input = {
			title: 'Choose',
			components: [
				{ type: 'button' as const, label: 'Yes', value: 'yes', style: 'primary' as const },
				{ type: 'button' as const, label: 'No', value: 'no', style: 'danger' as const },
			],
		};
		const ctx = makeCtx();

		await tool.handler!(input, ctx);

		expect(ctx.suspend).toHaveBeenCalledWith(input);
	});

	it('should return displayOnly marker (not suspend) when no actionable components are present', async () => {
		const tool = createRichInteractionTool().build();
		const input = {
			title: 'Info Card',
			message: 'Some details',
			components: [{ type: 'section' as const, text: 'Hello world' }, { type: 'divider' as const }],
		};
		const ctx = makeCtx();

		const result = await tool.handler!(input, ctx);

		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(result).toEqual({ displayOnly: true });
	});

	it('should return displayOnly marker when only an image component is present', async () => {
		const tool = createRichInteractionTool('slack').build();
		const input = {
			components: [{ type: 'image' as const, url: 'https://media.giphy.com/x.gif', alt: 'gif' }],
		};
		const ctx = makeCtx();

		const result = await tool.handler!(input, ctx);

		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(result).toEqual({ displayOnly: true });
	});

	it('should suspend for select components', async () => {
		const tool = createRichInteractionTool().build();
		const input = {
			components: [
				{
					type: 'select' as const,
					id: 'priority',
					placeholder: 'Choose priority',
					options: [
						{ label: 'High', value: 'high' },
						{ label: 'Low', value: 'low' },
					],
				},
			],
		};
		const ctx = makeCtx();

		await tool.handler!(input, ctx);

		expect(ctx.suspend).toHaveBeenCalledWith(input);
	});

	it('should suspend for radio_select components', async () => {
		const tool = createRichInteractionTool().build();
		const input = {
			components: [
				{
					type: 'radio_select' as const,
					id: 'size',
					options: [
						{ label: 'Small', value: 'sm' },
						{ label: 'Large', value: 'lg' },
					],
				},
			],
		};
		const ctx = makeCtx();

		await tool.handler!(input, ctx);

		expect(ctx.suspend).toHaveBeenCalledWith(input);
	});
});
