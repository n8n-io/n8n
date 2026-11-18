import { Tool } from '@n8n/agents';
import {
	instanceAiApprovalResumeSchema,
	instanceAiConfirmationSeveritySchema,
	publishJudgeOnUnavailableSchema,
	publishJudgeTypeSchema,
} from '@n8n/api-types';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';
import { DOMAIN_TOOL_IDS } from './tool-ids';

const projectIdField = z
	.string()
	.min(1)
	.optional()
	.describe(
		'Id of the team project the judge applies to. Omit it for the instance judge, which reviews every project.',
	);

const projectNameField = z
	.string()
	.min(1)
	.optional()
	.describe('Name of that project, shown to the user for approval. Pass it with `projectId`.');

const getAction = z.object({
	action: z.literal('get').describe('Read the judge of the instance, or of one project'),
	projectId: projectIdField,
});

const setAction = z.object({
	action: z
		.literal('set')
		.describe(
			'Make a published workflow or Agent the judge of the instance, or of one project. Replaces the current judge of that scope.',
		),
	projectId: projectIdField,
	projectName: projectNameField,
	judgeType: publishJudgeTypeSchema.describe('Whether the judge is a workflow or an Agent'),
	judgeId: z.string().min(1).describe('Id of the judge workflow or of the judge Agent'),
	judgeName: z.string().min(1).describe('Name of the judge, shown to the user for approval'),
	onUnavailable: publishJudgeOnUnavailableSchema
		.default('block')
		.describe(
			'What a publish does when the judge fails, times out or is not published: `block` refuses it, `allow` lets it through.',
		),
	reviewAgents: z
		.boolean()
		.default(false)
		.describe('Whether the judge also reviews Agents when they are published'),
});

const removeAction = z.object({
	action: z.literal('remove').describe('Remove the judge of the instance, or of one project'),
	projectId: projectIdField,
	projectName: projectNameField,
});

const allActions = [getAction, setAction, removeAction] as const;

type FullInput = z.infer<z.ZodDiscriminatedUnion<'action', typeof allActions>>;

const confirmationSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
});

const scopeLabel = ({ projectId, projectName }: { projectId?: string; projectName?: string }) =>
	projectId ? `project "${projectName ?? projectId}"` : 'the whole instance';

function approvalMessage(input: Extract<FullInput, { action: 'set' | 'remove' }>) {
	if (input.action === 'remove') return `Remove the publish judge of ${scopeLabel(input)}`;

	return `Let ${input.judgeType} "${input.judgeName}" review every publish in ${scopeLabel(input)}`;
}

export function createPublishJudgeTool(context: InstanceAiContext) {
	return new Tool(DOMAIN_TOOL_IDS.PUBLISH_JUDGE)
		.description(
			'Read, set or remove a publish judge: the workflow or Agent that reviews each new version before n8n publishes it. ' +
				'One judge can exist for the instance and one for each project, and a publish needs every judge that applies to allow it. ' +
				'A judge is an instance setting, so this tool works for any project, not only the project of this conversation. ' +
				'Only an instance admin can set or remove a judge. Load the `publish-judge` skill before you build or set one.',
		)
		.input(sanitizeInputSchema(z.discriminatedUnion('action', [...allActions])))
		.suspend(confirmationSuspendSchema)
		.resume(instanceAiApprovalResumeSchema)
		.handler(async (input: FullInput, ctx) => {
			const service = context.publishJudgeService;
			if (!service) return { error: 'Publish judges are not available on this instance.' };

			const projectId = input.projectId ?? null;

			try {
				if (input.action === 'get') return { judge: await service.get(projectId) };

				const { resumeData } = ctx;
				if (resumeData === undefined || resumeData === null) {
					return await ctx.suspend({
						requestId: nanoid(),
						message: approvalMessage(input),
						severity: 'warning' as const,
					});
				}
				if (!resumeData.approved) return { denied: true, reason: 'User denied the action' };

				if (input.action === 'remove') return { judge: await service.set(projectId, null) };

				const { judgeType, judgeId, onUnavailable, reviewAgents } = input;
				return {
					judge: await service.set(projectId, { judgeType, judgeId, onUnavailable, reviewAgents }),
				};
			} catch (error) {
				return { error: getErrorMessage(error) };
			}
		})
		.build();
}
