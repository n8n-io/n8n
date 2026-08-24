import { InstanceGitConnectionPublicDto, UpdateInstanceGitConnectionDto } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Get,
	GlobalScope,
	Licensed,
	PublicApiController,
	Put,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';

const tags = ['GitConnections'];

@PublicApiController('/instance-git-connection')
export class InstanceGitConnectionPublicController {
	constructor(private readonly moduleRegistry: ModuleRegistry) {}

	private async service() {
		if (!this.moduleRegistry.isActive('git-connections')) {
			throw new ServiceUnavailableError('Git connections module is not enabled');
		}
		const { InstanceGitConnectionService } = await import(
			'@/modules/git-connections.ee/instance-git-connection.service.js'
		);
		return Container.get(InstanceGitConnectionService);
	}

	@Get('/')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:read')
	@GlobalScope('gitConnection:read')
	@ApiSummary('Retrieve the instance Git connection')
	@ApiDescription(
		'Returns the singleton instance-level Git connection. Defaults to a disabled, empty connection when never configured. Secrets are never returned.',
	)
	@ApiTags(tags)
	@ApiResponse(200, InstanceGitConnectionPublicDto)
	async getInstanceGitConnection(
		_req: AuthenticatedRequest,
		_res: Response,
	): Promise<InstanceGitConnectionPublicDto> {
		return await (await this.service()).get();
	}

	@Put('/')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	@ApiKeyScope('gitConnection:update')
	@GlobalScope('gitConnection:update')
	@ApiSummary('Update the instance Git connection')
	@ApiDescription(
		'Updates only the supplied fields. Enabling requires a fully configured connection. Secrets are never returned.',
	)
	@ApiTags(tags)
	@ApiResponse(200, InstanceGitConnectionPublicDto)
	@ApiErrorResponse(400)
	async updateInstanceGitConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body input: UpdateInstanceGitConnectionDto,
	): Promise<InstanceGitConnectionPublicDto> {
		return await (await this.service()).update(input);
	}
}
