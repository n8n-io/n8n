import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import type { IBreakingChangeRule, BreakingChangeMetadata, DetectionResult } from '../types';

@Service()
export abstract class AbstractBreakingChangeRule implements IBreakingChangeRule {
	protected readonly logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger.scoped('breaking-changes');
	}

	abstract getMetadata(): BreakingChangeMetadata;

	abstract detect(): Promise<DetectionResult>;

	protected createEmptyResult(ruleId: string): DetectionResult {
		return {
			ruleId,
			isAffected: false,
			affectedWorkflows: [],
			instanceIssues: [],
			recommendations: [],
		};
	}
}
