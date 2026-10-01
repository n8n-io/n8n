import { Logger } from '@n8n/backend-common';
import { OAuthDiscoveryClient } from '@n8n/backend-services';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import {
	LocalAuthorizationServer,
	resolveOAuth2Endpoints,
	TrustedSourceMetadataSchema,
	type DiscoveryDocument,
	type TrustedSource,
} from '@n8n/inbound-auth';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { OperationalError } from 'n8n-workflow';

import { TrustedSourceDbStore, type DiscoveryResult } from './trusted-source.store';

/** A failed source is retried soon; a healthy one is refreshed on a slow cadence. */
export const ERROR_RETRY_MS = 5 * Time.minutes.toMilliseconds;
// ponytail: 1 h staleness ceiling after key rotation.
export const HEALTHY_REFRESH_MS = 1 * Time.hours.toMilliseconds;
/** Sources refreshed at once in one run. */
export const CONCURRENCY = 5;
/** A run stops taking new sources after this; the task fires every minute anyway. */
export const RUN_DEADLINE_MS = 40 * Time.seconds.toMilliseconds;

/**
 * Fetches the OAuth2 metadata and JWKS of every trusted source and stores the result as the
 * source's `metadata`. The store's lease keeps two instances from refreshing the same source.
 */
@Service()
export class TrustedSourceDiscoveryService {
	constructor(
		private readonly logger: Logger,
		private readonly store: TrustedSourceDbStore,
		private readonly client: OAuthDiscoveryClient,
		private readonly localServer: LocalAuthorizationServer,
	) {}

	async refresh(sourceId: string): Promise<void> {
		const source = await this.store.getById(sourceId);
		if (source) await this.refreshSource(source);
	}

	async refreshDue(signal: AbortSignal): Promise<void> {
		const now = Date.now();
		const deadline = now + RUN_DEADLINE_MS;
		const queue = (await this.store.listAll()).filter((source) => this.isDue(source, now));
		// A source that was never checked is unusable until it is; it goes before every refresh.
		queue.sort((a, b) => Number(a.status !== 'unchecked') - Number(b.status !== 'unchecked'));

		const worker = async () => {
			while (!signal.aborted && Date.now() < deadline) {
				const source = queue.shift();
				if (source === undefined) return;
				await this.refreshSource(source);
			}
		};
		await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
	}

	private isDue(source: TrustedSource, now: number): boolean {
		if (source.status === 'unchecked' || source.lastCheckedAt === null) return true;
		const interval = source.status === 'error' ? ERROR_RETRY_MS : HEALTHY_REFRESH_MS;
		return now - new Date(source.lastCheckedAt).getTime() >= interval;
	}

	/** Never throws: one source's failure must not end the run for the others. */
	private async refreshSource(source: TrustedSource): Promise<void> {
		const claimedAt = new Date();
		try {
			if (!(await this.store.claimDiscovery(source, claimedAt))) return;
			await this.store.recordDiscovery(source, claimedAt, await this.discover(source));
		} catch (error) {
			this.logger.error('Could not write the discovery result of a trusted source', {
				id: source.id,
				error,
			});
		}
	}

	/** A failed discovery becomes the source's `error` status; the previous metadata stays. */
	private async discover(source: TrustedSource): Promise<DiscoveryResult> {
		try {
			const documents = await this.collect(source);
			const metadata = TrustedSourceMetadataSchema.parse({ version: 1, documents });
			return { metadata, status: 'healthy', lastError: null };
		} catch (error) {
			const lastError = ensureError(error).message;
			this.logger.warn('Trusted source discovery failed', { id: source.id, reason: lastError });
			return { status: 'error', lastError };
		}
	}

	/** All or nothing: a source is healthy only when every document it needs was fetched. */
	private async collect(source: TrustedSource): Promise<DiscoveryDocument[]> {
		const { issuer, config } = source;
		const { authentication } = config;
		const fetchedAt = new Date().toISOString();

		if (authentication.keys.kind === 'local-keystore') {
			const document = await this.localServer.getMetadata();
			// The same checks as the remote path: the document must name this issuer and a JWKS.
			if (document.issuer !== issuer) {
				throw new OperationalError(
					`Local server metadata names issuer "${document.issuer}", expected "${issuer}"`,
				);
			}
			if (!document.jwks_uri) throw new OperationalError(`Issuer "${issuer}" has no jwks_uri`);
			const { keys } = await this.localServer.getJwks();
			return [
				{ kind: 'oauth2-authorization-server', fetchedAt, document },
				{ kind: 'jwks', fetchedAt, url: document.jwks_uri, keys },
			];
		}

		const documents: DiscoveryDocument[] = [];
		const { discovery } = authentication;
		if (discovery.mode === 'manual') {
			if (discovery.metadataUrl) {
				const fetched = await this.client.fetchOAuth2ServerMetadata({
					issuer,
					url: discovery.metadataUrl,
				});
				if (!fetched) {
					throw new OperationalError(`Metadata URL "${discovery.metadataUrl}" offers no document`);
				}
				documents.push({
					kind: 'oauth2-authorization-server',
					fetchedAt,
					document: fetched.document,
				});
			}
		} else {
			const [oidc, oauth2] = await Promise.all([
				this.client.fetchOpenIdConfiguration(issuer),
				this.client.fetchOAuth2ServerMetadata({ issuer }),
			]);
			if (oidc)
				documents.push({ kind: 'openid-configuration', fetchedAt, document: oidc.document });
			if (oauth2) {
				documents.push({
					kind: 'oauth2-authorization-server',
					fetchedAt,
					document: oauth2.document,
				});
			}
			if (documents.length === 0) {
				throw new OperationalError(`Issuer "${issuer}" offers no OAuth2 metadata document`);
			}
		}

		const { jwksUri } = resolveOAuth2Endpoints(config, documents);
		if (!jwksUri) throw new OperationalError(`Issuer "${issuer}" has no jwks_uri`);
		const { keys } = await this.client.fetchJwks(jwksUri);
		documents.push({ kind: 'jwks', fetchedAt, url: jwksUri, keys });
		return documents;
	}
}
