import type { Config } from '@oclif/core';
import { describe, it, expect, vi, afterEach } from 'vitest';

import { ApiError, type N8nClient } from '../client';
import PromotionProviderListBranches from '../commands/promotion-provider/list-branches';
import PromotionProviderListRepositories from '../commands/promotion-provider/list-repositories';

/** The command methods we stub to isolate behaviour from oclif/networking. */
interface Internals {
	parse: () => Promise<{ args: Record<string, string>; flags: Record<string, unknown> }>;
	getClient: () => N8nClient;
	log: (message: string) => void;
}

const REPOSITORIES = [
	{
		id: '42',
		name: 'flows',
		fullPath: 'acme/flows',
		remoteUrl: 'https://gitlab.example.com/acme/flows.git',
		defaultBranch: 'main',
	},
	{
		id: '43',
		name: 'empty',
		fullPath: 'acme/empty',
		remoteUrl: 'https://gitlab.example.com/acme/empty.git',
		defaultBranch: null,
	},
];

const BRANCHES = [
	{ name: 'main', isDefault: true },
	{ name: 'release', isDefault: false },
];

function stubRepositories(flags: Record<string, unknown>, result: Promise<unknown>) {
	const command = new PromotionProviderListRepositories([], {} as Config);
	const internals = command as unknown as Internals;
	const lines: string[] = [];

	vi.spyOn(internals, 'parse').mockResolvedValue({ args: { id: 'prov-1' }, flags });
	vi.spyOn(internals, 'getClient').mockReturnValue({
		listPromotionProviderRepositories: vi.fn().mockReturnValue(result),
	} as unknown as N8nClient);
	vi.spyOn(internals, 'log').mockImplementation((line: string) => lines.push(line));

	return { command, lines };
}

function stubBranches(flags: Record<string, unknown>) {
	const command = new PromotionProviderListBranches([], {} as Config);
	const internals = command as unknown as Internals;
	const lines: string[] = [];

	vi.spyOn(internals, 'parse').mockResolvedValue({
		args: { id: 'prov-1', repository: 'acme/flows' },
		flags,
	});
	vi.spyOn(internals, 'getClient').mockReturnValue({
		listPromotionProviderBranches: vi.fn().mockResolvedValue(BRANCHES),
	} as unknown as N8nClient);
	vi.spyOn(internals, 'log').mockImplementation((line: string) => lines.push(line));

	return { command, lines };
}

describe('promotion-provider discovery commands', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('list-repositories', () => {
		it('prints every field of the repository row as a table column', async () => {
			const { command, lines } = stubRepositories(
				{ format: 'table' },
				Promise.resolve(REPOSITORIES),
			);

			await command.run();

			const [header, , first, second] = lines.join('\n').split('\n');
			expect(header.trim().split(/\s+/)).toEqual([
				'ID',
				'NAME',
				'FULLPATH',
				'REMOTEURL',
				'DEFAULTBRANCH',
			]);
			expect(first.trim().split(/\s+/)).toEqual([
				'42',
				'flows',
				'acme/flows',
				'https://gitlab.example.com/acme/flows.git',
				'main',
			]);
			// A repository without commits has no default branch.
			expect(second.trim().split(/\s+/).at(-1)).toBe('-');
		});

		it('prints the repository IDs for --format=id-only', async () => {
			const { command, lines } = stubRepositories(
				{ format: 'id-only' },
				Promise.resolve(REPOSITORIES),
			);

			await command.run();

			expect(lines).toEqual(['42\n43']);
		});

		it('fails with the server message for a provider without a Git host API', async () => {
			const message =
				'This provider has no Git host API. Use a GitLab provider to list repositories and branches.';
			const { command } = stubRepositories(
				{ format: 'table' },
				Promise.reject(new ApiError(400, message)),
			);

			await expect(command.run()).rejects.toThrow(message);
		});
	});

	describe('list-branches', () => {
		it('marks the default branch in the table', async () => {
			const { command, lines } = stubBranches({ format: 'table' });

			await command.run();

			const [header, , main, release] = lines.join('\n').split('\n');
			expect(header.trim().split(/\s+/)).toEqual(['NAME', 'ISDEFAULT']);
			expect(main.trim().split(/\s+/)).toEqual(['main', 'true']);
			expect(release.trim().split(/\s+/)).toEqual(['release', 'false']);
		});

		it('prints the branch names for --format=id-only', async () => {
			const { command, lines } = stubBranches({ format: 'id-only' });

			await command.run();

			expect(lines).toEqual(['main\nrelease']);
		});
	});
});
