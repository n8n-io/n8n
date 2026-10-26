import { Service } from '@n8n/di';
import {
	AuthenticationDriver,
	AuthenticationService,
	TrustedSource,
	TrustedSourceStore,
	type AdvertisedResource,
	type Extracted,
	type Result,
	type Verified,
} from '@n8n/inbound-auth';

import { Oauth2BearerDriver } from './oauth2-bearer.driver';

/** Dispatches by credential kind to the driver that recognises the token's source. */
@Service()
export class OAuth2AuthenticationService extends AuthenticationService {
	// ponytail: no driver registry. DI passes `undefined` for an `Array` paramtype, so the default
	// applies in production; tests pass the array.
	constructor(
		private readonly store: TrustedSourceStore,
		bearer: Oauth2BearerDriver,
		private readonly drivers: AuthenticationDriver[] = [bearer],
	) {
		super();
	}

	async authenticate(extracted: Extracted): Promise<Result<Verified>> {
		const { kind } = extracted.credential;

		const candidates = this.drivers.filter((driver) => driver.credentialKind === kind);

		if (candidates.length === 0) {
			return {
				ok: false,
				reason: 'source-unusable',
				detail: `No suitable authentication driver found for the credential kind "${kind}"`,
			};
		}

		let selected:
			| {
					driver: AuthenticationDriver;
					source: TrustedSource;
			  }
			| undefined;

		for (const driver of candidates) {
			const source = await driver.selectSource(extracted);
			if (source) {
				selected = { driver, source };
				break;
			}
		}

		if (!selected) {
			return {
				ok: false,
				reason: 'unknown-issuer',
			};
		}

		const { driver, source } = selected;

		if (source.config.surfaces[extracted.surface] === undefined)
			return { ok: false, reason: 'source-not-accepted' };

		if (extracted.acceptedSourceIds && !extracted.acceptedSourceIds.includes(source.id))
			return { ok: false, reason: 'source-not-accepted' };

		if (source.status !== 'healthy')
			return { ok: false, reason: 'source-unusable', detail: `source status is ${source.status}` };

		if (!driver.sourceTypes.includes(source.type))
			return {
				ok: false,
				reason: 'source-unusable',
				detail: `source type ${source.type} not handled`,
			};
		if (source.metadata === null)
			return { ok: false, reason: 'source-unusable', detail: 'source not discovered yet' };

		return await driver.verify(extracted, source);
	}

	async advertise(
		resource: AdvertisedResource,
	): Promise<{ authorizationServers: string[]; challenges: string[] }> {
		const onSurface = await this.store.listBySurface(resource.surface);
		const { acceptedSourceIds } = resource;
		const accepted = acceptedSourceIds
			? onSurface.filter((s) => acceptedSourceIds.includes(s.id))
			: onSurface;
		const authorizationServers = new Set<string>();
		const challenges: string[] = [];
		for (const driver of this.drivers) {
			const advertised = driver.advertise(resource, accepted);
			for (const issuer of advertised.authorizationServers ?? []) authorizationServers.add(issuer);
			if (advertised.challenge) challenges.push(advertised.challenge);
		}
		return { authorizationServers: [...authorizationServers], challenges };
	}
}
