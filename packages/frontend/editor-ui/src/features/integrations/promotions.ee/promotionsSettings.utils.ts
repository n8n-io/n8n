import type {
	CreatePromotionConnectionDto,
	CreatePromotionProviderDto,
	PromotionDirection,
	PromotionProviderAuthType,
	PromotionProviderType,
	PromotionSshKeyType,
	UpdatePromotionConnectionDto,
	UpdatePromotionProviderDto,
	UpsertPromotionApplyConfigDto,
	UpsertPromotionPromoteConfigDto,
} from '@n8n/api-types';
import { promotionProviderTypeCapabilities } from '@n8n/api-types';

import type { PromotionConnection, PromotionProvider } from './promotionsSettings.api';

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

type DirectionFormState = {
	enabled: boolean;
	/** Keep this name when updating the settings. If absent, the API uses the direction label. */
	name?: string;
};

export type ConnectionFormState = {
	name: string;
	providerId: string;
	remoteUrl: string;
	repositoryPath?: string;
	apply: DirectionFormState & { branchName: string };
	promote: DirectionFormState & { baseBranchName: string; createBranchOnPromotion: boolean };
};

export type ConnectionWrite =
	| { kind: 'connection'; payload: UpdatePromotionConnectionDto }
	| { kind: 'config'; direction: 'apply'; payload: UpsertPromotionApplyConfigDto }
	| { kind: 'config'; direction: 'promote'; payload: UpsertPromotionPromoteConfigDto }
	| { kind: 'config-delete'; direction: PromotionDirection };

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
	apply: { enabled: false, name: undefined, branchName: '' },
	promote: { enabled: false, name: undefined, baseBranchName: '', createBranchOnPromotion: false },
});

export const connectionFormFrom = (connection: PromotionConnection): ConnectionFormState => {
	const { apply, promote } = connection.configs;

	return {
		name: connection.name,
		providerId: connection.provider.id,
		remoteUrl: connection.target.remoteUrl,
		repositoryPath: connection.target.repositoryPath,
		apply: {
			enabled: apply !== undefined,
			name: apply?.name,
			branchName: apply?.settings.branchName ?? '',
		},
		promote: {
			enabled: promote !== undefined,
			name: promote?.name,
			baseBranchName: promote?.settings.baseBranchName ?? '',
			createBranchOnPromotion: promote?.settings.createBranchOnPromotion ?? false,
		},
	};
};

const applyConfigPayload = (form: ConnectionFormState): UpsertPromotionApplyConfigDto => ({
	name: form.apply.name,
	settings: { schemaVersion: 1, branchName: form.apply.branchName.trim() },
});

const promoteConfigPayload = (form: ConnectionFormState): UpsertPromotionPromoteConfigDto => ({
	name: form.promote.name,
	settings: {
		schemaVersion: 1,
		baseBranchName: form.promote.baseBranchName.trim(),
		createBranchOnPromotion: form.promote.createBranchOnPromotion,
	},
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

export const buildConnectionCreatePayload = (
	form: ConnectionFormState,
): CreatePromotionConnectionDto => ({
	name: form.name.trim(),
	scope: 'instance',
	providerId: form.providerId,
	target: { schemaVersion: 1, remoteUrl: form.remoteUrl.trim() },
	configs: {
		...(form.apply.enabled && { apply: applyConfigPayload(form) }),
		...(form.promote.enabled && { promote: promoteConfigPayload(form) }),
	},
});

/** Returns only changed fields and configs. */
export const planConnectionWrites = (
	form: ConnectionFormState,
	current: PromotionConnection,
): ConnectionWrite[] => {
	const writes: ConnectionWrite[] = [];
	const payload: UpdatePromotionConnectionDto = {};

	const name = form.name.trim();
	if (name !== current.name) payload.name = name;

	const remoteUrl = form.remoteUrl.trim();
	// A matching URL still needs a write when it converts a saved URL target to a path.
	if (
		remoteUrl !== current.target.remoteUrl ||
		form.repositoryPath !== current.target.repositoryPath
	) {
		payload.target = { schemaVersion: 1, remoteUrl };
	}

	if (form.providerId !== current.provider.id) payload.providerId = form.providerId;

	if (Object.keys(payload).length > 0) writes.push({ kind: 'connection', payload });

	const applyPayload = applyConfigPayload(form);
	const currentApply = current.configs.apply;
	if (form.apply.enabled) {
		const changed =
			currentApply === undefined ||
			currentApply.name !== applyPayload.name ||
			currentApply.settings.branchName !== applyPayload.settings.branchName;
		if (changed) writes.push({ kind: 'config', direction: 'apply', payload: applyPayload });
	} else if (currentApply !== undefined) {
		writes.push({ kind: 'config-delete', direction: 'apply' });
	}

	const promotePayload = promoteConfigPayload(form);
	const currentPromote = current.configs.promote;
	if (form.promote.enabled) {
		const changed =
			currentPromote === undefined ||
			currentPromote.name !== promotePayload.name ||
			currentPromote.settings.baseBranchName !== promotePayload.settings.baseBranchName ||
			currentPromote.settings.createBranchOnPromotion !==
				promotePayload.settings.createBranchOnPromotion;
		if (changed) writes.push({ kind: 'config', direction: 'promote', payload: promotePayload });
	} else if (currentPromote !== undefined) {
		writes.push({ kind: 'config-delete', direction: 'promote' });
	}

	return writes;
};
