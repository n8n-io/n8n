import {
	PromotionPromoteConfigPublicDto,
	UpsertPromotionApplyConfigDto,
	UpsertPromotionPromoteConfigDto,
} from '../promotion-config.dto';

const applySettings = { schemaVersion: 1 as const, branchName: 'dev' };
const promoteSettings = {
	schemaVersion: 1 as const,
	baseBranchName: 'staging',
	createBranchOnPromotion: false,
};

describe('UpsertPromotionApplyConfigDto', () => {
	it('accepts settings with an optional name', () => {
		expect(UpsertPromotionApplyConfigDto.safeParse({ settings: applySettings }).success).toBe(true);
		expect(
			UpsertPromotionApplyConfigDto.safeParse({ name: 'Apply', settings: applySettings }).success,
		).toBe(true);
	});

	// The direction is in the path, so a body that names one is malformed.
	it('rejects a direction and a connection in the body', () => {
		expect(
			UpsertPromotionApplyConfigDto.safeParse({ direction: 'apply', settings: applySettings })
				.success,
		).toBe(false);
		expect(
			UpsertPromotionApplyConfigDto.safeParse({ connectionId: 'conn-1', settings: applySettings })
				.success,
		).toBe(false);
	});

	it('rejects promote settings and the branching flag', () => {
		expect(UpsertPromotionApplyConfigDto.safeParse({ settings: promoteSettings }).success).toBe(
			false,
		);
		expect(
			UpsertPromotionApplyConfigDto.safeParse({
				settings: { ...applySettings, createBranchOnPromotion: true },
			}).success,
		).toBe(false);
	});

	it('requires a branch name of at most 255 characters', () => {
		const settings = (branchName: string) => ({ schemaVersion: 1, branchName });

		expect(
			UpsertPromotionApplyConfigDto.safeParse({ settings: { schemaVersion: 1 } }).success,
		).toBe(false);
		expect(
			UpsertPromotionApplyConfigDto.safeParse({ settings: settings('a'.repeat(255)) }).success,
		).toBe(true);
		expect(
			UpsertPromotionApplyConfigDto.safeParse({ settings: settings('a'.repeat(256)) }).success,
		).toBe(false);
	});

	it('rejects settings of an unsupported schema version', () => {
		expect(
			UpsertPromotionApplyConfigDto.safeParse({
				settings: { schemaVersion: 2, branchName: 'dev' },
			}).success,
		).toBe(false);
	});
});

describe('UpsertPromotionPromoteConfigDto', () => {
	// A write replaces the whole config, so the flag has no default to fall back on.
	it('requires createBranchOnPromotion, so a write cannot reset it by omission', () => {
		expect(
			UpsertPromotionPromoteConfigDto.safeParse({
				settings: { schemaVersion: 1, baseBranchName: 'staging' },
			}).success,
		).toBe(false);
		expect(UpsertPromotionPromoteConfigDto.safeParse({ settings: promoteSettings }).success).toBe(
			true,
		);
	});

	it('rejects the apply branch field', () => {
		expect(UpsertPromotionPromoteConfigDto.safeParse({ settings: applySettings }).success).toBe(
			false,
		);
	});
});

describe('PromotionPromoteConfigPublicDto', () => {
	const base = {
		id: 'cfg-1',
		name: 'Promote',
		createdAt: '2026-09-07T08:00:00.000Z',
		updatedAt: '2026-09-07T08:00:00.000Z',
	};

	it('always reports createBranchOnPromotion', () => {
		expect(
			PromotionPromoteConfigPublicDto.safeParse({
				...base,
				settings: { schemaVersion: 1, baseBranchName: 'staging' },
			}).success,
		).toBe(false);
		expect(
			PromotionPromoteConfigPublicDto.safeParse({ ...base, settings: promoteSettings }).success,
		).toBe(true);
	});
});
