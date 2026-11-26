import type {
	ListPromotionProjectEnvironmentsAllowListQueryDto,
	PromotionProjectEnvironmentsAllowList,
	PromotionProjectEnvironmentsAllowListResponse,
	UpdatePromotionProjectEnvironmentsAllowListDto,
} from '@n8n/api-types';
import { EventService, loginIdOf } from '@n8n/backend-services';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError, NotFoundError } from '@n8n/errors';

import type { UserLike } from '@/types/user-like.types';

import { PromotionProjectSettingsRepository } from './database/repositories/promotion-project-settings.repository';
import { PromotionSettingsService } from './promotion-settings.service';

@Service()
export class PromotionProjectSettingsService {
	constructor(
		private readonly repository: PromotionProjectSettingsRepository,
		private readonly promotionSettings: PromotionSettingsService,
		private readonly eventService: EventService,
	) {}

	async listEnvironmentsAllowList(
		{ search, allowEnvironments, skip, take }: ListPromotionProjectEnvironmentsAllowListQueryDto,
		ctx: OperationContext = {},
	): Promise<PromotionProjectEnvironmentsAllowList> {
		await this.assertProjectEnvironmentsEnabled(ctx);
		const [data, count] = await this.repository.findTeamProjectPage(
			{ search, allowEnvironments, skip, take },
			ctx,
		);
		return { count, data };
	}

	async setAllowEnvironments(
		actor: UserLike,
		projectId: string,
		{ allowEnvironments }: UpdatePromotionProjectEnvironmentsAllowListDto,
		ctx: OperationContext = {},
	): Promise<PromotionProjectEnvironmentsAllowListResponse> {
		await this.assertProjectEnvironmentsEnabled(ctx);
		const changed = await this.repository.setAllowEnvironmentsForTeamProject(
			projectId,
			allowEnvironments,
			ctx,
		);
		if (changed === null) throw new NotFoundError('Could not find team project');
		if (changed) {
			const { id, email, firstName, lastName, role } = actor;
			this.eventService.emit('promotion-project-environments-allow-list-updated', {
				user: { id, email, firstName, lastName, role },
				projectId,
				allowEnvironments,
				loginId: loginIdOf(ctx),
			});
		}

		return { allowEnvironments };
	}

	private async assertProjectEnvironmentsEnabled(ctx: OperationContext) {
		if (!(await this.promotionSettings.isProjectEnvironmentsEnabled(ctx))) {
			throw new ForbiddenError('Project environments are off');
		}
	}
}
