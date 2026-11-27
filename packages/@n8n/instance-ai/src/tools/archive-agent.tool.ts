import { Tool } from '@n8n/agents';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiAgentArchiveService } from '../types';
import { DOMAIN_TOOL_IDS } from './tool-ids';

export function createArchiveAgentTool(service: InstanceAiAgentArchiveService) {
	return new Tool(DOMAIN_TOOL_IDS.ARCHIVE_AGENT)
		.description(
			'Archive an existing n8n Agent in this conversation’s project after the user confirms. ' +
				'Archiving unpublishes the Agent and keeps its data. Use agent-context to find the Agent by name. ' +
				'If more than one Agent matches, ask which one to archive.',
		)
		.input(z.object({ agentId: z.string().min(1).describe('ID of the Agent to archive') }))
		.suspend(
			z.object({
				requestId: z.string(),
				message: z.string(),
				resourceName: z.string(),
				approvalDetails: z.object({
					action: z.literal('archive-agent'),
					name: z.string(),
					id: z.string(),
				}),
				severity: z.literal('destructive'),
			}),
		)
		.resume(z.object({ approved: z.boolean() }))
		.handler(async ({ agentId }, { resumeData, suspend }) => {
			if (!resumeData) {
				const { name } = await service.preview(agentId);
				return await suspend({
					requestId: nanoid(),
					message: `Archive Agent ${name} (ID: ${agentId})? This unpublishes the Agent and keeps its data.`,
					resourceName: name,
					approvalDetails: { action: 'archive-agent', name, id: agentId },
					severity: 'destructive',
				});
			}
			if (!resumeData.approved) {
				return { success: false, denied: true, reason: 'User denied the action' };
			}
			return { success: true, agentId, ...(await service.archive(agentId)) };
		})
		.build();
}
