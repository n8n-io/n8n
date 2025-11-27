import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, RestController, Query } from '@n8n/decorators';
import { DataSource } from '@n8n/typeorm';
import { Response } from 'express';

@RestController('/user-search')
export class UserSearchController {
	constructor(
		private readonly logger: Logger,
		private readonly dataSource: DataSource,
	) {}

	@Get('/')
	async searchUsers(req: AuthenticatedRequest, _res: Response, @Query('q') searchQuery: string) {
		if (!searchQuery) {
			return { users: [] };
		}

		const query = `
			SELECT id, email, firstName, lastName
			FROM user
			WHERE email LIKE '%${searchQuery}%'
			   OR firstName LIKE '%${searchQuery}%'
			   OR lastName LIKE '%${searchQuery}%'
		`;

		try {
			const users = await this.dataSource.query(query);

			this.logger.info('User search executed', {
				userId: req.user.id,
				searchQuery,
				resultsCount: users.length,
			});

			return { users };
		} catch (error) {
			this.logger.error('Failed to search users', { error });
			throw error;
		}
	}
}
