import type { Logger } from '@n8n/backend-common';
import type { UrlService } from '@n8n/backend-services';
import type { InstanceType } from '@n8n/constants';
import { trustedSourceConfigSchemaFor } from '@n8n/inbound-auth';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import {
	SYSTEM_TRUSTED_SOURCE_CONFIG,
	SystemTrustedSourceSeeder,
} from '../system-trusted-source.seeder';
import type { SeedSystemSourceOutcome, TrustedSourceDbStore } from '../trusted-source.store';

const BASE_URL = 'https://n8n.example';

const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
const store = mock<TrustedSourceDbStore>();
const urlService = mock<UrlService>({ getInstanceBaseUrl: () => BASE_URL });

const seederOn = (instanceType: InstanceType) =>
	new SystemTrustedSourceSeeder(
		store,
		urlService,
		mock<InstanceSettings>({ instanceType }),
		logger,
	);

let seeder: SystemTrustedSourceSeeder;

beforeEach(() => {
	vi.clearAllMocks();
	seeder = seederOn('main');
});

describe('SystemTrustedSourceSeeder', () => {
	it('seeds the fixed id, name and config with the instance base URL as the issuer', async () => {
		store.seedSystemSource.mockResolvedValue('inserted');

		await seeder.seed();

		expect(store.seedSystemSource).toHaveBeenCalledTimes(1);
		expect(store.seedSystemSource).toHaveBeenCalledWith({
			id: 'n8n-internal',
			name: 'n8n',
			issuer: BASE_URL,
			config: SYSTEM_TRUSTED_SOURCE_CONFIG,
			updateIssuer: true,
		});
	});

	it.each<InstanceType>(['webhook', 'worker'])(
		'only inserts on a %s instance, without moving the issuer',
		async (instanceType) => {
			store.seedSystemSource.mockResolvedValue('issuer-kept');

			await seederOn(instanceType).seed();

			expect(store.seedSystemSource).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'n8n-internal', updateIssuer: false }),
			);
		},
	);

	it('seeds a config that only a system-managed source may hold', () => {
		const parsed = trustedSourceConfigSchemaFor('system').parse(SYSTEM_TRUSTED_SOURCE_CONFIG);
		expect(parsed).toMatchObject({
			authentication: {
				type: 'oauth2',
				keys: { kind: 'local-keystore' },
				client: { kind: 'virtual' },
			},
			surfaces: { 'public-api': {}, 'instance-mcp': {}, trigger: {} },
			identity: { subject: 'n8n-user-id', linkByEmail: 'off' },
		});

		const issues = trustedSourceConfigSchemaFor('admin')
			.safeParse(SYSTEM_TRUSTED_SOURCE_CONFIG)
			.error?.issues.map((issue) => issue.path.join('.'));
		expect(issues).toEqual(
			expect.arrayContaining([
				'identity.subject',
				'authentication.keys.kind',
				'authentication.client.kind',
			]),
		);
	});

	it.each<[SeedSystemSourceOutcome, 'info' | 'debug' | 'error']>([
		['inserted', 'info'],
		['issuer-updated', 'info'],
		['unchanged', 'debug'],
		['issuer-kept', 'debug'],
		['conflict', 'error'],
	])('logs %s at %s level and resolves', async (outcome, level) => {
		store.seedSystemSource.mockResolvedValue(outcome);

		await expect(seeder.seed()).resolves.toBeUndefined();

		expect(logger[level]).toHaveBeenCalledTimes(1);
		expect(logger[level]).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ id: 'n8n-internal', issuer: BASE_URL }),
		);
	});
});
