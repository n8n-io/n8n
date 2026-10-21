import type {
	CreatePromotionEnvironmentDto,
	CreatePromotionProviderDto,
	PromotionDirection,
	PromotionProviderAuthType,
	PromotionProviderType,
	PromotionSshKeyType,
	UpdatePromotionEnvironmentDto,
	UpdatePromotionProviderDto,
} from '@n8n/api-types';
import { promotionProviderTypeCapabilities } from '@n8n/api-types';

import type {
	PromotionConnection,
	PromotionEnvironment,
	PromotionProvider,
} from './promotionsSettings.api';

export type ProviderFormState = {
	name: string;
	type: PromotionProviderType;
	baseUrl: string;
	/** Cannot change after creation. */
	authType: PromotionProviderAuthType;
	keyType: PromotionSshKeyType;
	username: string;
	password: string;
	regenerateKey: boolean;
};

export type PromotionProviderChange = {
	id: string;
	hostChanged: boolean;
	credentialsChanged: boolean;
};

export const isSamePromotionHostUrl = (current: string, next: string): boolean => {
	try {
		return new URL(current).href.replace(/\/$/, '') === new URL(next).href.replace(/\/$/, '');
	} catch {
		return false;
	}
};

export type ConnectionFormState = {
	name: string;
	providerId: string;
	remoteUrl: string;
	repositoryPath?: string;
	apply: { enabled: boolean; branchName: string };
	promote: { enabled: boolean; baseBranchName: string; createBranchOnPromotion: boolean };
};

export type ConnectionWrite =
	| { kind: 'create'; direction: PromotionDirection; payload: CreatePromotionEnvironmentDto }
	| {
			kind: 'update';
			direction: PromotionDirection;
			environmentId: string;
			payload: UpdatePromotionEnvironmentDto;
	  }
	| { kind: 'delete'; direction: PromotionDirection; environmentId: string };

export const withEnvironment = (
	configs: PromotionConnection['configs'],
	environment: PromotionEnvironment,
): PromotionConnection['configs'] =>
	environment.direction === 'apply'
		? { ...configs, apply: environment }
		: { ...configs, promote: environment };

export const toConnection = (
	configs: PromotionConnection['configs'],
): PromotionConnection | null => {
	const shared = configs.apply ?? configs.promote;
	if (!shared) return null;
	return { name: shared.name, provider: shared.provider, remote: shared.remote, configs };
};

export const emptyProviderForm = (): ProviderFormState => ({
	name: '',
	type: 'git',
	baseUrl: '',
	authType: 'ssh-key',
	keyType: 'ed25519',
	username: '',
	password: '',
	regenerateKey: false,
});

export const providerFormFrom = (provider: PromotionProvider): ProviderFormState => ({
	...emptyProviderForm(),
	name: provider.name,
	type: provider.type,
	baseUrl: 'baseUrl' in provider.config ? provider.config.baseUrl : '',
	authType: provider.authType,
	keyType: 'keyType' in provider.config ? provider.config.keyType : 'ed25519',
});

/** Keep field order aligned with connectionFormFrom for JSON-based dirty checks. */
export const emptyConnectionForm = (): ConnectionFormState => ({
	name: '',
	providerId: '',
	remoteUrl: '',
	repositoryPath: undefined,
	apply: { enabled: false, branchName: '' },
	promote: { enabled: false, baseBranchName: '', createBranchOnPromotion: false },
});

export const connectionFormFrom = (connection: PromotionConnection): ConnectionFormState => {
	const { apply, promote } = connection.configs;

	return {
		name: connection.name,
		providerId: connection.provider.id,
		remoteUrl: connection.remote.remoteUrl,
		repositoryPath: connection.remote.repositoryPath,
		apply: {
			enabled: apply !== undefined,
			branchName: apply?.settings.branchName ?? '',
		},
		promote: {
			enabled: promote !== undefined,
			baseBranchName: promote?.settings.baseBranchName ?? '',
			createBranchOnPromotion: promote?.settings.createBranchOnPromotion ?? false,
		},
	};
};

const applySettings = (form: ConnectionFormState) => ({
	schemaVersion: 1 as const,
	branchName: form.apply.branchName.trim(),
});

const promoteSettings = (form: ConnectionFormState) => ({
	schemaVersion: 1 as const,
	baseBranchName: form.promote.baseBranchName.trim(),
	createBranchOnPromotion: form.promote.createBranchOnPromotion,
});

export const buildProviderCreatePayload = (
	form: ProviderFormState,
): CreatePromotionProviderDto => ({
	name: form.name.trim(),
	type: form.type,
	...(promotionProviderTypeCapabilities[form.type].hasHostApi && {
		config: { schemaVersion: 1, baseUrl: form.baseUrl.trim() },
	}),
	auth:
		form.authType === 'ssh-key'
			? { authType: 'ssh-key', keyType: form.keyType }
			: {
					authType: 'token',
					...(form.type === 'git' && { username: form.username.trim() }),
					password: form.password,
				},
});

/** If credentials are absent, the API keeps them. SSH rotation keeps the key type. */
export const buildProviderUpdatePayload = (
	form: ProviderFormState,
	current: PromotionProvider,
): UpdatePromotionProviderDto => {
	const payload: UpdatePromotionProviderDto = {};

	const name = form.name.trim();
	if (name !== current.name) payload.name = name;
	if (
		'baseUrl' in current.config &&
		!isSamePromotionHostUrl(current.config.baseUrl, form.baseUrl)
	) {
		payload.config = { schemaVersion: 1, baseUrl: form.baseUrl.trim() };
	}
	const username = form.username.trim();

	if (form.authType === 'ssh-key' && form.regenerateKey) {
		payload.auth = { authType: 'ssh-key' };
	} else if (form.authType === 'token' && form.password && (current.type !== 'git' || username)) {
		payload.auth = {
			authType: 'token',
			...(current.type === 'git' && { username }),
			password: form.password,
		};
	}

	return payload;
};

/**
 * Plans one write for each direction. Each environment is compared with its own
 * stored values, so a retry after a partial save repeats only the unsaved writes.
 */
export const planConnectionWrites = (
	form: ConnectionFormState,
	current: PromotionConnection | null,
): ConnectionWrite[] => {
	const name = form.name.trim();
	const remoteUrl = form.remoteUrl.trim();
	const remote = { schemaVersion: 1 as const, remoteUrl };
	const desired = {
		apply: form.apply.enabled
			? { direction: 'apply' as const, settings: applySettings(form) }
			: null,
		promote: form.promote.enabled
			? { direction: 'promote' as const, settings: promoteSettings(form) }
			: null,
	};
	const { apply, promote } = current?.configs ?? {};
	const settingsChanged = {
		apply: apply?.settings.branchName !== desired.apply?.settings.branchName,
		promote:
			promote?.settings.baseBranchName !== desired.promote?.settings.baseBranchName ||
			promote?.settings.createBranchOnPromotion !==
				desired.promote?.settings.createBranchOnPromotion,
	};
	const writes: ConnectionWrite[] = [];

	for (const direction of ['apply', 'promote'] as const) {
		const environment = current?.configs[direction];
		const wanted = desired[direction];
		if (!wanted) {
			if (environment) writes.push({ kind: 'delete', direction, environmentId: environment.id });
			continue;
		}
		if (!environment) {
			writes.push({
				kind: 'create',
				direction,
				payload: { name, scope: 'instance', providerId: form.providerId, remote, ...wanted },
			});
			continue;
		}

		const payload: UpdatePromotionEnvironmentDto = {};
		if (name !== environment.name) payload.name = name;
		if (form.providerId !== environment.provider.id) payload.providerId = form.providerId;
		// A matching URL still needs a write when it converts a saved URL remote to a path.
		if (
			remoteUrl !== environment.remote.remoteUrl ||
			form.repositoryPath !== environment.remote.repositoryPath
		) {
			payload.remote = remote;
		}
		if (settingsChanged[direction]) payload.settings = wanted.settings;
		if (Object.keys(payload).length > 0) {
			writes.push({ kind: 'update', direction, environmentId: environment.id, payload });
		}
	}

	return writes;
};
