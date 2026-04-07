import { InsightsDateFilterDto } from '@n8n/api-types';
import { Container } from '@n8n/di';
import type express from 'express';
import { DateTime } from 'luxon';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import { apiKeyHasScope } from '../../shared/middlewares/global.middleware';

import { InsightsService } from '@/modules/insights/insights.service';
import type { InsightsRequest } from '@/public-api/types';

const dateFilterValidationSchema = z
	.object({
		startDate: z.coerce.date().optional(),
		endDate: z.coerce.date().optional(),
	})
	.refine(
		(data) => {
			if (data.startDate && data.endDate) {
				return data.startDate <= data.endDate;
			}

			return true;
		},
		{
			message: 'endDate must be the same as or after startDate',
			path: ['endDate'],
		},
	);

export = {
	getInsightsSummary: [
		apiKeyHasScope('insights:read'),
		async (req: InsightsRequest.GetSummary, res: express.Response): Promise<express.Response> => {
			const query = InsightsDateFilterDto.safeParse(req.query);
			if (!query.success) {
				return res
					.status(400)
					.json({ message: query.error.errors.map(({ message }) => message).join(' ') });
			}

			const validation = dateFilterValidationSchema.safeParse(query.data);
			if (!validation.success) {
				return res
					.status(400)
					.json({ message: validation.error.errors.map(({ message }) => message).join(' ') });
			}

			const endDate = query.data.endDate ?? new Date();
			const startDate = query.data.startDate ?? DateTime.now().minus({ days: 7 }).toJSDate();

			try {
				Container.get(InsightsService).validateDateFiltersLicense({ startDate, endDate });
			} catch (error) {
				if (error instanceof UserError) {
					return res.status(403).json({ message: error.message });
				}

				throw error;
			}

			const summary = await Container.get(InsightsService).getInsightsSummary({
				startDate,
				endDate,
				projectId: query.data.projectId,
			});

			return res.json(summary);
		},
	],
};
