import { Service } from '@n8n/di';
import type { NextFunction, Response } from 'express';

import type { AuthlessRequest } from '@/requests';
import type { TaskBrokerServerInitRequest } from '@/task-runners/task-broker/task-broker-types';

import { taskBrokerAuthRequestBodySchema } from './task-broker-auth.schema';
import { TaskBrokerAuthService } from './task-broker-auth.service';
import { BadRequestError } from '../../../errors/response-errors/bad-request.error';
import { ForbiddenError } from '../../../errors/response-errors/forbidden.error';

/**
 * Controller responsible for authenticating Task Runner connections
 */
@Service()
export class TaskBrokerAuthController {
	constructor(private readonly authService: TaskBrokerAuthService) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		this.authMiddleware = this.authMiddleware.bind(this);
	}

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
	 * Middleware to authenticate task runner init requests
	 */
	async authMiddleware(req: TaskBrokerServerInitRequest, res: Response, next: NextFunction) {
		const authHeader = req.headers.authorization;
		if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
			res.status(401).json({ code: 401, message: 'Unauthorized' });
			return;
		}

		const grantToken = authHeader.slice('Bearer '.length);
		const isConsumed = await this.authService.tryConsumeGrantToken(grantToken);
		if (!isConsumed) {
			res.status(403).json({ code: 403, message: 'Forbidden' });
			return;
		}

		next();
	}
}
