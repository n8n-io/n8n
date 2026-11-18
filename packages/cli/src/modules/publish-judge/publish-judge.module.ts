import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

/** Prototype. Opt in with `N8N_ENABLED_MODULES=publish-judge`. The judge runs on main only. */
@BackendModule({ name: 'publish-judge', instanceTypes: ['main'] })
export class PublishJudgeModule implements ModuleInterface {
	async init() {
		// Side-effecting imports: the decorators register the routes and the check.
		await import('./publish-judge.controller.js');
		await import('./publish-judge.check.js');
	}

	async entities() {
		const { PublishJudgeReview } = await import(
			'./database/entities/publish-judge-review.entity.js'
		);

		return [PublishJudgeReview];
	}
}
