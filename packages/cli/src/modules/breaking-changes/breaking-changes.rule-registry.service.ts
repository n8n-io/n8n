import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import type { IBreakingChangeRule } from './types';

@Service()
export class RuleRegistry {
	private readonly rules = new Map<string, IBreakingChangeRule>();

	constructor(private readonly logger: Logger) {
		this.logger = logger.scoped('breaking-changes');
	}

	register(rule: IBreakingChangeRule): void {
		if (this.rules.has(rule.id)) {
			this.logger.warn(`Rule with ID ${rule.id} is already registered. Overwriting.`);
		}
		this.rules.set(rule.id, rule);
		this.logger.debug(`Registered rule: ${rule.id}`);
	}

	registerAll(rules: IBreakingChangeRule[]): void {
		rules.forEach((rule) => this.register(rule));
	}

	getRule(id: string): IBreakingChangeRule | undefined {
		return this.rules.get(id);
	}

	getRules(version?: string): IBreakingChangeRule[] {
		const rules = Array.from(this.rules.values());
		if (!version) {
			return rules;
		}
		return rules.filter((rule) => rule.getMetadata().version === version);
	}
}
