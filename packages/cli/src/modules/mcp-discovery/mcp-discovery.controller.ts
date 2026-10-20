// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import { McpDiscoveryVisitRequestDto } from './mcp-discovery.dto';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, RestController } from '@n8n/decorators';
import { Response } from 'express';

import { McpDiscoveryEnrollmentService } from './enrollment.service';

@RestController('/me/mcp-discovery')
export class McpDiscoveryController {
	constructor(private readonly enrollment: McpDiscoveryEnrollmentService) {}

	// This route reads or changes only the authenticated user's experiment state.
	@Post('/visit')
	async visit(req: AuthenticatedRequest, _: Response, @Body payload: McpDiscoveryVisitRequestDto) {
		return await this.enrollment.visit(req.user, payload);
	}
}
// EOF Experiment cleanup
