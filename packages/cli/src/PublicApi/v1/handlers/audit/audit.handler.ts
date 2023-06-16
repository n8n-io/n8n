import { authorize } from '@/PublicApi/v1/shared/middlewares/global.middleware';
import { audit } from '@/audit';
import type { Response } from 'express';
import type { AuditRequest } from '@/PublicApi/types';

export = {
	generateAudit: [
		authorize(['owner']),
		async (req: AuditRequest.Generate, res: Response): Promise<Response> => {
			try {
				const result = await audit(
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
