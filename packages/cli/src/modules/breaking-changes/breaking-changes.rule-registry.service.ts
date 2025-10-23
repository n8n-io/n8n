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
		const metadata = rule.getMetadata();
		if (this.rules.has(metadata.id)) {
			this.logger.warn(`Rule with ID ${metadata.id} is already registered. Overwriting.`);
		}
		this.rules.set(metadata.id, rule);
		this.logger.debug(`Registered rule: ${metadata.id}`);
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
