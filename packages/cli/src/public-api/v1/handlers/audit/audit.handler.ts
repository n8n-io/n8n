import { Container } from '@n8n/di';

import type { AuditRequest } from '@/public-api/types';

import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { apiKeyHasScopeWithGlobalScopeFallback } from '../../shared/middlewares/global.middleware';

type AuditHandlers = {
	generateAudit: PublicAPIEndpoint<AuditRequest.Generate>;
};

const auditHandlers: AuditHandlers = {
	generateAudit: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'securityAudit:generate' }),
		async (req, res) => {
			const { SecurityAuditService } = await import('@/security-audit/security-audit.service');
			const result = await Container.get(SecurityAuditService).run(
				req.body?.additionalOptions?.categories,
				req.body?.additionalOptions?.daysAbandonedWorkflow,
			);

			return res.json(result);
		},
	],
};

export = auditHandlers;
