import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import {
	AuthenticationPipeline,
	AuthenticationService,
	inboundFrom,
	type AdvertisedResource,
	type Extracted,
	type Inbound,
	type ProtectedResource,
	type RejectReason,
} from '@n8n/inbound-auth';
import type { SecurityContext } from '@n8n/permissions';
import type { Request } from 'express';

/** Why the caller was turned away: the pipeline's vocabulary, plus the resource's own refusal. */
export type RefusalReason = RejectReason | 'insufficient_scope';

export type Admitted = {
	ok: true;
	context: SecurityContext;
};

export type Refused = {
	ok: false;
	reason: RefusalReason;
	/** The resource as the pipeline saw it. Enough to build the challenge, without the request. */
	advertised: AdvertisedResource;
	/** Present when the pipeline accepted the token and the resource then refused the subject. */
	context?: SecurityContext;
};

export type AdmissionResult = Admitted | Refused;

/** The request as the pipeline wants it, from an Express request. */
export function inboundRequestOf(
	req: Pick<Request, 'method' | 'originalUrl' | 'headers' | 'ip'>,
): Inbound['request'] {
	return { method: req.method, url: req.originalUrl, headers: req.headers, ip: req.ip ?? '' };
}

/**
 * What every surface does between taking a credential off the wire and acting as the caller:
 * stamp the inbound with the resource, run the authentication pipeline, ask the resource to
 * authorize the subject, and build the 401 challenge when any of that fails.
 *
 * A surface keeps what is its own: where the credential travels (`Authorization`, a cookie,
 * a custom header, a token it just exchanged) and how it answers a refusal.
 */
@Service()
export class ResourceAdmission {
	constructor(
		private readonly pipeline: AuthenticationPipeline,
		private readonly authenticationService: AuthenticationService,
		private readonly logger: Logger,
	) {}

	/**
	 * Admits a bearer the surface already took out of its own carrier. An empty token is
	 * refused with `no-credential`, so the surface can still answer with the challenge.
	 */
	async admitBearer(
		resource: ProtectedResource,
		request: Omit<Inbound['request'], 'headers'>,
		token: string,
	): Promise<AdmissionResult> {
		// The credential travels in `credential`; no header carried it.
		const inbound = inboundFrom(resource, { ...request, headers: {} });
		if (!token) return this.refuse(inbound, 'no-credential');
		return await this.admit(resource, { ...inbound, credential: { kind: 'bearer', token } });
	}

	/** Admits an extracted credential, for a surface that inspects it before the pipeline runs. */
	async admit(resource: ProtectedResource, extracted: Extracted): Promise<AdmissionResult> {
		// The pipeline logs its own decisions.
		const authenticated = await this.pipeline.run(extracted);
		if (!authenticated.ok) {
			return { ok: false, reason: authenticated.reason, advertised: advertisedOf(extracted) };
		}

		const context = authenticated.value;
		if (!(await resource.authorize(context.subject))) {
			return this.refuse(extracted, 'insufficient_scope', context);
		}
		return { ok: true, context };
	}

	/** The `WWW-Authenticate` value for a refusal: the advertised challenge, then the RFC 6750 error. */
	async challenge({ advertised, reason }: Refused): Promise<string> {
		const { challenges } = await this.authenticationService.advertise(advertised);
		const error = reason === 'insufficient_scope' ? 'insufficient_scope' : 'invalid_token';
		return `${challenges[0] ?? 'Bearer'}, error="${error}", error_description="${reason}"`;
	}

	/**
	 * The one log line for a refusal the surface decides itself, before or after the pipeline.
	 * Carries no token, no external subject and no email.
	 */
	private refuse(inbound: Inbound, reason: RefusalReason, context?: SecurityContext): Refused {
		this.logger.warn('Inbound authentication denied', {
			surface: inbound.surface,
			resource: inbound.resource.url,
			sourceId: context?.subjectClaim?.sourceId,
			authMethod: context?.authMethod,
			userId: context?.subject.id,
			reason,
		});
		return { ok: false, reason, advertised: advertisedOf(inbound), ...(context && { context }) };
	}
}

/** Keeps the request, and with it the credential, out of the result. */
function advertisedOf({ surface, resource, acceptedSourceIds }: Inbound): AdvertisedResource {
	return { surface, resource, ...(acceptedSourceIds !== undefined && { acceptedSourceIds }) };
}
