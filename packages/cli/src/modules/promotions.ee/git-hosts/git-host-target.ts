import {
	isPromotionGitHostType,
	promotionConnectionTargetSchema,
	promotionGitHostBaseUrlSchema,
	promotionGitHostConfigSchema,
	type PromotionConnectionTarget,
} from '@n8n/api-types';
import { z } from 'zod';

import { BadRequestError } from '@n8n/errors';

import type { PromotionProvider } from '../database/entities/promotion-provider.entity';

const repositoryPathSchema = z.string().refine((value) => {
	const segments = value.split('/');
	return (
		segments.length >= 2 &&
		segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..') &&
		!/[\\%?#:@\s\p{Cc}]/u.test(value)
	);
});

export const promotionStoredConnectionTargetSchema = z.union([
	promotionConnectionTargetSchema,
	z.object({ schemaVersion: z.literal(1), repositoryPath: repositoryPathSchema }).strict(),
]);

export type PromotionStoredConnectionTarget = z.infer<typeof promotionStoredConnectionTargetSchema>;
type GitHostProvider = Pick<PromotionProvider, 'type' | 'config'>;

export function repositoryPathFromUrl(baseUrl: string, remoteUrl: string): string {
	const parsed = promotionGitHostBaseUrlSchema.safeParse(remoteUrl);
	if (!parsed.success) {
		throw new BadRequestError(
			'Use an HTTP(S) repository URL without credentials, a query, or a fragment.',
		);
	}
	const base = new URL(baseUrl);
	const remote = new URL(parsed.data);
	const prefix = `${base.pathname.replace(/\/$/, '')}/`;
	if (remote.origin !== base.origin || !remote.pathname.startsWith(prefix)) {
		throw new BadRequestError('The repository URL must use the saved GitLab base URL.');
	}
	let path: string;
	try {
		path = decodeURIComponent(remote.pathname.slice(prefix.length))
			.replace(/\/$/, '')
			.replace(/\.git$/, '');
	} catch {
		throw new BadRequestError('The repository URL contains an invalid path.');
	}
	if (!repositoryPathSchema.safeParse(path).success) {
		throw new BadRequestError('Use a repository URL with a namespace and repository name.');
	}
	return path;
}

export function storePromotionTarget(
	provider: GitHostProvider,
	target: PromotionConnectionTarget,
): PromotionStoredConnectionTarget {
	if (!isPromotionGitHostType(provider.type)) return target;
	return {
		schemaVersion: 1,
		repositoryPath: repositoryPathFromUrl(hostBaseUrl(provider), target.remoteUrl),
	};
}

export function resolvePromotionTarget(
	provider: GitHostProvider,
	stored: unknown,
): PromotionConnectionTarget {
	const parsed = promotionStoredConnectionTargetSchema.safeParse(stored);
	if (!parsed.success) throw new BadRequestError('The stored connection target cannot be read');
	if ('remoteUrl' in parsed.data) return parsed.data;
	if (!isPromotionGitHostType(provider.type)) {
		throw new BadRequestError(
			'Plain Git connections need a remote URL. Update the connection target.',
		);
	}
	return {
		schemaVersion: 1,
		remoteUrl: repositoryUrlFromPath(hostBaseUrl(provider), parsed.data.repositoryPath),
	};
}

export function resolvePromotionGitTarget(
	provider: GitHostProvider,
	stored: unknown,
): PromotionConnectionTarget {
	const target = resolvePromotionTarget(provider, stored);
	if (!isPromotionGitHostType(provider.type)) return target;
	const baseUrl = hostBaseUrl(provider);
	let repositoryPath: string;
	try {
		repositoryPath = repositoryPathFromUrl(baseUrl, target.remoteUrl);
	} catch {
		throw new BadRequestError(
			'The saved repository URL does not use the GitLab base URL. Select the repository again.',
		);
	}
	return { schemaVersion: 1, remoteUrl: repositoryUrlFromPath(baseUrl, repositoryPath) };
}

export function repositoryUrlFromPath(baseUrl: string, repositoryPath: string): string {
	if (!repositoryPathSchema.safeParse(repositoryPath).success) {
		throw new BadRequestError('The repository path cannot be read. Select the repository again.');
	}
	const path = repositoryPath.split('/').map(encodeURIComponent).join('/');
	return new URL(`${path}.git`, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).href;
}

function hostBaseUrl(provider: GitHostProvider): string {
	const config = promotionGitHostConfigSchema.safeParse(provider.config);
	if (!config.success) {
		throw new BadRequestError('The stored provider config cannot be read. Update the provider.');
	}
	return config.data.baseUrl;
}
