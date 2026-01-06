import {
	BreakingChangeInstanceRuleResult,
	BreakingChangeLightReportResult,
	BreakingChangeReportResult,
	BreakingChangeVersion,
	BreakingChangeWorkflowRuleResult,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, RestController, GlobalScope, Query, Post, Param } from '@n8n/decorators';

import { BreakingChangeService } from './breaking-changes.service';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

@RestController('/breaking-changes')
export class BreakingChangesController {
	constructor(private readonly service: BreakingChangeService) {}

	private getLightDetectionResults(
		report: BreakingChangeReportResult['report'],
	): BreakingChangeLightReportResult['report'] {
		return {
			...report,
			workflowResults: report.workflowResults.map((r) => {
				const { affectedWorkflows, ...otherFields } = r;
				return { ...otherFields, nbAffectedWorkflows: affectedWorkflows.length };
			}),
		};
	}

	/**
	 * Get all registered breaking change rules results
	 */
	@Get('/report')
	@GlobalScope('breakingChanges:list')
	async getDetectionReport(
		@Query query: { version?: BreakingChangeVersion },
	): Promise<BreakingChangeLightReportResult> {
		const report = await this.service.getDetectionResults(query.version ?? 'v2');
		return {
			...report,
			report: this.getLightDetectionResults(report.report),
		};
	}

	@Post('/report/refresh')
	@GlobalScope('breakingChanges:list')
	async refreshCache(
		@Query query: { version?: BreakingChangeVersion },
	): Promise<BreakingChangeLightReportResult> {
		const report = await this.service.refreshDetectionResults(query.version ?? 'v2');
		return {
			...report,
			report: this.getLightDetectionResults(report.report),
		};
	}

	/**
	 * Get specific breaking change rules
	 */
	@Get('/report/:ruleId')
	@GlobalScope('breakingChanges:list')
	async getDetectionReportForRule(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('ruleId') ruleId: string,
	): Promise<BreakingChangeInstanceRuleResult | BreakingChangeWorkflowRuleResult> {
		const result = await this.service.getDetectionReportForRule(ruleId);
		if (!result) {
			throw new NotFoundError(`Breaking change rule with ID '${ruleId}' not found.`);
		}
		return result;
	}
}
