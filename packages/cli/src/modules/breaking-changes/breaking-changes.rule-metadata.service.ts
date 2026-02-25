import type { BreakingChangeVersion } from '@n8n/api-types';
import { Service, type Constructable } from '@n8n/di';

import type { IBreakingChangeRule } from './types';

type RuleEntry = {
	class: Constructable<IBreakingChangeRule>;
	version: BreakingChangeVersion;
};

@Service()
export class BreakingChangeRuleMetadata {
	private readonly rules: RuleEntry[] = [];

	register(ruleEntry: RuleEntry) {
		this.rules.push(ruleEntry);
	}

	getEntries() {
		return this.rules;
	}

	getClasses() {
		return this.rules.map((entry) => entry.class);
	}
}
