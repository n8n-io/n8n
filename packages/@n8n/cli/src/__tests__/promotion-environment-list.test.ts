import type { Config } from '@oclif/core';
import { describe, it, expect, vi, afterEach } from 'vitest';

import type { N8nClient } from '../client';
import PromotionEnvironmentList from '../commands/promotion-environment/list';

interface ListFlags {
	scope?: string;
	direction?: string;
	provider?: string;
	limit?: number;
}

/** The command methods we stub to isolate behaviour from oclif/networking. */
interface ListInternals {
	parse: () => Promise<{ flags: ListFlags }>;
	getClient: () => N8nClient;
	output: (data: unknown) => void;
}

function stubCommand(flags: ListFlags) {
	const command = new PromotionEnvironmentList([], {} as Config);
	const internals = command as unknown as ListInternals;
	const listPromotionEnvironments = vi.fn().mockResolvedValue([]);

	// Bypass oclif arg parsing, connection setup, and rendering.
	vi.spyOn(internals, 'parse').mockResolvedValue({ flags });
	vi.spyOn(internals, 'getClient').mockReturnValue({
		listPromotionEnvironments,
	} as unknown as N8nClient);
	vi.spyOn(internals, 'output').mockImplementation(() => {});

	return { command, listPromotionEnvironments };
}

describe('promotion-environment list command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sends the direction and provider filters under the names the API expects', async () => {
		const { command, listPromotionEnvironments } = stubCommand({
			scope: 'instance',
			direction: 'promote',
			provider: 'prov-1',
			limit: 10,
		});

		await command.run();

		// `--provider` travels as `providerId`. The API drops an unknown name and
		// answers with every environment, so a wrong name here fails silently.
		expect(listPromotionEnvironments).toHaveBeenCalledWith(
			{ scope: 'instance', direction: 'promote', providerId: 'prov-1' },
			10,
		);
	});

	it('asks for every environment when no filter is set', async () => {
		const { command, listPromotionEnvironments } = stubCommand({});

		await command.run();

		expect(listPromotionEnvironments).toHaveBeenCalledWith({}, undefined);
	});
});
