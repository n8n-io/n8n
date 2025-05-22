import { UnexpectedError } from 'n8n-workflow';

export class EntityAlreadyRegisteredError extends UnexpectedError {
	constructor(className: string) {
		super(
			`Failed to register entity "${className}" because another entity class is already registered with this name. Please rename one of the entity classes.`,
		);
	}
}
