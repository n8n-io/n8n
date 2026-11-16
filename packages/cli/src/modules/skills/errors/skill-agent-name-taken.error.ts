import { UserError } from '@n8n/errors';

export class SkillAgentNameTakenError extends UserError {
	constructor(name: string, agentNames: string[]) {
		super(
			`Cannot rename to "${name}": ${agentNames.join(', ')} already ${
				agentNames.length > 1 ? 'use' : 'uses'
			} a skill with a name like that.`,
		);
	}
}
