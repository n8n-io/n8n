import type { GitConnectionType, GitKeyGeneratorType } from '@n8n/api-types';
import type { Cipher } from 'n8n-core';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { GitConnectionsGitService } from './git-connections-git.service';

/**
 * Authentication material shared by the project `GitConnection` entity and the
 * instance-level settings. `connectionType` is nullable to cover the instance
 * settings before they are first configured; the entity always has one.
 */
export type GitAuthMaterial = {
	connectionType: GitConnectionType | null;
	publicKey: string | null;
	encryptedPrivateKey: string | null;
	encryptedUsername: string | null;
	encryptedPassword: string | null;
	keyGeneratorType: GitKeyGeneratorType | null;
};

type GitAuthInput = {
	connectionType?: GitConnectionType;
	keyGeneratorType?: GitKeyGeneratorType;
	username?: string;
	password?: string;
};

type GitAuthDeps = {
	generateSshKeyPair: (
		keyType: GitKeyGeneratorType,
	) => Promise<{ publicKey: string; privateKey: string }>;
	encrypt: (value: string) => Promise<string>;
};

/**
 * Adapter from the module's injected services to the minimal {@link GitAuthDeps}
 * the algorithm needs. Shared so each caller doesn't repeat the wiring.
 */
export const gitAuthDeps = (gitService: GitConnectionsGitService, cipher: Cipher): GitAuthDeps => ({
	generateSshKeyPair: async (keyType) => await gitService.generateSshKeyPair(keyType),
	encrypt: async (value) => await cipher.encryptV2(value),
});

/** Starting point for a connection that has never been configured. */
export const emptyGitAuthMaterial = (): GitAuthMaterial => ({
	connectionType: null,
	publicKey: null,
	encryptedPrivateKey: null,
	encryptedUsername: null,
	encryptedPassword: null,
	keyGeneratorType: null,
});

/**
 * Apply auth changes onto {@link updated}, preserving existing secrets when the
 * caller doesn't touch them. Handles first-time configuration (no type yet) and
 * switching between SSH and HTTPS. Creation is the same operation with
 * {@link emptyGitAuthMaterial} as `current`.
 */
export async function applyAuthenticationUpdate(
	updated: GitAuthMaterial,
	current: GitAuthMaterial,
	input: GitAuthInput,
	deps: GitAuthDeps,
): Promise<void> {
	const targetType = input.connectionType ?? current.connectionType;

	// No connection type set or being set: auth material has no context to attach to.
	if (targetType === null) {
		if (
			input.username !== undefined ||
			input.password !== undefined ||
			input.keyGeneratorType !== undefined
		) {
			throw new BadRequestError('Connection type is required to set authentication');
		}
		return;
	}

	if (targetType === 'ssh') {
		if (input.username !== undefined || input.password !== undefined) {
			throw new BadRequestError('Username and password are only valid for HTTPS connections');
		}
		// Already SSH: keep the existing key pair; only guard against changing its type.
		if (current.connectionType === 'ssh') {
			if (input.keyGeneratorType && input.keyGeneratorType !== current.keyGeneratorType) {
				throw new BadRequestError('SSH key type cannot be changed after creation');
			}
			return;
		}
		// First-time SSH or switching from HTTPS: generate a fresh key pair.
		const keyType = input.keyGeneratorType ?? 'ed25519';
		const pair = await deps.generateSshKeyPair(keyType);
		updated.connectionType = 'ssh';
		updated.publicKey = pair.publicKey;
		updated.encryptedPrivateKey = await deps.encrypt(pair.privateKey);
		updated.keyGeneratorType = keyType;
		updated.encryptedUsername = null;
		updated.encryptedPassword = null;
		return;
	}

	if (input.keyGeneratorType !== undefined) {
		throw new BadRequestError('Key generator type is only valid for SSH connections');
	}
	// Require credentials when switching to (or first configuring) HTTPS.
	const switching = current.connectionType !== 'https';
	validateHttpsCredentials(input.username, input.password, switching);
	updated.connectionType = 'https';
	if (input.username !== undefined && input.password !== undefined) {
		updated.encryptedUsername = await deps.encrypt(input.username);
		updated.encryptedPassword = await deps.encrypt(input.password);
	}
	updated.publicKey = null;
	updated.encryptedPrivateKey = null;
	updated.keyGeneratorType = null;
}

export function validateHttpsCredentials(username?: string, password?: string, required = false) {
	if ((username === undefined) !== (password === undefined) || (required && !username)) {
		throw new BadRequestError('HTTPS username and password must be provided together');
	}
	if ([username, password].some((value) => value && /[\r\n\0]/.test(value))) {
		throw new BadRequestError('HTTPS credentials contain unsupported characters');
	}
}
