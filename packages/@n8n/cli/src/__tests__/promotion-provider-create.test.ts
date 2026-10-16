import type { Config } from '@oclif/core';
import { describe, it, expect, vi, afterEach } from 'vitest';

import type { N8nClient } from '../client';
import PromotionProviderCreate from '../commands/promotion-provider/create';

/** The command methods we stub to isolate behaviour from oclif/networking. */
interface CreateInternals {
	parse: () => Promise<{ flags: { stdin: boolean } }>;
	readInput: () => string;
	getClient: () => N8nClient;
	output: (data: unknown) => void;
}

const PROVIDER = {
	id: 'prov-1',
	name: 'GitHub',
	type: 'git',
	authType: 'ssh-key',
	config: { schemaVersion: 1, publicKey: 'ssh-ed25519 AAAA', keyType: 'ed25519' },
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('promotion-provider create command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('puts the new provider id at the top level, next to the public key', async () => {
		const command = new PromotionProviderCreate([], {} as Config);
		const internals = command as unknown as CreateInternals;
		const createPromotionProvider = vi
			.fn()
			.mockResolvedValue({ provider: PROVIDER, publicKey: 'ssh-ed25519 AAAA' });

		// Bypass oclif arg parsing, stdin reading, and connection setup.
		vi.spyOn(internals, 'parse').mockResolvedValue({ flags: { stdin: true } });
		vi.spyOn(internals, 'readInput').mockReturnValue('{"name":"GitHub","type":"git"}');
		vi.spyOn(internals, 'getClient').mockReturnValue({
			createPromotionProvider,
		} as unknown as N8nClient);
		const output = vi.spyOn(internals, 'output').mockImplementation(() => {});

		await command.run();

		// The API answers { provider, publicKey }. Passing that on unchanged would
		// leave --format=id-only and --jq '.id' empty.
		expect(output).toHaveBeenCalledWith(
			{ ...PROVIDER, publicKey: 'ssh-ed25519 AAAA' },
			expect.anything(),
		);
	});
});
