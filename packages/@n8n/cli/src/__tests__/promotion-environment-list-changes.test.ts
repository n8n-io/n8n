import type { Config } from '@oclif/core';
import { describe, it, expect, vi, afterEach } from 'vitest';

import type { N8nClient, PromotionPreview } from '../client';
import PromotionEnvironmentListChanges from '../commands/promotion-environment/list-changes';

interface ListChangesFlags {
	format?: string;
	json?: boolean;
	jq?: string;
}

/** The command methods we stub to isolate behaviour from oclif/networking. */
interface ListChangesInternals {
	parse: () => Promise<{
		args: { projectId: string; direction: string };
		flags: ListChangesFlags;
	}>;
	getClient: () => N8nClient;
	output: (data: unknown, flags: unknown, options?: unknown) => void;
	logToStderr: (message: string) => void;
}

type Resource = PromotionPreview['resources'][number];

const resource = (overrides: Partial<Resource> & Pick<Resource, 'key' | 'type'>): Resource => ({
	id: overrides.key.slice(overrides.key.indexOf(':') + 1),
	name: overrides.key,
	parentKey: 'project:proj-1',
	change: 'unchanged',
	selectable: false,
	revision: { before: 'a', after: 'a' },
	...overrides,
});

const PREVIEW: PromotionPreview = {
	commitSha: 'abc123',
	source: { environmentId: 'env-1', branchName: 'main' },
	resources: [
		resource({ key: 'project:proj-1', type: 'project', parentKey: null }),
		resource({ key: 'folder:folder-1', type: 'folder', name: 'Reports' }),
		resource({
			key: 'workflow:wf-1',
			type: 'workflow',
			name: 'Weekly report',
			parentKey: 'folder:folder-1',
			change: 'modified',
			selectable: true,
		}),
		// Unchanged, but listed because it carries the changed credential.
		resource({ key: 'workflow:wf-2', type: 'workflow', selectable: true }),
		resource({
			key: 'credential:cred-1',
			type: 'credential',
			name: 'Billing API',
			parentKey: null,
			change: 'modified',
		}),
	],
	dependencies: [
		{ workflowKey: 'workflow:wf-2', resourceKey: 'credential:cred-1', included: true },
		{ workflowKey: 'workflow:wf-1', resourceKey: 'workflow:wf-2', included: false },
	],
};

const COLUMNS = ['type', 'id', 'name', 'change', 'folder', 'usedBy', 'selectable'];

const ROWS = [
	{
		type: 'workflow',
		id: 'wf-1',
		name: 'Weekly report',
		change: 'modified',
		folder: 'Reports',
		usedBy: undefined,
		selectable: true,
	},
	{
		type: 'credential',
		id: 'cred-1',
		name: 'Billing API',
		change: 'modified',
		folder: undefined,
		usedBy: 'wf-2',
		selectable: false,
	},
];

function stubCommand(flags: ListChangesFlags, preview: PromotionPreview = PREVIEW) {
	const command = new PromotionEnvironmentListChanges([], {} as Config);
	const internals = command as unknown as ListChangesInternals;
	const listProjectPromotionChanges = vi.fn().mockResolvedValue(preview);

	// Bypass oclif arg parsing, connection setup, and rendering.
	vi.spyOn(internals, 'parse').mockResolvedValue({
		args: { projectId: 'proj-1', direction: 'promote' },
		flags,
	});
	vi.spyOn(internals, 'getClient').mockReturnValue({
		listProjectPromotionChanges,
	} as unknown as N8nClient);
	const output = vi.spyOn(internals, 'output').mockImplementation(() => {});
	const logToStderr = vi.spyOn(internals, 'logToStderr').mockImplementation(() => {});

	return { command, output, logToStderr, listProjectPromotionChanges };
}

describe('promotion-environment list-changes command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('lists the changed resources with their folder and the workflows that carry them', async () => {
		const { command, output, listProjectPromotionChanges } = stubCommand({ format: 'table' });

		await command.run();

		expect(listProjectPromotionChanges).toHaveBeenCalledWith('proj-1', 'promote');
		expect(output).toHaveBeenCalledWith(ROWS, expect.anything(), { columns: COLUMNS });
	});

	it('lists the changed resources for id-only output', async () => {
		const { command, output } = stubCommand({ format: 'id-only' });

		await command.run();

		// The preview has no top-level `id`, so id-only would print nothing without the rows.
		expect(output).toHaveBeenCalledWith(ROWS, expect.anything(), { columns: COLUMNS });
	});

	it('keeps the whole preview for JSON output', async () => {
		const { command, output } = stubCommand({ json: true });

		await command.run();

		// JSON consumers need the commit, the dependencies and the Apply revision too.
		expect(output).toHaveBeenCalledWith(PREVIEW, expect.anything());
	});

	it('keeps the whole preview for jq output', async () => {
		const { command, output } = stubCommand({ jq: '.resources[].id' });

		await command.run();

		expect(output).toHaveBeenCalledWith(PREVIEW, expect.anything());
	});

	it('names the open review that holds the changes', async () => {
		const { command, logToStderr } = stubCommand(
			{ format: 'table' },
			{
				...PREVIEW,
				resources: [],
				dependencies: [],
				blocker: { code: 'reviewOpen', reviewId: 'review-1' },
			},
		);

		await command.run();

		expect(logToStderr).toHaveBeenCalledWith(expect.stringContaining('review-1'));
	});
});
