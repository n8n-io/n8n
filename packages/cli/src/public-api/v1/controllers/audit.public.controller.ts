import { AuditPublicDto, GenerateAuditPublicDto, type AuditPublic } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Post,
	PublicApiController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { SecurityAuditService } from '@/security-audit/security-audit.service';

@PublicApiController('/audit')
export class AuditPublicController {
	constructor(private readonly securityAuditService: SecurityAuditService) {}

	@Post('/')
	@ApiKeyScope('securityAudit:generate')
	@ApiSummary('Generate an audit')
	@ApiDescription('Generate a security audit for your n8n instance.')
	@ApiTags(['Audit'])
	@ApiResponse(200, AuditPublicDto)
	@ApiErrorResponse(500)
	async generateAudit(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body body: GenerateAuditPublicDto,
	): Promise<AuditPublic> {
		return await this.securityAuditService.run(
			body.additionalOptions?.categories,
			body.additionalOptions?.daysAbandonedWorkflow,
		);
	}
}
