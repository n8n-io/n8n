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

	it('should return resumeData when present', async () => {
		const tool = createRichInteractionTool().build();
		const resumeData = { type: 'button', value: 'ok' };
		const ctx = {
			resumeData,
			suspend: jest.fn().mockResolvedValue(undefined as never),
			parentTelemetry: undefined,
		};

		const result = await tool.handler!(
			{
				components: [{ type: 'button', label: 'OK', value: 'ok' }],
			},
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
		const ctx = {
			resumeData: undefined,
			suspend: jest.fn().mockResolvedValue(undefined as never),
			parentTelemetry: undefined,
		};

		await tool.handler!(input, ctx);

		expect(ctx.suspend).toHaveBeenCalledWith(input);
	});

	it('should not suspend when no actionable components are present', async () => {
		const tool = createRichInteractionTool().build();
		const input = {
			title: 'Info Card',
			message: 'Some details',
			components: [{ type: 'section' as const, text: 'Hello world' }, { type: 'divider' as const }],
		};
		const ctx = {
			resumeData: undefined,
			suspend: jest.fn().mockResolvedValue(undefined as never),
			parentTelemetry: undefined,
		};

		const result = await tool.handler!(input, ctx);

		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(result).toEqual({ type: 'button', value: 'Info Card\nSome details' });
	});

	it('should return fallback text when no actionable components and no title/message', async () => {
		const tool = createRichInteractionTool().build();
		const input = {
			components: [{ type: 'divider' as const }],
		};
		const ctx = {
			resumeData: undefined,
			suspend: jest.fn().mockResolvedValue(undefined as never),
			parentTelemetry: undefined,
		};

		const result = await tool.handler!(input, ctx);

		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(result).toEqual({ type: 'button', value: 'No interactive content' });
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
		const ctx = {
			resumeData: undefined,
			suspend: jest.fn().mockResolvedValue(undefined as never),
			parentTelemetry: undefined,
		};

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
		const ctx = {
			resumeData: undefined,
			suspend: jest.fn().mockResolvedValue(undefined as never),
			parentTelemetry: undefined,
		};

		await tool.handler!(input, ctx);

		expect(ctx.suspend).toHaveBeenCalledWith(input);
	});
});
