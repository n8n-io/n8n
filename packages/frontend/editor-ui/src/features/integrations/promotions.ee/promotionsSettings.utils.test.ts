import type { PromotionConnection, PromotionProvider } from './promotionsSettings.api';
import {
	buildProviderCreatePayload,
	buildProviderUpdatePayload,
	connectionFormFrom,
	emptyConnectionForm,
	emptyProviderForm,
	planConnectionWrites,
	providerFormFrom,
	toConnection,
	type ConnectionFormState,
} from './promotionsSettings.utils';

const sshProvider = (overrides: Partial<PromotionProvider> = {}): PromotionProvider =>
	({
		id: 'provider-ssh',
		name: 'Production key',
		type: 'git',
		authType: 'ssh-key',
		config: { schemaVersion: 1, publicKey: 'ssh-ed25519 STORED', keyType: 'rsa' },
		createdAt: '2026-09-01T00:00:00.000Z',
		updatedAt: '2026-09-01T00:00:00.000Z',
		...overrides,
	}) as PromotionProvider;

const tokenProvider = (): PromotionProvider =>
	({
		id: 'provider-token',
		name: 'Mirror',
		type: 'git',
		authType: 'token',
		config: { schemaVersion: 1 },
		createdAt: '2026-09-01T00:00:00.000Z',
		updatedAt: '2026-09-01T00:00:00.000Z',
	}) as PromotionProvider;

const environmentFields = {
	name: 'Production',
	scope: 'instance' as const,
	remote: { schemaVersion: 1 as const, remoteUrl: 'git@github.com:acme/workflows.git' },
	provider: {
		id: 'provider-ssh',
		name: 'Production key',
		type: 'git' as const,
		authType: 'ssh-key' as const,
		createdAt: '2026-09-01T00:00:00.000Z',
		updatedAt: '2026-09-01T00:00:00.000Z',
	},
	checkout: { hasCheckout: false, matchesEnvironment: false },
	createdAt: '2026-09-01T00:00:00.000Z',
	updatedAt: '2026-09-01T00:00:00.000Z',
};

const applyEnvironment = (branchName = 'main') => ({
	...environmentFields,
	id: 'environment-apply',
	direction: 'apply' as const,
	settings: { schemaVersion: 1 as const, branchName },
});

const promoteEnvironment = (baseBranchName = 'main', createBranchOnPromotion = false) => ({
	...environmentFields,
	id: 'environment-promote',
	direction: 'promote' as const,
	settings: { schemaVersion: 1 as const, baseBranchName, createBranchOnPromotion },
});

const connection = (configs: PromotionConnection['configs']) =>
	toConnection(configs) as PromotionConnection;

const form = (overrides: Partial<ConnectionFormState> = {}): ConnectionFormState => ({
	...emptyConnectionForm(),
	name: 'Production',
	providerId: 'provider-ssh',
	remoteUrl: 'git@github.com:acme/workflows.git',
	...overrides,
});

describe('buildProviderCreatePayload', () => {
	it('uses the selected SSH key type', () => {
		const payload = buildProviderCreatePayload({
			...emptyProviderForm(),
			name: '  Production key  ',
			keyType: 'rsa',
		});

		expect(payload).toEqual({
			name: 'Production key',
			type: 'git',
			auth: { authType: 'ssh-key', keyType: 'rsa' },
		});
	});

	it('trims the username and preserves password spaces', () => {
		const payload = buildProviderCreatePayload({
			...emptyProviderForm(),
			name: 'Mirror',
			authType: 'token',
			username: '  deploy  ',
			password: ' secret ',
		});

		expect(payload.auth).toEqual({
			authType: 'token',
			username: 'deploy',
			password: ' secret ',
		});
	});
});

describe('buildProviderUpdatePayload', () => {
	it('renames the provider without changing its credentials', () => {
		const current = sshProvider();
		const payload = buildProviderUpdatePayload(
			{ ...providerFormFrom(current), name: 'Renamed' },
			current,
		);

		expect(payload).toEqual({ name: 'Renamed' });
	});

	it('keeps the SSH key type when regenerating the key', () => {
		const current = sshProvider();
		const state = providerFormFrom(current);
		expect(state.keyType).toBe('rsa');
		const payload = buildProviderUpdatePayload({ ...state, regenerateKey: true }, current);

		expect(payload).toEqual({ auth: { authType: 'ssh-key' } });
	});

	it('keeps stored credentials when the username is missing', () => {
		const current = tokenProvider();
		const payload = buildProviderUpdatePayload(
			{ ...providerFormFrom(current), password: 'new-secret' },
			current,
		);

		expect(payload).toEqual({});
	});

	it('updates credentials when both username and password are set', () => {
		const current = tokenProvider();
		const payload = buildProviderUpdatePayload(
			{ ...providerFormFrom(current), username: 'deploy', password: 'new-secret' },
			current,
		);

		expect(payload.auth).toEqual({
			authType: 'token',
			username: 'deploy',
			password: 'new-secret',
		});
	});
});

describe('toConnection', () => {
	it('takes shared values from apply before promote', () => {
		const apply = { ...applyEnvironment(), name: 'Apply side' };
		const promote = {
			...promoteEnvironment(),
			name: 'Promote side',
			remote: { schemaVersion: 1 as const, remoteUrl: 'git@github.com:acme/other.git' },
		};

		expect(toConnection({ apply, promote })).toEqual({
			name: 'Apply side',
			provider: apply.provider,
			remote: apply.remote,
			configs: { apply, promote },
		});
	});

	it('builds an apply-only connection', () => {
		const apply = applyEnvironment();

		expect(toConnection({ apply })).toEqual({
			name: 'Production',
			provider: apply.provider,
			remote: apply.remote,
			configs: { apply },
		});
	});

	it('returns null without environments', () => {
		expect(toConnection({})).toBeNull();
	});
});

describe('planConnectionWrites', () => {
	it('creates an environment for each newly enabled direction', () => {
		const state = form({
			apply: { enabled: true, branchName: ' main ' },
			promote: { enabled: true, baseBranchName: 'develop', createBranchOnPromotion: true },
		});
		const shared = {
			name: 'Production',
			scope: 'instance',
			providerId: 'provider-ssh',
			remote: { schemaVersion: 1, remoteUrl: 'git@github.com:acme/workflows.git' },
		};

		expect(planConnectionWrites(state, null)).toEqual([
			{
				kind: 'create',
				direction: 'apply',
				payload: {
					...shared,
					direction: 'apply',
					settings: { schemaVersion: 1, branchName: 'main' },
				},
			},
			{
				kind: 'create',
				direction: 'promote',
				payload: {
					...shared,
					direction: 'promote',
					settings: { schemaVersion: 1, baseBranchName: 'develop', createBranchOnPromotion: true },
				},
			},
		]);
	});

	it('skips writes when nothing changed', () => {
		const current = connection({ apply: applyEnvironment() });

		expect(planConnectionWrites(connectionFormFrom(current), current)).toEqual([]);
	});

	it('writes a changed shared field to every environment', () => {
		const current = connection({
			apply: applyEnvironment(),
			promote: promoteEnvironment('main', true),
		});
		const writes = planConnectionWrites(
			{ ...connectionFormFrom(current), name: 'Renamed' },
			current,
		);

		expect(writes).toEqual([
			{
				kind: 'update',
				direction: 'apply',
				environmentId: 'environment-apply',
				payload: { name: 'Renamed' },
			},
			{
				kind: 'update',
				direction: 'promote',
				environmentId: 'environment-promote',
				payload: { name: 'Renamed' },
			},
		]);
	});

	it('updates only the changed Promote settings', () => {
		const current = connection({ apply: applyEnvironment(), promote: promoteEnvironment() });
		const state = connectionFormFrom(current);
		state.promote.baseBranchName = 'develop';

		const writes = planConnectionWrites(state, current);

		expect(writes).toEqual([
			{
				kind: 'update',
				direction: 'promote',
				environmentId: 'environment-promote',
				payload: {
					settings: {
						schemaVersion: 1,
						baseBranchName: 'develop',
						createBranchOnPromotion: false,
					},
				},
			},
		]);
	});

	it('updates the create-branch option when the branch stays the same', () => {
		const current = connection({ promote: promoteEnvironment('main', false) });
		const state = connectionFormFrom(current);
		state.promote.createBranchOnPromotion = true;

		const writes = planConnectionWrites(state, current);

		expect(writes).toEqual([
			{
				kind: 'update',
				direction: 'promote',
				environmentId: 'environment-promote',
				payload: {
					settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: true },
				},
			},
		]);
	});

	it('deletes the saved Apply environment when Apply is turned off', () => {
		const current = connection({ apply: applyEnvironment(), promote: promoteEnvironment() });
		const state = connectionFormFrom(current);
		state.apply.enabled = false;

		expect(planConnectionWrites(state, current)).toEqual([
			{ kind: 'delete', direction: 'apply', environmentId: 'environment-apply' },
		]);
	});

	it('deletes the saved Promote environment when Promote is turned off', () => {
		const current = connection({ promote: promoteEnvironment() });
		const state = connectionFormFrom(current);
		state.promote.enabled = false;

		expect(planConnectionWrites(state, current)).toEqual([
			{ kind: 'delete', direction: 'promote', environmentId: 'environment-promote' },
		]);
	});

	it('adds an Apply environment when Apply is turned on', () => {
		const current = connection({ promote: promoteEnvironment() });
		const state = connectionFormFrom(current);
		state.apply.enabled = true;
		state.apply.branchName = 'main';

		expect(planConnectionWrites(state, current)).toEqual([
			{
				kind: 'create',
				direction: 'apply',
				payload: {
					name: 'Production',
					scope: 'instance',
					providerId: 'provider-ssh',
					remote: { schemaVersion: 1, remoteUrl: 'git@github.com:acme/workflows.git' },
					direction: 'apply',
					settings: { schemaVersion: 1, branchName: 'main' },
				},
			},
		]);
	});
});
