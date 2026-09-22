import type { Config } from '@oclif/core';
import { describe, it, expect, vi, afterEach } from 'vitest';

import type { N8nClient } from '../client';
import PromotionConnectionApply from '../commands/promotion-connection/apply';
import PromotionConnectionPromote from '../commands/promotion-connection/promote';

/** The command methods we stub to isolate behaviour from oclif/networking. */
interface OperationInternals {
	parse: () => Promise<{ args: { id: string }; flags: Record<string, unknown> }>;
	getClient: () => N8nClient;
	succeed: (message: string, ...rest: unknown[]) => void;
}

const PROMOTE_RESULT = {
	connectionId: 'conn-1',
	configId: 'cfg-1',
	counts: { workflows: 3, folders: 1, credentials: 0, dataTables: 0, variables: 2, tags: 1 },
	git: { commitSha: 'abc1234', branchName: 'main' },
};

const APPLY_RESULT = {
	connectionId: 'conn-1',
	configId: 'cfg-2',
	counts: {},
	git: { commitSha: 'def5678', branchName: 'release' },
};

function stubCommand(
	command: PromotionConnectionPromote | PromotionConnectionApply,
	flags: Record<string, unknown>,
	client: Partial<N8nClient>,
) {
	const internals = command as unknown as OperationInternals;

	// Bypass oclif arg parsing, connection setup, and the success/exit path.
	vi.spyOn(internals, 'parse').mockResolvedValue({ args: { id: 'conn-1' }, flags });
	vi.spyOn(internals, 'getClient').mockReturnValue(client as N8nClient);
	const succeed = vi.spyOn(internals, 'succeed').mockImplementation(() => {});

	return succeed;
}

describe('promotion-connection promote command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sends the commit message and force flag, and names the branch it pushed to', async () => {
		const command = new PromotionConnectionPromote([], {} as Config);
		const promotePackage = vi.fn().mockResolvedValue(PROMOTE_RESULT);
		const succeed = stubCommand(command, { message: 'Promote team projects', force: true }, {
			promotePackage,
		} as unknown as Partial<N8nClient>);

		await command.run();

		// `-m` travels as `commitMessage`.
		expect(promotePackage).toHaveBeenCalledWith('conn-1', {
			commitMessage: 'Promote team projects',
			force: true,
		});
		// The branch and commit live under `git`. Reading them flat prints
		// "undefined" while succeed() still exits 0, so a script sees success.
		expect(succeed).toHaveBeenCalledWith(
			'Promoted to main as commit abc1234.',
			expect.anything(),
			PROMOTE_RESULT,
		);
	});
});

describe('promotion-connection apply command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('names the branch and commit it applied', async () => {
		const command = new PromotionConnectionApply([], {} as Config);
		const applyPackage = vi.fn().mockResolvedValue(APPLY_RESULT);
		const succeed = stubCommand(command, {}, {
			applyPackage,
		} as unknown as Partial<N8nClient>);

		await command.run();

		expect(applyPackage).toHaveBeenCalledWith('conn-1');
		expect(succeed).toHaveBeenCalledWith(
			'Applied release at commit def5678 to the instance.',
			expect.anything(),
			APPLY_RESULT,
		);
	});
});
