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

/**
 * Auth material to apply, computed from an update. `connectionType` is
 * non-nullable: a computed update always has a concrete type in play, so
 * `Object.assign`ing this onto the `GitConnection` entity can never write null
 * into its non-nullable column. The compiler enforces this inside the helper.
 */
export type GitAuthResult = {
	connectionType: GitConnectionType;
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
 * Compute the auth material to apply for an update, preserving existing secrets
 * when the caller doesn't touch them. Handles first-time configuration (no type
 * yet) and switching between SSH and HTTPS. Creation is the same operation with
 * {@link emptyGitAuthMaterial} as `current`.
 *
 * Returns `null` when there is nothing to apply (no connection type in play, or
 * an already-SSH connection whose key isn't changing). Callers apply a non-null
 * result with `Object.assign`; the result's non-nullable `connectionType` makes
 * writing null into the entity's column a compile error.
 */
export async function computeAuthenticationUpdate(
	current: GitAuthMaterial,
	input: GitAuthInput,
	deps: GitAuthDeps,
): Promise<GitAuthResult | null> {
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
		return null;
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
			return null;
		}
		// First-time SSH or switching from HTTPS: generate a fresh key pair.
		const keyType = input.keyGeneratorType ?? 'ed25519';
		const pair = await deps.generateSshKeyPair(keyType);
		return {
			connectionType: 'ssh',
			publicKey: pair.publicKey,
			encryptedPrivateKey: await deps.encrypt(pair.privateKey),
			keyGeneratorType: keyType,
			encryptedUsername: null,
			encryptedPassword: null,
		};
	}

	if (input.keyGeneratorType !== undefined) {
		throw new BadRequestError('Key generator type is only valid for SSH connections');
	}
	// Require credentials when switching to (or first configuring) HTTPS.
	const switching = current.connectionType !== 'https';
	validateHttpsCredentials(input.username, input.password, switching);
	const settingCredentials = input.username !== undefined && input.password !== undefined;
	return {
		connectionType: 'https',
		// Preserve the existing credentials when the caller doesn't change them.
		encryptedUsername: settingCredentials
			? await deps.encrypt(input.username!)
			: current.encryptedUsername,
		encryptedPassword: settingCredentials
			? await deps.encrypt(input.password!)
			: current.encryptedPassword,
		publicKey: null,
		encryptedPrivateKey: null,
		keyGeneratorType: null,
	};
}

function validateHttpsCredentials(username?: string, password?: string, required = false) {
	if ((username === undefined) !== (password === undefined) || (required && !username)) {
		throw new BadRequestError('HTTPS username and password must be provided together');
	}
	if ([username, password].some((value) => value && /[\r\n\0]/.test(value))) {
		throw new BadRequestError('HTTPS credentials contain unsupported characters');
	}
}
