import { DynamicTemplatesRequestQuery } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Get, Query, RestController } from '@n8n/decorators';
import type { IPersonalizationSurveyAnswersV4 } from 'n8n-workflow';

import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import {
	DynamicTemplatesService,
	mapToUnifiedUserContext,
} from '@/services/dynamic-templates.service';

@RestController('/dynamic-templates')
export class DynamicTemplatesController {
	constructor(
		private readonly dynamicTemplatesService: DynamicTemplatesService,
		private readonly userRepository: UserRepository,
		private readonly globalConfig: GlobalConfig,
	) {}

	@Get('/')
	async get(req: AuthenticatedRequest, _res: unknown, @Query query: DynamicTemplatesRequestQuery) {
		try {
			// Parse cloud data from query params (if provided by cloud users)
			let selectedApps: string[] | undefined;
			let cloudInformation: Record<string, string | string[]> | undefined;

			if (query.selectedApps) {
				try {
					selectedApps = JSON.parse(query.selectedApps) as string[];
				} catch {
					// Invalid JSON, ignore
				}
			}

			if (query.cloudInformation) {
				try {
					cloudInformation = JSON.parse(query.cloudInformation) as Record<
						string,
						string | string[]
					>;
				} catch {
					// Invalid JSON, ignore
				}
			}

			// Cloud users provide their data via query params, so skip DB query for them.
			// Self-hosted users need to fetch personalizationAnswers from the database.
			const isCloudUser = this.globalConfig.deployment.type === 'cloud';
			let personalizationAnswers: IPersonalizationSurveyAnswersV4 | null = null;

			if (!isCloudUser) {
				const user = await this.userRepository.findOne({
					where: { id: req.user.id },
					select: ['personalizationAnswers'],
				});
				personalizationAnswers =
					user?.personalizationAnswers as IPersonalizationSurveyAnswersV4 | null;
			}

			const userContext = mapToUnifiedUserContext(
				personalizationAnswers,
				selectedApps,
				cloudInformation,
			);

			const templates = await this.dynamicTemplatesService.fetchDynamicTemplates({ userContext });
			return { templates };
		} catch {
			throw new InternalServerError('Failed to fetch dynamic templates');
		}
	}
}
