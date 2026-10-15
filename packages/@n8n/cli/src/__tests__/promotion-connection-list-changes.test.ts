import type { Config } from '@oclif/core';
import { describe, it, expect, vi, afterEach } from 'vitest';

import type { N8nClient, ProjectPromotionChanges } from '../client';
import PromotionConnectionListChanges from '../commands/promotion-connection/list-changes';

interface ListChangesFlags {
	format?: string;
	json?: boolean;
	jq?: string;
	search?: string;
	sort?: string;
	order?: string;
}

/** The command methods we stub to isolate behaviour from oclif/networking. */
interface ListChangesInternals {
	parse: () => Promise<{
		args: { projectId: string; direction: string };
		flags: ListChangesFlags;
	}>;
	getClient: () => N8nClient;
	output: (data: unknown, flags: unknown, options?: unknown) => void;
}

const CHANGES: ProjectPromotionChanges = {
	commitSha: 'abc123',
	changes: [
		{
			id: 'wf-1',
			name: 'First',
			type: 'workflow',
			status: 'modified',
			version: 3,
			updatedAt: '2026-01-01T00:00:00.000Z',
			updatedBy: 'user-1',
			dependencyCount: 0,
		},
	],
};

function stubCommand(flags: ListChangesFlags) {
	const command = new PromotionConnectionListChanges([], {} as Config);
	const internals = command as unknown as ListChangesInternals;
	const listProjectPromotionChanges = vi.fn().mockResolvedValue(CHANGES);

	// Bypass oclif arg parsing, connection setup, and rendering.
	vi.spyOn(internals, 'parse').mockResolvedValue({
		args: { projectId: 'proj-1', direction: 'promote' },
		flags,
	});
	vi.spyOn(internals, 'getClient').mockReturnValue({
		listProjectPromotionChanges,
	} as unknown as N8nClient);
	const output = vi.spyOn(internals, 'output').mockImplementation(() => {});

	return { command, output, listProjectPromotionChanges };
}

describe('promotion-connection list-changes command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('passes the search, sort, and order flags to the change preview', async () => {
		const { command, listProjectPromotionChanges } = stubCommand({
			search: 'checkout',
			sort: 'updatedAt',
			order: 'desc',
		});

		await command.run();

		expect(listProjectPromotionChanges).toHaveBeenCalledWith('proj-1', 'promote', {
			search: 'checkout',
			sort: 'updatedAt',
			order: 'desc',
		});
	});

	it('unwraps the changes array for table output so rows render individually', async () => {
		const { command, output } = stubCommand({ format: 'table' });

		await command.run();

		// The array reaches `output` directly; otherwise the wrapper serializes the
		// whole list into a single `changes` cell.
		expect(output).toHaveBeenCalledWith(CHANGES.changes, expect.anything(), {
			columns: ['id', 'name', 'type', 'status', 'version', 'updatedAt'],
		});
	});

	it('unwraps the changes array for id-only output', async () => {
		const { command, output } = stubCommand({ format: 'id-only' });

		await command.run();

		// The wrapper has no top-level `id`, so id-only would print nothing without
		// unwrapping.
		expect(output).toHaveBeenCalledWith(CHANGES.changes, expect.anything(), {
			columns: ['id', 'name', 'type', 'status', 'version', 'updatedAt'],
		});
	});

	it('keeps the wrapper for JSON output', async () => {
		const { command, output } = stubCommand({ json: true });

		await command.run();

		// JSON consumers want the `commitSha` context alongside the changes.
		expect(output).toHaveBeenCalledWith(CHANGES, expect.anything());
	});

	it('keeps the wrapper for jq output', async () => {
		const { command, output } = stubCommand({ jq: '.changes[].id' });

		await command.run();

		expect(output).toHaveBeenCalledWith(CHANGES, expect.anything());
	});
});
