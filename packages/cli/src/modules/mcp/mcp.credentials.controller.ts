import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Patch, RestController } from '@n8n/decorators';
import { BadRequestError, UserError } from '@n8n/errors';
import type { Response } from 'express';

import { McpCredentialBrokerService } from './credential-broker/mcp-credential-broker.service';
import { UpdateCredentialsAvailabilityDto } from './dto/update-credentials-availability.dto';

/**
 * Per-credential MCP availability endpoints, mirroring the per-workflow ones
 * on `McpSettingsController` (`/mcp/workflows`).
 *
 * No scope decorators: these routes carry no credential in their URL, so
 * `McpCredentialBrokerService` enforces `credential:update` per credential.
 */
@RestController('/mcp/credentials')
export class McpCredentialsController {
	constructor(private readonly brokerService: McpCredentialBrokerService) {}

	/** Credentials the user can see whose type can be made available in MCP. */
	@Get('/')
	async getCredentials(req: AuthenticatedRequest) {
		const data = await this.brokerService.listCredentials(req.user);
		return { count: data.length, data };
	}

	/** Credential types that can be made available in MCP. */
	@Get('/eligible-types')
	async getEligibleTypes() {
		return { types: await this.brokerService.getEligibleCredentialTypes() };
	}

	@Patch('/toggle-access')
	async toggleCredentialsMCPAccess(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: UpdateCredentialsAvailabilityDto,
	) {
		try {
			return await this.brokerService.setAvailability(
				req.user,
				dto.credentialIds,
				dto.availableInMCP,
			);
		} catch (error) {
			if (error instanceof UserError) throw new BadRequestError(error.message);
			throw error;
		}
	}
}
