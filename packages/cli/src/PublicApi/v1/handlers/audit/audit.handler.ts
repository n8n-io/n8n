import { globalScope } from '@/PublicApi/v1/shared/middlewares/global.middleware';
import type { Response } from 'express';
import type { AuditRequest } from '@/PublicApi/types';
import Container from 'typedi';

export = {
	generateAudit: [
		globalScope('securityAudit:generate'),
		async (req: AuditRequest.Generate, res: Response): Promise<Response> => {
			try {
				const { SecurityAuditService } = await import('@/security-audit/SecurityAudit.service');
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
