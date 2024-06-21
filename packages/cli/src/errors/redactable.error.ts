import { ApplicationError } from 'n8n-workflow';

export class RedactableError extends ApplicationError {
	constructor(fieldName: string, args: string) {
		super(
			`Failed to find "${fieldName}" property in argument "${args.toString()}". Please set the decorator \`@Redactable()\` only on \`AuditEventRelay\` methods where the argument contains a "${fieldName}" property.`,
		);
	}
}
