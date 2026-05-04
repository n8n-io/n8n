import { Service } from '@n8n/di';

import type { AuthlessRequest } from '@/requests';

import { bearerTokenSchema, taskBrokerAuthRequestBodySchema } from './task-broker-auth.schema';
import { TaskBrokerAuthService } from './task-broker-auth.service';
import { BadRequestError } from '../../../errors/response-errors/bad-request.error';
import { ForbiddenError } from '../../../errors/response-errors/forbidden.error';

/**
 * Controller responsible for authenticating Task Runner connections
 */
@Service()
export class TaskBrokerAuthController {
	constructor(private readonly authService: TaskBrokerAuthService) {}

	/**
	 * Validates the provided auth token and creates and responds with a grant token,
	 * which can be used to initiate a task runner connection.
	 */
	async createGrantToken(req: AuthlessRequest) {
		const result = await taskBrokerAuthRequestBodySchema.safeParseAsync(req.body);
		if (!result.success) {
			throw new BadRequestError(result.error.errors[0].code);
		}

		const { token: authToken } = result.data;
		if (!this.authService.isValidAuthToken(authToken)) {
			throw new ForbiddenError();
		}

		const grantToken = await this.authService.createGrantToken();
		return {
			token: grantToken,
		};
	}

	/**
	 * Validates a WebSocket upgrade request by checking runner ID and grant token
	 * @returns Object with validation result and appropriate HTTP status code
	 */
	async validateUpgradeRequest(
		authHeader: string | undefined,
	): Promise<{ isValid: boolean; statusCode: number; reason?: string }> {
		const result = bearerTokenSchema.safeParse(authHeader);
		if (!result.success) {
			return {
				isValid: false,
				statusCode: 401,
				reason: 'missing or invalid Authorization header',
			};
		}

		const grantToken = result.data;
		const isValid = await this.authService.tryConsumeGrantToken(grantToken);
		if (!isValid) {
			return {
				isValid: false,
				statusCode: 403,
				reason: 'invalid or expired grant token',
			};
		}

		return { isValid: true, statusCode: 200 };
	}
}
