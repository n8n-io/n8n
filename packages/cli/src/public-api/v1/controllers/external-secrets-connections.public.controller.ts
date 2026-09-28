import {
	ExternalSecretsConnectionListPublicDto,
	ExternalSecretsConnectionPublicDto,
	ListExternalSecretsConnectionsQueryDto,
	ReloadExternalSecretsConnectionPublicDto,
	TestExternalSecretsConnectionPublicDto,
	providerKeyParamSchema,
	type ExternalSecretsConnectionPublic,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest, SecretsProviderConnection } from '@n8n/db';
import {
	ApiDescription,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Get,
	Licensed,
	Param,
	Post,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { SecretsProvidersConnectionsService } from '@/modules/external-secrets.ee/secrets-providers-connections.service.ee';
import {
	paginateArray,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';

const tags = ['External Secrets'];

function toConnectionPublic(
	connection: SecretsProviderConnection,
	service: SecretsProvidersConnectionsService,
): ExternalSecretsConnectionPublic {
	return service.toPublicConnectionListItem(connection);
}

@PublicApiController('/external-secrets/connections')
export class ExternalSecretsConnectionsPublicController {
	constructor(private readonly connectionsService: SecretsProvidersConnectionsService) {}

	@Get('/')
	@Licensed(LICENSE_FEATURES.EXTERNAL_SECRETS)
	@ApiKeyScope('externalSecretsProvider:list')
	@ApiSummary('List external secrets connections')
	@ApiDescription('Retrieve external secrets provider connections from your instance.')
	@ApiTags(tags)
	@ApiResponse(200, ExternalSecretsConnectionListPublicDto)
	async listConnections(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListExternalSecretsConnectionsQueryDto,
	): Promise<ExternalSecretsConnectionListPublicDto> {
		const { offset, limit } = resolveOffsetPagination(query);

		const connections = await this.connectionsService.listConnections();
		const { data, nextCursor } = paginateArray(connections, { offset, limit });

		return { data: data.map((c) => toConnectionPublic(c, this.connectionsService)), nextCursor };
	}

	@Get('/:providerKey')
	@Licensed(LICENSE_FEATURES.EXTERNAL_SECRETS)
	@ApiKeyScope('externalSecretsProvider:read')
	@ApiSummary('Get an external secrets connection')
	@ApiDescription('Retrieve a single external secrets provider connection by its key.')
	@ApiTags(tags)
	@ApiResponse(200, ExternalSecretsConnectionPublicDto)
	async getConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey', providerKeyParamSchema) providerKey: string,
	): Promise<ExternalSecretsConnectionPublic> {
		const connection = await this.connectionsService.getConnection(providerKey);
		return toConnectionPublic(connection, this.connectionsService);
	}

	@Post('/:providerKey/test')
	@Licensed(LICENSE_FEATURES.EXTERNAL_SECRETS)
	@ApiKeyScope('externalSecretsProvider:update')
	@ApiSummary('Test an external secrets connection')
	@ApiDescription('Test the connection to an external secrets provider.')
	@ApiTags(tags)
	@ApiResponse(200, TestExternalSecretsConnectionPublicDto)
	async testConnection(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey', providerKeyParamSchema) providerKey: string,
	) {
		return await this.connectionsService.testConnection(
			providerKey,
			req.user.id,
			req.user.role?.slug,
		);
	}

	@Post('/:providerKey/reload')
	@Licensed(LICENSE_FEATURES.EXTERNAL_SECRETS)
	@ApiKeyScope('externalSecretsProvider:sync')
	@ApiSummary('Reload an external secrets connection')
	@ApiDescription('Trigger a secrets refresh from the external secrets provider.')
	@ApiTags(tags)
	@ApiResponse(200, ReloadExternalSecretsConnectionPublicDto)
	async reloadConnection(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey', providerKeyParamSchema) providerKey: string,
	) {
		return await this.connectionsService.reloadConnectionSecrets(
			providerKey,
			req.user.id,
			req.user.role?.slug,
		);
	}
}
