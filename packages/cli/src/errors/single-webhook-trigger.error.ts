import { UserError } from 'n8n-workflow';

export class SingleWebhookTriggerError extends UserError {
	constructor(triggerName: string) {
		super(
			`Because of limitations in ${triggerName}, n8n can't listen for test executions at the same time as listening for production ones. Unpublish the workflow to execute.`,
			{ extra: { triggerName } },
		);
	}
}
