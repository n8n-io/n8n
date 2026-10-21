import type {
	CreatePromotionProviderDto,
	PromotionDirection,
	PromotionProviderAuthType,
	PromotionProviderType,
	PromotionSshKeyType,
	UpdatePromotionProviderDto,
} from '@n8n/api-types';
import { promotionProviderTypeCapabilities } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';

import type { PromotionEnvironment, PromotionProvider } from './promotionsSettings.api';

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

export const promotionProviderIcon = {
	git: 'git-branch',
	gitlab: 'gitlab',
} satisfies Record<PromotionProviderType, IconName>;

export const promotionEnvironmentBranch = (environment: PromotionEnvironment): string =>
	environment.direction === 'apply'
		? environment.settings.branchName
		: environment.settings.baseBranchName;

export const promotionEnvironmentDirectionFields = (
	direction: PromotionDirection,
	branch: string,
	createBranchOnPromotion: boolean,
) =>
	direction === 'apply'
		? { direction, settings: { schemaVersion: 1 as const, branchName: branch } }
		: {
				direction,
				settings: { schemaVersion: 1 as const, baseBranchName: branch, createBranchOnPromotion },
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

/**
 * A short repository name, such as `acme/workflows`. GitLab remotes store their full path. For
 * other remotes, the name comes from the clone URL. A URL in an unknown form shows as is.
 */
export const repositoryDisplayName = (remote: PromotionEnvironment['remote']): string => {
	if (remote.repositoryPath) return remote.repositoryPath;
	const url = remote.remoteUrl.replace(/\/+$/, '').replace(/\.git$/, '');
	// `https://host/acme/workflows`, `ssh://git@host:2222/acme/workflows`, `git@host:acme/workflows`
	// or `host:acme/workflows`
	const match =
		/^[a-z][a-z\d+.-]*:\/\/[^/]+\/(.+)$/i.exec(url) ?? /^(?:[^@/\s]+@)?[^:/\s]+:(.+)$/.exec(url);
	return match ? match[1] : url;
};

export const emptyProviderForm = (type: PromotionProviderType = 'git'): ProviderFormState => ({
	name: '',
	type,
	baseUrl: '',
	authType: promotionProviderTypeCapabilities[type].authTypes[0],
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
