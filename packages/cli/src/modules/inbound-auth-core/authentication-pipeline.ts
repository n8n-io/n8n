import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import {
	AuthenticationService,
	AuthenticationPipeline,
	type Extracted,
	IdentityService,
	type Reject,
	type Result,
	type SurfaceId,
	type TrustedSource,
	TrustedSourceStore,
} from '@n8n/inbound-auth';
import type { SecurityContext } from '@n8n/permissions';

@Service()
export class InboundAuthPipeline extends AuthenticationPipeline {
	constructor(
		private readonly logger: Logger,
		private readonly authenticationService: AuthenticationService,
		private readonly identityService: IdentityService,
		private readonly trustedSourceStore: TrustedSourceStore,
		private readonly eventService: EventService,
	) {
		super();
	}

	async run(extracted: Extracted): Promise<Result<SecurityContext>> {
		const verified = await this.authenticationService.authenticate(extracted);
		if (!verified.ok) {
			return this.reject(extracted, verified);
		}

		const context = await this.identityService.identify(verified.value);
		if (!context.ok) {
			return this.reject(extracted, context, verified.value.source.id);
		}

		if (verified.value.source.managedBy === 'admin') {
			await this.recordFirstAuthentication(verified.value.source, extracted.surface);
		}

		this.logger.info('Inbound authentication accepted', {
			surface: extracted.surface,
			resource: extracted.resource.url,
			sourceId: verified.value.source.id,
			authMethod: context.value.authMethod,
			userId: context.value.subject.id,
		});
		return context;
	}

	private reject(extracted: Extracted, rejection: Reject, sourceId?: string): Reject {
		this.logger.warn('Inbound authentication rejected', {
			surface: extracted.surface,
			resource: extracted.resource.url,
			reason: rejection.reason,
			detail: rejection.detail,
			sourceId,
		});
		return rejection;
	}

	private async recordFirstAuthentication(source: TrustedSource, surface: SurfaceId) {
		try {
			if (await this.trustedSourceStore.recordFirstAuthentication(source)) {
				this.eventService.emit('trusted-source-first-authenticated', {
					sourceId: source.id,
					surface,
				});
			}
		} catch (error) {
			this.logger.warn('Could not record the first authentication of a trusted source', {
				sourceId: source.id,
				error,
			});
		}
	}
}
