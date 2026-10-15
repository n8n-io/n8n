import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import {
	AuthenticationService,
	AuthenticationPipeline,
	type Extracted,
	IdentityService,
	type Reject,
	type Result,
} from '@n8n/inbound-auth';
import type { SecurityContext } from '@n8n/permissions';

@Service()
export class InboundAuthPipeline extends AuthenticationPipeline {
	constructor(
		private readonly logger: Logger,
		private readonly authenticationService: AuthenticationService,
		private readonly identityService: IdentityService,
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
}
