import { AuditPublicDto, GenerateAuditRequestDto, type AuditPublic } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Post,
	PublicApiController,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import type { Risk } from '@/security-audit/types';

const tags = ['Audit'];

@PublicApiController('/audit')
export class AuditPublicController {
	@Post('/')
	@ApiKeyScope('securityAudit:generate')
	@ApiSummary('Generate an audit')
	@ApiDescription('Generate a security audit for your n8n instance.')
	@ApiTags(tags)
	@ApiResponse(200, AuditPublicDto)
	async generateAudit(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body body: GenerateAuditRequestDto,
	): Promise<AuditPublic> {
		// The audit service and its reporters pull in the node loader and the whole workflow set, so
		// they stay off the startup path. The `audit` CLI command loads them the same way.
		const { SecurityAuditService } = await import('@/security-audit/security-audit.service.js');

		// Typed against the reporters' own category union, so a category documented here that no
		// reporter serves fails the build instead of the request.
		const categories: Risk.Category[] | undefined = body.additionalOptions?.categories;

		return await Container.get(SecurityAuditService).run(
			categories,
			body.additionalOptions?.daysAbandonedWorkflow,
		);
	}
}
