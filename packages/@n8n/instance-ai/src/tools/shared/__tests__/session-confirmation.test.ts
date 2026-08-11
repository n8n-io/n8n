import type { InstanceAiContext } from '../../../types';
import {
	hasSessionGrant,
	persistSessionGrantIfRequested,
	resolveConfirmationGate,
} from '../session-confirmation';

function createContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		sessionApprovedToolKeys: new Set<string>(),
		grantSessionToolApproval: vi.fn().mockResolvedValue(undefined),
		...overrides,
	} as unknown as InstanceAiContext;
}

describe('session-confirmation helpers', () => {
	describe('hasSessionGrant', () => {
		it('returns true only when the grant key is present', () => {
			const context = createContext({
				sessionApprovedToolKeys: new Set(['workspace:tag-workflow']),
			});
			expect(hasSessionGrant(context, 'workspace:tag-workflow')).toBe(true);
			expect(hasSessionGrant(context, 'workspace:create-folder')).toBe(false);
		});
	});

	describe('persistSessionGrantIfRequested', () => {
		it('persists when resume scope is session', async () => {
			const grantSessionToolApproval = vi.fn().mockResolvedValue(undefined);
			const context = createContext({ grantSessionToolApproval });

			await persistSessionGrantIfRequested(context, 'workspace:tag-workflow', {
				approved: true,
				scope: 'session',
			});

			expect(grantSessionToolApproval).toHaveBeenCalledWith('workspace:tag-workflow');
		});

		it('does not persist for one-time approval', async () => {
			const grantSessionToolApproval = vi.fn().mockResolvedValue(undefined);
			const context = createContext({ grantSessionToolApproval });

			await persistSessionGrantIfRequested(context, 'workspace:tag-workflow', {
				approved: true,
			});

			expect(grantSessionToolApproval).not.toHaveBeenCalled();
		});
	});

	describe('resolveConfirmationGate', () => {
		it('returns blocked without suspending', async () => {
			const suspend = vi.fn();
			const result = await resolveConfirmationGate({
				context: createContext(),
				permission: 'blocked',
				grantKey: 'workspace:tag-workflow',
				resumeData: undefined,
				suspend,
				message: 'Tag workflow?',
				severity: 'info',
			});
			expect(result).toBe('blocked');
			expect(suspend).not.toHaveBeenCalled();
		});

		it('proceeds when admin always_allow is set', async () => {
			const suspend = vi.fn();
			const result = await resolveConfirmationGate({
				context: createContext(),
				permission: 'always_allow',
				grantKey: 'workspace:tag-workflow',
				resumeData: undefined,
				suspend,
				message: 'Tag workflow?',
				severity: 'info',
			});
			expect(result).toBe('proceed');
			expect(suspend).not.toHaveBeenCalled();
		});

		it('proceeds when a session grant already exists', async () => {
			const suspend = vi.fn();
			const result = await resolveConfirmationGate({
				context: createContext({
					sessionApprovedToolKeys: new Set(['workspace:tag-workflow']),
				}),
				permission: 'require_approval',
				grantKey: 'workspace:tag-workflow',
				resumeData: undefined,
				suspend,
				message: 'Tag workflow?',
				severity: 'info',
			});
			expect(result).toBe('proceed');
			expect(suspend).not.toHaveBeenCalled();
		});

		it('suspends when approval is required and there is no resume data', async () => {
			const suspend = vi.fn().mockResolvedValue(undefined);
			await resolveConfirmationGate({
				context: createContext(),
				permission: 'require_approval',
				grantKey: 'workspace:tag-workflow',
				resumeData: undefined,
				suspend,
				message: 'Tag workflow?',
				severity: 'info',
			});
			expect(suspend).toHaveBeenCalledTimes(1);
			const payload = suspend.mock.calls[0]?.[0] as {
				message: string;
				severity: string;
				requestId: string;
			};
			expect(payload.message).toBe('Tag workflow?');
			expect(payload.severity).toBe('info');
			expect(typeof payload.requestId).toBe('string');
			expect(payload.requestId.length).toBeGreaterThan(0);
		});

		it('returns denied when the user rejects', async () => {
			const result = await resolveConfirmationGate({
				context: createContext(),
				permission: 'require_approval',
				grantKey: 'workspace:tag-workflow',
				resumeData: { approved: false },
				suspend: vi.fn(),
				message: 'Tag workflow?',
				severity: 'info',
			});
			expect(result).toBe('denied');
		});

		it('persists a session grant on Always allow resume', async () => {
			const grantSessionToolApproval = vi.fn().mockResolvedValue(undefined);
			const result = await resolveConfirmationGate({
				context: createContext({ grantSessionToolApproval }),
				permission: 'require_approval',
				grantKey: 'workspace:tag-workflow',
				resumeData: { approved: true, scope: 'session' },
				suspend: vi.fn(),
				message: 'Tag workflow?',
				severity: 'info',
			});
			expect(result).toBe('proceed');
			expect(grantSessionToolApproval).toHaveBeenCalledWith('workspace:tag-workflow');
		});

		it('skips grant persistence for destructive actions without a grantKey', async () => {
			const grantSessionToolApproval = vi.fn().mockResolvedValue(undefined);
			const result = await resolveConfirmationGate({
				context: createContext({ grantSessionToolApproval }),
				permission: 'require_approval',
				resumeData: { approved: true, scope: 'session' },
				suspend: vi.fn(),
				message: 'Delete folder?',
				severity: 'destructive',
			});
			expect(result).toBe('proceed');
			expect(grantSessionToolApproval).not.toHaveBeenCalled();
		});
	});
});
