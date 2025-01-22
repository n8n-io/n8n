import { Container } from '@n8n/di';
import type { Response } from 'express';

import type { AuditRequest } from '@/public-api/types';
import { globalScope } from '@/public-api/v1/shared/middlewares/global.middleware';

export = {
	generateAudit: [
		globalScope('securityAudit:generate'),
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
