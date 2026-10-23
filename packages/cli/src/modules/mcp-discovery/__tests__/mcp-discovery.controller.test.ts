// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import { McpDiscoveryVisitRequestDto } from '../mcp-discovery.dto';
import type { AuthenticatedRequest, User } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { McpDiscoveryEnrollmentService } from '../enrollment.service';
import { McpDiscoveryController } from '../mcp-discovery.controller';

it('passes the authenticated user and Cloud targeting data to enrollment', async () => {
	const enrollment = mock<McpDiscoveryEnrollmentService>();
	const controller = new McpDiscoveryController(enrollment);
	const user = mock<User>({ id: 'owner' });
	const state = { status: 'unknown' } as const;
	enrollment.visit.mockResolvedValueOnce(state);
	expect(
		await controller.visit(
			mock<AuthenticatedRequest>({ user }),
			mock<Response>(),
			new McpDiscoveryVisitRequestDto({ pickedClaude: true, isTrial: true }),
		),
	).toEqual(state);
	expect(enrollment.visit).toHaveBeenCalledWith(user, { pickedClaude: true, isTrial: true });
});
// EOF Experiment cleanup
