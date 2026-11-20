import type { PromotionDependencyReport } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { ApplyCheckFactsService, type ApplyCheckFactsArgs } from './apply-check-facts.service';
import { computeApplyOutcome } from './apply-report';
import type { ApplyCheckOutcome } from './dependency-check.types';
import {
	PromoteCheckFactsService,
	type PromoteCheckFactsArgs,
} from './promote-check-facts.service';
import { computePromoteReport } from './promote-report';

export type PromoteCheckArgs = PromoteCheckFactsArgs;
export type ApplyCheckArgs = ApplyCheckFactsArgs;

/**
 * The dependency check of a Promote and of an Apply: it gathers the facts, then computes the
 * report. The preview and the operation call the same method with the same arguments, so they
 * give the same report and the same gap ids.
 *
 * The check reads only. It writes nothing to the database or to the branch.
 */
@Service()
export class PromotionDependencyCheckService {
	constructor(
		private readonly promoteFacts: PromoteCheckFactsService,
		private readonly applyFacts: ApplyCheckFactsService,
	) {}

	async checkPromote(args: PromoteCheckArgs): Promise<PromotionDependencyReport> {
		return computePromoteReport(await this.promoteFacts.gather(args));
	}

	async checkApply(args: ApplyCheckArgs): Promise<PromotionDependencyReport> {
		return (await this.checkApplyWithActions(args)).report;
	}

	/**
	 * The report of an Apply, with what the operation must do: the workflows and the projects
	 * that reconciliation keeps, and the empty credentials of the credential gaps. The actions can
	 * name items that the user cannot access, so only the report goes to a client.
	 */
	async checkApplyWithActions(args: ApplyCheckArgs): Promise<ApplyCheckOutcome> {
		return computeApplyOutcome(await this.applyFacts.gather(args));
	}
}
