import { Service, type Constructable } from '@n8n/di';

type RuleEntry = {
	class: Constructable;
	version: string;
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
