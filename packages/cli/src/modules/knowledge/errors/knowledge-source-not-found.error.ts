import { UserError } from 'n8n-workflow';

export class KnowledgeSourceNotFoundError extends UserError {
	constructor(sourceId: string) {
		super(`Could not find the knowledge source: '${sourceId}'`, { level: 'warning' });
	}
}
