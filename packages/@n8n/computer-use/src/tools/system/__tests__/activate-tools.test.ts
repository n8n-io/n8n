import type { PermissionMode, ToolGroup } from '../../../config';
import type { GatewaySession } from '../../../gateway-session';
import type { ToolContext } from '../../types';
import { activateToolsTool } from '../activate-tools';

function makeSession(
	modes: Partial<Record<ToolGroup, PermissionMode>>,
): Pick<GatewaySession, 'getGroupMode' | 'activateToolGroups'> {
	return {
		getGroupMode: (group: ToolGroup) => modes[group] ?? 'ask',
		activateToolGroups: jest.fn().mockResolvedValue(undefined),
	};
}

function makeContext(session: ReturnType<typeof makeSession>): ToolContext {
	return { dir: '/test', session: session as unknown as GatewaySession };
}

describe('activate_tools', () => {
	describe('getAffectedResources', () => {
		it('returns one resource per group that is currently deny', async () => {
			const session = makeSession({ shell: 'deny', browser: 'deny', computer: 'ask' });
			const context = makeContext(session);

			const resources = await activateToolsTool.getAffectedResources(
				{ toolGroups: ['shell', 'browser', 'computer'] },
				context,
			);

			expect(resources).toHaveLength(2);
			expect(resources[0]).toEqual({
				toolGroup: 'system',
				resource: 'activate:shell',
				description: 'Activate tool group: shell',
			});
			expect(resources[1]).toEqual({
				toolGroup: 'system',
				resource: 'activate:browser',
				description: 'Activate tool group: browser',
			});
		});

		it('returns empty array when all requested groups are already active', async () => {
			const session = makeSession({ shell: 'ask', browser: 'allow' });
			const context = makeContext(session);

			const resources = await activateToolsTool.getAffectedResources(
				{ toolGroups: ['shell', 'browser'] },
				context,
			);

			expect(resources).toHaveLength(0);
		});

		it('returns empty array when no session is provided', async () => {
			const context: ToolContext = { dir: '/test' };

			const resources = await activateToolsTool.getAffectedResources(
				{ toolGroups: ['shell'] },
				context,
			);

			expect(resources).toHaveLength(0);
		});
	});

	describe('execute', () => {
		it('calls activateToolGroups with the requested groups and returns a text result', async () => {
			const session = makeSession({ shell: 'deny' });
			const context = makeContext(session);

			const result = await activateToolsTool.execute({ toolGroups: ['shell', 'browser'] }, context);

			expect(session.activateToolGroups).toHaveBeenCalledWith(['shell', 'browser']);
			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');
			expect((result.content[0] as { type: 'text'; text: string }).text).toContain('shell');
			expect((result.content[0] as { type: 'text'; text: string }).text).toContain('browser');
		});

		it('completes without error when no session is provided', async () => {
			const context: ToolContext = { dir: '/test' };

			await expect(
				activateToolsTool.execute({ toolGroups: ['shell'] }, context),
			).resolves.not.toThrow();
		});
	});
});
