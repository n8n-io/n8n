import { testDb } from '@n8n/backend-test-utils';
import { SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Cipher, InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { SOURCE_CONTROL_PREFERENCES_DB_KEY } from '@/modules/source-control.ee/constants';
import { generateSshKeyPair } from '@/modules/source-control.ee/source-control-helper.ee';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { SourceControlConfig } from '@/modules/source-control.ee/source-control.config';

vi.mock('@/modules/source-control.ee/source-control-helper.ee', () => ({
	generateSshKeyPair: vi.fn(),
}));

const SSH_KEYS = 'features.sourceControl.sshKeys';

/** Holds each caller until `count` callers arrive, so that all of them read before any writes. */
const barrier = (count: number) => {
	let arrived = 0;
	let release = () => {};
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	return async () => {
		if (++arrived === count) release();
		await gate;
	};
};

describe('SourceControlPreferencesService initialization', () => {
	let repository: SettingsRepository;

	const createService = () =>
		new SourceControlPreferencesService(
			mock<InstanceSettings>({ n8nFolder: '', isMultiMain: false }),
			mock(),
			mock<Cipher>({ encryptV2: async (value: string) => `encrypted:${value}` }),
			repository,
			new SourceControlConfig(),
			mock(),
		);

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(SettingsRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['Settings']);
		let generated = 0;
		vi.mocked(generateSshKeyPair).mockImplementation(async () => {
			generated++;
			return { privateKey: `private-${generated}`, publicKey: `public-${generated}` };
		});
	});

	afterEach(() => vi.restoreAllMocks());
	afterAll(async () => await testDb.terminate());

	it('initializes two mains concurrently on an empty database', async () => {
		const findByKey = repository.findByKey.bind(repository);
		const findOne = repository.findOne.bind(repository);
		const waitForKeyReads = barrier(2);
		const waitForPreferenceReads = barrier(2);
		vi.spyOn(repository, 'findByKey').mockImplementation(async (key) => {
			const stored = await findByKey(key);
			if (key === SSH_KEYS && !stored) await waitForKeyReads();
			return stored;
		});
		vi.spyOn(repository, 'findOne').mockImplementation(async (options) => {
			const stored = await findOne(options);
			if (!stored) await waitForPreferenceReads();
			return stored;
		});

		await expect(
			Promise.all([
				createService().loadFromDbAndApplySourceControlPreferences(),
				createService().loadFromDbAndApplySourceControlPreferences(),
			]),
		).resolves.toHaveLength(2);

		// Both mains saw an empty database, so both generated a key pair. This is the
		// race itself: if a refactor bypasses the barriers, only one key is generated.
		expect(generateSshKeyPair).toHaveBeenCalledTimes(2);

		const keyRow = await repository.findByKey(SSH_KEYS);
		const preferencesRow = await repository.findByKey(SOURCE_CONTROL_PREFERENCES_DB_KEY);

		// Last write wins, but the stored row is one complete key pair, not a mix.
		expect(keyRow?.loadOnStartup).toBe(true);
		expect([
			'{"encryptedPrivateKey":"encrypted:private-1","publicKey":"public-1"}',
			'{"encryptedPrivateKey":"encrypted:private-2","publicKey":"public-2"}',
		]).toContain(keyRow?.value);

		// The preferences row is fully initialized.
		expect(preferencesRow?.loadOnStartup).toBe(true);
		expect(JSON.parse(preferencesRow?.value ?? '{}')).toMatchObject({
			keyGeneratorType: 'ed25519',
			environmentsVersion: 'v2',
		});
	});
});
