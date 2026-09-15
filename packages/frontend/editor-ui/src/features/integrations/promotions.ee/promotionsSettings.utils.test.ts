import type { PromotionConnection, PromotionProvider } from './promotionsSettings.api';
import {
	buildConnectionCreatePayload,
	buildProviderCreatePayload,
	buildProviderUpdatePayload,
	connectionFormFrom,
	emptyConnectionForm,
	emptyProviderForm,
	planConnectionWrites,
	providerFormFrom,
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

const connection = (overrides: Partial<PromotionConnection> = {}): PromotionConnection =>
	({
		id: 'connection-1',
		name: 'Production',
		scope: 'instance',
		target: { schemaVersion: 1, remoteUrl: 'git@github.com:acme/workflows.git' },
		provider: {
			id: 'provider-ssh',
			name: 'Production key',
			type: 'git',
			authType: 'ssh-key',
			createdAt: '2026-09-01T00:00:00.000Z',
			updatedAt: '2026-09-01T00:00:00.000Z',
		},
		configs: {},
		createdAt: '2026-09-01T00:00:00.000Z',
		updatedAt: '2026-09-01T00:00:00.000Z',
		...overrides,
	}) as PromotionConnection;

const applyConfig = (branchName = 'main', name = 'Apply') => ({
	id: 'config-apply',
	name,
	settings: { schemaVersion: 1 as const, branchName },
	createdAt: '2026-09-01T00:00:00.000Z',
	updatedAt: '2026-09-01T00:00:00.000Z',
});

const promoteConfig = (
	baseBranchName = 'main',
	createBranchOnPromotion = false,
	name = 'Promote',
) => ({
	id: 'config-promote',
	name,
	settings: { schemaVersion: 1 as const, baseBranchName, createBranchOnPromotion },
	createdAt: '2026-09-01T00:00:00.000Z',
	updatedAt: '2026-09-01T00:00:00.000Z',
});

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

describe('buildConnectionCreatePayload', () => {
	it('includes only enabled settings', () => {
		const payload = buildConnectionCreatePayload(
			form({ promote: { enabled: true, baseBranchName: 'main', createBranchOnPromotion: false } }),
		);

		expect(payload.configs?.apply).toBeUndefined();
		expect(payload.configs?.promote?.settings.createBranchOnPromotion).toBe(false);
	});

	it('omits settings when Apply and Promote are off', () => {
		expect(buildConnectionCreatePayload(form()).configs).toEqual({});
	});
});

describe('planConnectionWrites', () => {
	it('skips writes when nothing changed', () => {
		const current = connection({ configs: { apply: applyConfig() } });

		expect(planConnectionWrites(connectionFormFrom(current), current)).toEqual([]);
	});

	it('updates only the connection name', () => {
		const current = connection({
			configs: { apply: applyConfig(), promote: promoteConfig('main', true) },
		});
		const writes = planConnectionWrites(
			{ ...connectionFormFrom(current), name: 'Renamed' },
			current,
		);

		expect(writes).toEqual([{ kind: 'connection', payload: { name: 'Renamed' } }]);
	});

	it('updates only the changed Promote settings', () => {
		const current = connection({
			configs: { apply: applyConfig(), promote: promoteConfig() },
		});
		const state = connectionFormFrom(current);
		state.promote.baseBranchName = 'develop';

		const writes = planConnectionWrites(state, current);

		expect(writes).toEqual([
			{
				kind: 'config',
				direction: 'promote',
				payload: {
					name: 'Promote',
					settings: {
						schemaVersion: 1,
						baseBranchName: 'develop',
						createBranchOnPromotion: false,
					},
				},
			},
		]);
	});

	it('keeps the saved Apply name when its branch changes', () => {
		const current = connection({ configs: { apply: applyConfig('main', 'Import from Git') } });
		const state = connectionFormFrom(current);
		state.apply.branchName = 'release';

		const writes = planConnectionWrites(state, current);

		expect(writes[0]).toMatchObject({ payload: { name: 'Import from Git' } });
	});

	it('updates the create-branch option when the branch stays the same', () => {
		const current = connection({ configs: { promote: promoteConfig('main', false) } });
		const state = connectionFormFrom(current);
		state.promote.createBranchOnPromotion = true;

		const writes = planConnectionWrites(state, current);

		expect(writes).toEqual([
			{
				kind: 'config',
				direction: 'promote',
				payload: {
					name: 'Promote',
					settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: true },
				},
			},
		]);
	});

	it('deletes the saved Apply settings when Apply is turned off', () => {
		const current = connection({ configs: { apply: applyConfig(), promote: promoteConfig() } });
		const state = connectionFormFrom(current);
		state.apply.enabled = false;

		expect(planConnectionWrites(state, current)).toEqual([
			{ kind: 'config-delete', direction: 'apply' },
		]);
	});

	it('deletes the saved Promote settings when Promote is turned off', () => {
		const current = connection({ configs: { promote: promoteConfig() } });
		const state = connectionFormFrom(current);
		state.promote.enabled = false;

		expect(planConnectionWrites(state, current)).toEqual([
			{ kind: 'config-delete', direction: 'promote' },
		]);
	});

	it('adds Apply settings when Apply is turned on', () => {
		const current = connection();
		const state = connectionFormFrom(current);
		state.apply.enabled = true;
		state.apply.branchName = 'main';

		expect(planConnectionWrites(state, current)).toEqual([
			{
				kind: 'config',
				direction: 'apply',
				payload: { name: undefined, settings: { schemaVersion: 1, branchName: 'main' } },
			},
		]);
	});
});
