import type { GitConnection } from './gitConnections.api';
import {
	buildCreatePayload,
	buildUpdatePayload,
	type GitConnectionFormState,
} from './gitConnections.utils';

const form = (overrides: Partial<GitConnectionFormState> = {}): GitConnectionFormState => ({
	name: 'Production',
	repositoryUrl: 'git@github.com:acme/workflows.git',
	branchName: '',
	connectionType: 'ssh',
	keyGeneratorType: 'ed25519',
	username: '',
	password: '',
	...overrides,
});

const existing = (overrides: Partial<GitConnection> = {}): GitConnection => ({
	id: 'conn-1',
	name: 'Production',
	repositoryUrl: 'git@github.com:acme/workflows.git',
	branchName: 'main',
	connectionType: 'ssh',
	publicKey: 'ssh-ed25519 AAAA',
	keyGeneratorType: 'ed25519',
	baseCommit: null,
	createdAt: '2026-08-01T00:00:00.000Z',
	updatedAt: '2026-08-01T00:00:00.000Z',
	...overrides,
});

describe('buildCreatePayload', () => {
	it('sends the key type and no credentials for a new ssh connection', () => {
		expect(buildCreatePayload(form({ keyGeneratorType: 'rsa' }))).toEqual({
			name: 'Production',
			repositoryUrl: 'git@github.com:acme/workflows.git',
			connectionType: 'ssh',
			keyGeneratorType: 'rsa',
		});
	});

	it('trims the username but preserves the password for a new https connection', () => {
		expect(
			buildCreatePayload(
				form({
					connectionType: 'https',
					repositoryUrl: 'https://github.com/acme/workflows.git',
					username: '  deploy-bot  ',
					password: ' token-123 ',
				}),
			),
		).toEqual({
			name: 'Production',
			repositoryUrl: 'https://github.com/acme/workflows.git',
			connectionType: 'https',
			username: 'deploy-bot',
			password: ' token-123 ',
		});
	});

	it('leaves out an empty branch and trims the one that was typed', () => {
		expect(buildCreatePayload(form({ branchName: '   ' }))).not.toHaveProperty('branchName');
		expect(buildCreatePayload(form({ branchName: '  main  ' }))).toMatchObject({
			branchName: 'main',
		});
	});
});

describe('buildUpdatePayload', () => {
	it('sends nothing when nothing was changed', () => {
		expect(buildUpdatePayload(form({ branchName: 'main' }), existing())).toEqual({});
	});

	it('keeps the key type out of an ssh connection that stays ssh', () => {
		expect(
			buildUpdatePayload(
				form({ name: 'Staging', keyGeneratorType: 'rsa' }),
				existing({ keyGeneratorType: 'ed25519' }),
			),
		).toEqual({ name: 'Staging' });
	});

	it('sends the key type when switching an https connection to ssh', () => {
		expect(
			buildUpdatePayload(
				form({ connectionType: 'ssh', keyGeneratorType: 'rsa' }),
				existing({ connectionType: 'https', keyGeneratorType: null, publicKey: null }),
			),
		).toEqual({ connectionType: 'ssh', keyGeneratorType: 'rsa' });
	});

	it('sends no credentials when switching to https without filling them in', () => {
		const payload = buildUpdatePayload(form({ connectionType: 'https' }), existing());

		expect(payload).toEqual({ connectionType: 'https' });
	});

	it('trims the username but preserves the rotated password', () => {
		expect(
			buildUpdatePayload(
				form({ connectionType: 'https', username: ' deploy-bot ', password: ' new-token ' }),
				existing({ connectionType: 'https', keyGeneratorType: null, publicKey: null }),
			),
		).toEqual({ username: 'deploy-bot', password: ' new-token ' });
	});

	it('treats a cleared branch as unchanged rather than removing it', () => {
		expect(buildUpdatePayload(form({ branchName: '' }), existing())).toEqual({});
	});
});
