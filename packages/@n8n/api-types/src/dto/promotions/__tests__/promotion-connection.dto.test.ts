import {
	CreatePromotionConnectionDto,
	PromotionConnectionPublicDto,
	UpdatePromotionConnectionDto,
} from '../promotion-connection.dto';

const target = { schemaVersion: 1 as const, remoteUrl: 'git@example.com:team/workflows.git' };
const applyConfig = { settings: { schemaVersion: 1 as const, branchName: 'dev' } };
const promoteConfig = {
	settings: {
		schemaVersion: 1 as const,
		baseBranchName: 'staging',
		createBranchOnPromotion: false,
	},
};

const newConnection = {
	name: 'Staging',
	scope: 'instance' as const,
	providerId: 'prov-1',
	target,
};

const timestamp = '2026-09-07T08:00:00.000Z';
const publicProvider = {
	id: 'prov-1',
	name: 'Staging',
	type: 'git' as const,
	authType: 'ssh-key' as const,
	config: {
		schemaVersion: 1 as const,
		publicKey: 'ssh-ed25519 AAAAKEY',
		keyType: 'ed25519' as const,
	},
	createdAt: timestamp,
	updatedAt: timestamp,
};

describe('CreatePromotionConnectionDto', () => {
	it('accepts a connection with no configs, so a public key can be read before cloning', () => {
		expect(CreatePromotionConnectionDto.safeParse(newConnection).success).toBe(true);
	});

	it('accepts a config for each direction, keyed by direction', () => {
		expect(
			CreatePromotionConnectionDto.safeParse({
				...newConnection,
				configs: { apply: applyConfig, promote: promoteConfig },
			}).success,
		).toBe(true);
		expect(
			CreatePromotionConnectionDto.safeParse({ ...newConnection, configs: { apply: applyConfig } })
				.success,
		).toBe(true);
	});

	// Keying by direction is what makes "one per direction" structural.
	it('rejects a config array and an unknown direction key', () => {
		expect(
			CreatePromotionConnectionDto.safeParse({
				...newConnection,
				configs: [applyConfig, promoteConfig],
			}).success,
		).toBe(false);
		expect(
			CreatePromotionConnectionDto.safeParse({ ...newConnection, configs: { sync: applyConfig } })
				.success,
		).toBe(false);
	});

	it('rejects settings under the wrong direction key', () => {
		expect(
			CreatePromotionConnectionDto.safeParse({
				...newConnection,
				configs: { apply: promoteConfig },
			}).success,
		).toBe(false);
	});

	it('requires a provider id and rejects a target of an unsupported version', () => {
		expect(
			CreatePromotionConnectionDto.safeParse({ ...newConnection, providerId: '' }).success,
		).toBe(false);
		expect(
			CreatePromotionConnectionDto.safeParse({
				...newConnection,
				target: { schemaVersion: 2, remoteUrl: 'git@example.com:team/workflows.git' },
			}).success,
		).toBe(false);
	});
});

describe('UpdatePromotionConnectionDto', () => {
	it('rejects an empty update', () => {
		expect(UpdatePromotionConnectionDto.safeParse({}).success).toBe(false);
	});

	it('accepts the name, the target, and the provider', () => {
		expect(
			UpdatePromotionConnectionDto.safeParse({ name: 'Renamed', target, providerId: 'prov-2' })
				.success,
		).toBe(true);
	});

	it('rejects configs, a scope change, and an operation payload', () => {
		expect(
			UpdatePromotionConnectionDto.safeParse({ name: 'Renamed', configs: { apply: applyConfig } })
				.success,
		).toBe(false);
		expect(UpdatePromotionConnectionDto.safeParse({ scope: 'projects' }).success).toBe(false);
		expect(UpdatePromotionConnectionDto.safeParse({ commitMessage: 'Update' }).success).toBe(false);
	});
});

describe('PromotionConnectionPublicDto', () => {
	// Detail and list share this shape, so a full provider would put the key in every row.
	it('embeds the provider without its public key', () => {
		const result = PromotionConnectionPublicDto.safeParse({
			id: 'conn-1',
			name: 'Staging',
			scope: 'instance',
			target,
			provider: publicProvider,
			configs: {
				apply: {
					...applyConfig,
					id: 'cfg-1',
					name: 'Apply',
					createdAt: timestamp,
					updatedAt: timestamp,
				},
			},
			createdAt: timestamp,
			updatedAt: timestamp,
		});

		if (!result.success) throw result.error;
		expect(result.data.provider).not.toHaveProperty('config');
		expect(JSON.stringify(result.data)).not.toContain('AAAAKEY');
	});
});
