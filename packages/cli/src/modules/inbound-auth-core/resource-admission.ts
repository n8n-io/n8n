import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import {
	AuthenticationPipeline,
	AuthenticationService,
	inboundFrom,
	ResourceAdmission,
	type AdmissionResult,
	type AdvertisedResource,
	type Extracted,
	type Inbound,
	type ProtectedResource,
	type Refusal,
	type RefusalReason,
	type Refused,
} from '@n8n/inbound-auth';
import type { SecurityContext } from '@n8n/permissions';

/** Admission through the inbound-auth pipeline, with the surface's own refusals logged here. */
@Service()
export class InboundResourceAdmission extends ResourceAdmission {
	constructor(
		private readonly pipeline: AuthenticationPipeline,
		private readonly authenticationService: AuthenticationService,
		private readonly logger: Logger,
	) {
		super();
	}

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

	async challenge({ advertised, reason }: Refusal): Promise<string> {
		const { challenges } = await this.authenticationService.advertise(advertised);
		const challenge = challenges[0] ?? 'Bearer';
		// RFC 6750 §3.1: a request that lacks any authentication information
		// SHOULD NOT get an error code.
		if (reason === undefined || reason === 'no-credential') return challenge;
		const error = reason === 'insufficient_scope' ? 'insufficient_scope' : 'invalid_token';
		return `${challenge}, error="${error}", error_description="${reason}"`;
	}

	/**
	 * The one log line for a refusal the surface decides itself, before or after the pipeline.
	 * Carries no token, no external subject and no email.
	 */
	refuse(inbound: Inbound, reason: RefusalReason, context?: SecurityContext): Refused {
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
export function advertisedOf({
	surface,
	resource,
	acceptedSourceIds,
}: Inbound): AdvertisedResource {
	return { surface, resource, ...(acceptedSourceIds !== undefined && { acceptedSourceIds }) };
}
