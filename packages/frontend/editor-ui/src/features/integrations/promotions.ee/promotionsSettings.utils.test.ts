import type { PromotionProvider } from './promotionsSettings.api';
import {
	buildProviderCreatePayload,
	buildProviderUpdatePayload,
	emptyProviderForm,
	providerFormFrom,
	repositoryDisplayName,
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

describe('repositoryDisplayName', () => {
	it('uses the stored path of a GitLab target', () => {
		expect(
			repositoryDisplayName({
				schemaVersion: 1,
				remoteUrl: 'https://gitlab.example.com/forked/repository.git',
				repositoryPath: 'acme/platform/workflows',
			}),
		).toBe('acme/platform/workflows');
	});

	it.each([
		['https://github.com/acme/workflows.git', 'acme/workflows'],
		['git@github.com:acme/workflows.git', 'acme/workflows'],
		['github.com:acme/workflows.git', 'acme/workflows'],
		['ssh://git@git.example.com:2222/acme/workflows.git', 'acme/workflows'],
		['/srv/git/workflows.git', '/srv/git/workflows'],
	])('shortens %s to %s', (remoteUrl, name) => {
		expect(repositoryDisplayName({ schemaVersion: 1, remoteUrl })).toBe(name);
	});
});
