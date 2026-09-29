import type { Config } from '@oclif/core';
import { describe, it, expect, vi, afterEach } from 'vitest';

import type { N8nClient } from '../client';
import PromotionConnectionList from '../commands/promotion-connection/list';

interface ListFlags {
	scope?: string;
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
	const command = new PromotionConnectionList([], {} as Config);
	const internals = command as unknown as ListInternals;
	const listPromotionConnections = vi.fn().mockResolvedValue([]);

	// Bypass oclif arg parsing, connection setup, and rendering.
	vi.spyOn(internals, 'parse').mockResolvedValue({ flags });
	vi.spyOn(internals, 'getClient').mockReturnValue({
		listPromotionConnections,
	} as unknown as N8nClient);
	vi.spyOn(internals, 'output').mockImplementation(() => {});

	return { command, listPromotionConnections };
}

describe('promotion-connection list command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sends the provider filter under the name the API expects', async () => {
		const { command, listPromotionConnections } = stubCommand({
			scope: 'instance',
			provider: 'prov-1',
			limit: 10,
		});

		await command.run();

		// `--provider` travels as `providerId`. The API drops an unknown name and
		// answers with every connection, so a wrong name here fails silently.
		expect(listPromotionConnections).toHaveBeenCalledWith(
			{ scope: 'instance', providerId: 'prov-1' },
			10,
		);
	});

	it('asks for every connection when no filter is set', async () => {
		const { command, listPromotionConnections } = stubCommand({});

		await command.run();

		expect(listPromotionConnections).toHaveBeenCalledWith({}, undefined);
	});
});
