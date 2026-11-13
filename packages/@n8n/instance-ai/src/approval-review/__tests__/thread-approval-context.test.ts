import { wrapToolForApproval } from '@n8n/agents';
import type { InterruptibleToolContext } from '@n8n/agents';

import { createThreadApprovalContext } from '../thread-approval-context';

describe('createThreadApprovalContext', () => {
	function mcpTool(call = vi.fn(async () => ({ ok: true }))) {
		const tool = wrapToolForApproval(
			{ name: 'linear_create_issue', description: 'Create', mcpTool: true, handler: call },
			{ requireApproval: true },
		);
		return { tool, call };
	}

	function context(grants = new Set<string>()) {
		const grantSessionToolApproval = vi.fn(async (key: string) => {
			grants.add(key);
		});
		return { sessionApprovedToolKeys: grants, grantSessionToolApproval, grants };
	}

	it('is absent when the run has no grant storage', () => {
		expect(createThreadApprovalContext({})).toBeUndefined();
	});

	it('saves "Always allow" on an MCP card as a thread grant instead of failing', async () => {
		const { tool, call } = mcpTool();
		const run = context();
		const approvalContext = createThreadApprovalContext(run);

		const result = await tool.handler!({ title: 'Bug' }, {
			resumeData: { approved: true, scope: 'session' },
			suspendPayload: { type: 'approval' },
			continuation: { __n8nApprovalGate: true },
			suspend: vi.fn(),
			approvalContext,
		} as unknown as InterruptibleToolContext);

		expect(result).toEqual({ ok: true });
		expect(call).toHaveBeenCalledTimes(1);
		expect(run.grantSessionToolApproval).toHaveBeenCalledWith('["tool","linear_create_issue"]');
	});

	it('runs a granted MCP tool without a card', async () => {
		const { tool, call } = mcpTool();
		const run = context(new Set(['["tool","linear_create_issue"]']));
		const suspend = vi.fn();

		await tool.handler!({ title: 'Bug' }, {
			resumeData: undefined,
			suspend,
			approvalContext: createThreadApprovalContext(run),
		} as unknown as InterruptibleToolContext);

		expect(suspend).not.toHaveBeenCalled();
		expect(call).toHaveBeenCalledTimes(1);
	});

	it('saves no grant for a one-time approval', async () => {
		const { tool } = mcpTool();
		const run = context();

		await tool.handler!({ title: 'Bug' }, {
			resumeData: { approved: true },
			suspendPayload: { type: 'approval' },
			continuation: { __n8nApprovalGate: true },
			suspend: vi.fn(),
			approvalContext: createThreadApprovalContext(run),
		} as unknown as InterruptibleToolContext);

		expect(run.grantSessionToolApproval).not.toHaveBeenCalled();
	});
});
