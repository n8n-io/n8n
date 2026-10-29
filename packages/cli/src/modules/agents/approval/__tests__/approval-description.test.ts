import type { BuiltTool, InterruptibleToolContext } from '@n8n/agents';
import { wrapToolForApproval } from '@n8n/agents/tool';
import { z } from 'zod';

import { withApprovalDescription } from '../approval-description';

function setup(inputSchema: BuiltTool['inputSchema'] = z.object({ target: z.string() })) {
	const handler = vi.fn().mockResolvedValue('done');
	const tool: BuiltTool = { name: 'write', description: 'Write a record', inputSchema, handler };
	const suspend = vi.fn().mockResolvedValue('waiting');
	const context: InterruptibleToolContext = { suspend, resumeData: undefined };
	const wrapped = withApprovalDescription(wrapToolForApproval(tool, { requireApproval: true }));
	return { handler, suspend, context, wrapped };
}

describe('approval descriptions', () => {
	it.each([undefined, '', '   ', 'a'.repeat(501)])(
		'requires a short description (%s)',
		async (description) => {
			const { wrapped, handler, suspend, context } = setup();
			await expect(
				wrapped.handler?.({ target: 'record', __approvalDescription: description }, context),
			).rejects.toThrow();
			expect(handler).not.toHaveBeenCalled();
			expect(suspend).not.toHaveBeenCalled();
		},
	);

	it.each([
		z.object({ target: z.string() }),
		{
			type: 'object',
			properties: { target: { type: 'string' } },
			required: ['target'],
			additionalProperties: false,
		},
	] satisfies Array<BuiltTool['inputSchema']>)(
		'shows the description and keeps it out of execution arguments',
		async (schema) => {
			const { wrapped, handler, suspend, context } = setup(schema);
			const input = { target: 'record', __approvalDescription: '  Update the selected record.  ' };
			expect(await wrapped.handler?.(input, context)).toBe('waiting');
			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'approval',
					description: 'Update the selected record.',
					args: { target: 'record' },
				}),
				expect.anything(),
			);
			expect(handler).not.toHaveBeenCalled();
			await wrapped.handler?.(input, {
				...context,
				resumeData: { approved: true },
				suspendPayload: suspend.mock.calls[0][0],
				continuation: suspend.mock.calls[0][1].continuation,
			});
			expect(handler).toHaveBeenCalledWith({ target: 'record' }, expect.anything());
		},
	);

	it('preserves original Zod validation and defaults', async () => {
		const { wrapped, context, suspend } = setup(z.object({ target: z.string().default('record') }));
		await wrapped.handler?.({ __approvalDescription: 'Update the selected record.' }, context);
		expect(suspend.mock.calls[0][0].args).toEqual({ target: 'record' });
		await expect(
			wrapped.handler?.(
				{ target: 123, __approvalDescription: 'Update the selected record.' },
				context,
			),
		).rejects.toThrow();
	});

	it('does not require a description for an action without approval', async () => {
		const handler = vi.fn().mockResolvedValue('done');
		const tool = withApprovalDescription(
			{ name: 'respond', description: 'Respond', handler },
			() => false,
		);
		await tool.handler?.({ message: 'Hello' }, {});
		expect(handler).toHaveBeenCalledWith({ message: 'Hello' }, expect.anything());
	});

	it('resumes an existing request without a description', async () => {
		const { wrapped, handler, context } = setup();
		await wrapped.handler?.(
			{ target: 'record' },
			{ ...context, resumeData: { approved: true }, suspendPayload: { type: 'approval' } },
		);
		expect(handler).toHaveBeenCalledWith({ target: 'record' }, expect.anything());
	});

	it('removes approval metadata before cancellation', async () => {
		const onCancellation = vi.fn();
		const tool = withApprovalDescription({
			name: 'write',
			description: 'Write a record',
			onCancellation,
		});
		await tool.onCancellation?.(
			{ target: 'record', __approvalDescription: 'Update the record.' },
			{ cancellation: { message: 'Stop' } },
		);
		expect(onCancellation).toHaveBeenCalledWith(
			{ target: 'record' },
			{ cancellation: { message: 'Stop' } },
		);
	});
});
