import {
	CreatePromotionEnvironmentDto,
	PromotionEnvironmentPublicDto,
	UpdatePromotionEnvironmentDto,
	promotionEnvironmentSummarySchema,
} from '../promotion-environment.dto';

const remote = { schemaVersion: 1 as const, remoteUrl: 'git@example.com:team/workflows.git' };
const applySettings = { schemaVersion: 1 as const, branchName: 'dev' };
const promoteSettings = {
	schemaVersion: 1 as const,
	baseBranchName: 'staging',
	createBranchOnPromotion: false,
};

const newEnvironment = {
	name: 'Staging',
	scope: 'instance' as const,
	providerId: 'prov-1',
	remote,
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
const publicEnvironment = {
	id: '0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b',
	name: 'Staging',
	scope: 'instance' as const,
	remote,
	provider: publicProvider,
	createdAt: timestamp,
	updatedAt: timestamp,
};
const checkout = { hasCheckout: false, matchesEnvironment: false };

describe('CreatePromotionEnvironmentDto', () => {
	it('accepts each direction with its own settings', () => {
		expect(
			CreatePromotionEnvironmentDto.safeParse({
				...newEnvironment,
				direction: 'apply',
				settings: applySettings,
			}).success,
		).toBe(true);
		expect(
			CreatePromotionEnvironmentDto.safeParse({
				...newEnvironment,
				direction: 'promote',
				settings: promoteSettings,
			}).success,
		).toBe(true);
	});

	it('rejects the settings of the other direction on create', () => {
		expect(
			CreatePromotionEnvironmentDto.safeParse({
				...newEnvironment,
				direction: 'apply',
				settings: promoteSettings,
			}).success,
		).toBe(false);
		expect(
			CreatePromotionEnvironmentDto.safeParse({
				...newEnvironment,
				direction: 'promote',
				settings: applySettings,
			}).success,
		).toBe(false);
	});

	it('requires a branch name of at most 255 characters', () => {
		const create = (branchName: string) =>
			CreatePromotionEnvironmentDto.safeParse({
				...newEnvironment,
				direction: 'apply',
				settings: { schemaVersion: 1, branchName },
			}).success;

		expect(create('')).toBe(false);
		expect(create('a'.repeat(255))).toBe(true);
		expect(create('a'.repeat(256))).toBe(false);
	});

	it('rejects settings and remotes of an unsupported schema version', () => {
		expect(
			CreatePromotionEnvironmentDto.safeParse({
				...newEnvironment,
				direction: 'apply',
				settings: { schemaVersion: 2, branchName: 'dev' },
			}).success,
		).toBe(false);
		expect(
			CreatePromotionEnvironmentDto.safeParse({
				...newEnvironment,
				remote: { schemaVersion: 2, remoteUrl: 'git@example.com:team/workflows.git' },
				direction: 'apply',
				settings: applySettings,
			}).success,
		).toBe(false);
	});
});

describe('UpdatePromotionEnvironmentDto', () => {
	it('rejects an empty update', () => {
		expect(UpdatePromotionEnvironmentDto.safeParse({}).success).toBe(false);
	});
});

describe('promotion environment responses', () => {
	it('requires checkout state on detail and omits it in lists', () => {
		const environment = { ...publicEnvironment, direction: 'apply', settings: applySettings };

		expect(PromotionEnvironmentPublicDto.schema.safeParse(environment).success).toBe(false);
		expect(
			promotionEnvironmentSummarySchema.parse({ ...environment, checkout }),
		).not.toHaveProperty('checkout');
	});

	it('embeds the provider without its public key', () => {
		const parsed = PromotionEnvironmentPublicDto.parse({
			...publicEnvironment,
			direction: 'apply',
			settings: applySettings,
			checkout,
		});

		expect(parsed.provider).not.toHaveProperty('config');
		expect(JSON.stringify(parsed)).not.toContain('AAAAKEY');
	});

	it('always reports createBranchOnPromotion', () => {
		const promote = { ...publicEnvironment, direction: 'promote', checkout };

		expect(
			PromotionEnvironmentPublicDto.schema.safeParse({
				...promote,
				settings: { schemaVersion: 1, baseBranchName: 'staging' },
			}).success,
		).toBe(false);
		expect(
			PromotionEnvironmentPublicDto.schema.safeParse({ ...promote, settings: promoteSettings })
				.success,
		).toBe(true);
	});
});
