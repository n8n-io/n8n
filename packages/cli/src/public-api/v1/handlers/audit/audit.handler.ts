import { Container } from '@n8n/di';
import type { Response } from 'express';

import type { AuditRequest } from '@/public-api/types';

import { apiKeyHasScopeWithGlobalScopeFallback } from '../../shared/middlewares/global.middleware';

export = {
	generateAudit: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'securityAudit:generate' }),
		async (req: AuditRequest.Generate, res: Response): Promise<Response> => {
			try {
				const { SecurityAuditService } = await import('@/security-audit/security-audit.service');
				const result = await Container.get(SecurityAuditService).run(
					req.body?.additionalOptions?.categories,
					req.body?.additionalOptions?.daysAbandonedWorkflow,
				);

				return res.json(result);
			} catch (error) {
				return res.status(500).json(error);
			}
		},
	],
};
