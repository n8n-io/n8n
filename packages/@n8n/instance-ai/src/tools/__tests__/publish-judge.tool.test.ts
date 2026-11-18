import type { Mock } from 'vitest';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext, InstanceAiPublishJudgeService } from '../../types';
import { createPublishJudgeTool } from '../publish-judge.tool';

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockPublishJudgeService() {
	return {
		get: vi.fn().mockResolvedValue(null),
		set: vi.fn().mockResolvedValue(null),
	} satisfies Record<keyof InstanceAiPublishJudgeService, Mock>;
}

// Pass `null` to build a context WITHOUT the service (a default only applies to `undefined`).
function createMockContext(
	publishJudgeService: ReturnType<
		typeof createMockPublishJudgeService
	> | null = createMockPublishJudgeService(),
): InstanceAiContext {
	return {
		userId: 'user-1',
		publishJudgeService: publishJudgeService ?? undefined,
	} as unknown as InstanceAiContext;
}

function suspendCtx(suspendFn: Mock) {
	return { resumeData: undefined, suspend: suspendFn } as never;
}

function resumeCtx(approved: boolean) {
	return { resumeData: { approved } } as never;
}

function noSuspendCtx() {
	return { resumeData: undefined, suspend: undefined } as never;
}

const judge = {
	judgeType: 'workflow' as const,
	judgeId: 'wf-judge',
	onUnavailable: 'block' as const,
	reviewAgents: true,
};

const setInput = {
	action: 'set' as const,
	judgeType: 'workflow' as const,
	judgeId: 'wf-judge',
	judgeName: 'Policy reviewer',
	onUnavailable: 'block' as const,
	reviewAgents: true,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('publish-judge tool', () => {
	describe('get action', () => {
		it('should read the instance judge when no projectId is given', async () => {
			const service = createMockPublishJudgeService();
			service.get.mockResolvedValue(judge);
			const tool = createPublishJudgeTool(createMockContext(service));

			const result = await executeTool(tool, { action: 'get' }, noSuspendCtx());

			expect(service.get).toHaveBeenCalledWith(null);
			expect(result).toEqual({ judge });
		});

		it('should read the project judge when a projectId is given', async () => {
			const service = createMockPublishJudgeService();
			service.get.mockResolvedValue(judge);
			const tool = createPublishJudgeTool(createMockContext(service));

			const result = await executeTool(
				tool,
				{ action: 'get', projectId: 'proj-1' },
				noSuspendCtx(),
			);

			expect(service.get).toHaveBeenCalledWith('proj-1');
			expect(result).toEqual({ judge });
		});

		it('should return a null judge when none is set', async () => {
			const tool = createPublishJudgeTool(createMockContext());

			const result = await executeTool(tool, { action: 'get' }, noSuspendCtx());

			expect(result).toEqual({ judge: null });
		});
	});

	describe('set action', () => {
		it('should suspend with a warning naming the judge before setting', async () => {
			const service = createMockPublishJudgeService();
			const suspend = vi.fn();
			const tool = createPublishJudgeTool(createMockContext(service));

			await executeTool(tool, setInput, suspendCtx(suspend));

			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining('Policy reviewer'),
					severity: 'warning',
				}),
			);
			expect(service.set).not.toHaveBeenCalled();
		});

		it('should show the project id in the approval message when no name is given', async () => {
			const suspend = vi.fn();
			const tool = createPublishJudgeTool(createMockContext());

			await executeTool(tool, { ...setInput, projectId: 'proj-1' }, suspendCtx(suspend));

			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({ message: expect.stringContaining('project "proj-1"') }),
			);
		});

		it('should show the project name in the approval message when it is given', async () => {
			const suspend = vi.fn();
			const tool = createPublishJudgeTool(createMockContext());

			await executeTool(
				tool,
				{ ...setInput, projectId: 'proj-1', projectName: 'Sales ops' },
				suspendCtx(suspend),
			);

			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({ message: expect.stringContaining('project "Sales ops"') }),
			);
		});

		it('should set the instance judge without the judge name once approved', async () => {
			const service = createMockPublishJudgeService();
			service.set.mockResolvedValue(judge);
			const tool = createPublishJudgeTool(createMockContext(service));

			const result = await executeTool(tool, setInput, resumeCtx(true));

			expect(service.set).toHaveBeenCalledWith(null, judge);
			expect(result).toEqual({ judge });
		});

		it('should set the project judge once approved', async () => {
			const service = createMockPublishJudgeService();
			service.set.mockResolvedValue(judge);
			const tool = createPublishJudgeTool(createMockContext(service));

			await executeTool(tool, { ...setInput, projectId: 'proj-1' }, resumeCtx(true));

			expect(service.set).toHaveBeenCalledWith('proj-1', judge);
		});

		it('should not set when the user denies', async () => {
			const service = createMockPublishJudgeService();
			const tool = createPublishJudgeTool(createMockContext(service));

			const result = await executeTool(tool, setInput, resumeCtx(false));

			expect(service.set).not.toHaveBeenCalled();
			expect(result).toEqual({ denied: true, reason: 'User denied the action' });
		});
	});

	describe('remove action', () => {
		it('should suspend with a warning before removing', async () => {
			const service = createMockPublishJudgeService();
			const suspend = vi.fn();
			const tool = createPublishJudgeTool(createMockContext(service));

			await executeTool(tool, { action: 'remove' }, suspendCtx(suspend));

			expect(suspend).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warning' }));
			expect(service.set).not.toHaveBeenCalled();
		});

		it('should clear the instance judge once approved', async () => {
			const service = createMockPublishJudgeService();
			const tool = createPublishJudgeTool(createMockContext(service));

			const result = await executeTool(tool, { action: 'remove' }, resumeCtx(true));

			expect(service.set).toHaveBeenCalledWith(null, null);
			expect(result).toEqual({ judge: null });
		});

		it('should clear the project judge once approved', async () => {
			const service = createMockPublishJudgeService();
			const tool = createPublishJudgeTool(createMockContext(service));

			await executeTool(tool, { action: 'remove', projectId: 'proj-1' }, resumeCtx(true));

			expect(service.set).toHaveBeenCalledWith('proj-1', null);
		});

		it('should not remove when the user denies', async () => {
			const service = createMockPublishJudgeService();
			const tool = createPublishJudgeTool(createMockContext(service));

			const result = await executeTool(tool, { action: 'remove' }, resumeCtx(false));

			expect(service.set).not.toHaveBeenCalled();
			expect(result).toEqual({ denied: true, reason: 'User denied the action' });
		});
	});

	describe('service errors', () => {
		it('should return a get error instead of throwing', async () => {
			const service = createMockPublishJudgeService();
			service.get.mockRejectedValue(
				new Error('Only an instance admin can read or set a publish judge'),
			);
			const tool = createPublishJudgeTool(createMockContext(service));

			const result = await executeTool(tool, { action: 'get' }, noSuspendCtx());

			expect(result).toEqual({ error: 'Only an instance admin can read or set a publish judge' });
		});

		it('should return a set error instead of throwing', async () => {
			const service = createMockPublishJudgeService();
			service.set.mockRejectedValue(
				new Error('Only an instance admin can read or set a publish judge'),
			);
			const tool = createPublishJudgeTool(createMockContext(service));

			const result = await executeTool(tool, setInput, resumeCtx(true));

			expect(result).toEqual({ error: 'Only an instance admin can read or set a publish judge' });
		});
	});

	describe('when publish judges are unavailable', () => {
		it('should report unavailable instead of calling a service', async () => {
			const tool = createPublishJudgeTool(createMockContext(null));

			const result = await executeTool(tool, { action: 'get' }, noSuspendCtx());

			expect(result).toEqual({ error: 'Publish judges are not available on this instance.' });
		});
	});
});
