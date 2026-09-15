import { BadRequestError } from '@/errors/response-errors/bad-request.error';

/** The served app chats as its project, so only an agent that project owns can be bound. */
export class BindingAgentNotFoundError extends BadRequestError {
	constructor(key: string, agentId: string) {
		super(`Binding '${key}': agent "${agentId}" not found in this project.`);
	}
}
