import { RunSecurityAuditRequestDto } from '@n8n/api-types';
import { Post, RestController, GlobalScope, Body } from '@n8n/decorators';

import { SecurityAuditService } from './security-audit.service';

@RestController('/audit')
export class SecurityAuditController {
	constructor(private readonly securityAuditService: SecurityAuditService) {}

	@Post('/')
	@GlobalScope('securityAudit:generate')
	async runAudit(@Body body: RunSecurityAuditRequestDto) {
		return await this.securityAuditService.run(
			body.additionalOptions?.categories,
			body.additionalOptions?.daysAbandonedWorkflow,
		);
	}
}
