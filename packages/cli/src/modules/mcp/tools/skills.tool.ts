import type { User } from '@n8n/db';
import z from 'zod';

import type { Telemetry } from '@/telemetry';

import {
	MCP_LIST_SKILLS_TOOL_NAME,
	MCP_LOAD_SKILL_TOOL_NAME,
	USER_CALLED_MCP_TOOL_EVENT,
} from '../mcp.constants';
import type { ToolDefinition } from '../mcp.types';

/**
 * POC: skills served over MCP tools instead of native client skill files. The list is
 * hardcoded; the goal is to measure whether clients load a skill when a task needs it,
 * including tasks that have nothing to do with building n8n workflows.
 */
type Skill = {
	name: string;
	description: string;
	instructions: string;
};

const SKILLS: readonly Skill[] = [
	{
		name: 'deploy test n8n instance',
		description: 'Use when the user wants to deploy test n8n instance.',
		instructions: `# Deploy test n8n instance

Deploy a branch of the n8n repository (n8n-io/n8n on GitHub) to a temporary test instance. An internal Slack app called Nathan runs the deployment.

## Requirements

- A connected Slack MCP server that can send messages as the user. If no Slack MCP server is connected, tell the user and stop.
- The name of the branch to deploy. If the user did not name one, use the current git branch when you can find it. Otherwise, ask the user.
- The branch must be pushed to GitHub. Nathan builds the Docker image from GitHub, not from local changes.

## Steps

1. Find the direct message conversation with the Nathan app in Slack. Nathan is an app, so a search for Slack users does not find it. Search Slack messages for "nathan deploy" instead, and use the channel ID of the direct message conversation in the results.
2. Send this message to Nathan, with \`<branch>\` replaced by the branch name:

   \`/nathan deploy <branch> --ai\`

   The \`--ai\` flag enables n8n Assistant on the instance. Do not add other text to the message.
3. Tell the user that the deployment started. Nathan replies at once with "Deploying <branch> to instance <instance-name>" and a link to the Docker image build.
4. After a few minutes, Nathan sends a message that starts with "Instance is now ready." This message contains the instance URL, the login email, and the password.
   - If you can read Slack messages, read the direct message conversation with Nathan and give the user the URL, email, and password.
   - If you cannot read Slack messages, tell the user to look for the message from Nathan.

## Notes

- To deploy new commits to the same instance, send the same message again.
- To deploy to a separate new instance, add an instance name after the branch: \`/nathan deploy <branch> <instance-name> --ai\`.
- If Nathan replies "Could not find docker image", send \`/nathan deploy ghcr.io/n8n-io/n8n:branch-<branch> --ai\`. In the image tag, replace each "/" in the branch name with "-".
`,
	},
];

const findSkill = (name: string) =>
	SKILLS.find((skill) => skill.name.toLowerCase() === name.trim().toLowerCase());

const listSkillsOutputSchema = {
	skills: z
		.array(
			z.object({
				name: z.string().describe('The skill name. Pass it to load_skill.'),
				description: z.string().describe('When to use the skill.'),
			}),
		)
		.describe('Every skill the user has added.'),
} satisfies z.ZodRawShape;

export const createListSkillsTool = (
	user: User,
	telemetry: Telemetry,
): ToolDefinition<z.ZodRawShape> => ({
	name: MCP_LIST_SKILLS_TOOL_NAME,
	config: {
		description: `Lists the skills the user has added: instructions for tasks the user does often. Skills are not limited to n8n workflows. Call this at the beginning of every conversation, before your first response, and call ${MCP_LOAD_SKILL_TOOL_NAME} for each skill whose description matches the task. A matching skill takes precedence over your memory and your own approach.`,
		inputSchema: {},
		outputSchema: listSkillsOutputSchema,
		annotations: {
			title: 'List Skills',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async () => {
		const skills = SKILLS.map(({ name, description }) => ({ name, description }));

		telemetry.track(USER_CALLED_MCP_TOOL_EVENT, {
			user_id: user.id,
			tool_name: MCP_LIST_SKILLS_TOOL_NAME,
			parameters: {},
			results: { success: true, data: { count: skills.length } },
		});

		return {
			content: [{ type: 'text', text: JSON.stringify({ skills }) }],
			structuredContent: { skills },
		};
	},
});

const loadSkillInputSchema = {
	name: z.string().min(1).describe('The skill name, as returned by list_skills.'),
} satisfies z.ZodRawShape;

export const createLoadSkillTool = (
	user: User,
	telemetry: Telemetry,
): ToolDefinition<typeof loadSkillInputSchema> => ({
	name: MCP_LOAD_SKILL_TOOL_NAME,
	config: {
		description: `Returns the full instructions of one skill. Get the skill names from ${MCP_LIST_SKILLS_TOOL_NAME}. Follow the returned instructions to do the task.`,
		inputSchema: loadSkillInputSchema,
		annotations: {
			title: 'Load Skill',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ name }: { name: string }) => {
		const skill = findSkill(name);

		telemetry.track(USER_CALLED_MCP_TOOL_EVENT, {
			user_id: user.id,
			tool_name: MCP_LOAD_SKILL_TOOL_NAME,
			parameters: { name },
			results: skill
				? { success: true, data: { name: skill.name } }
				: { success: false, error: 'Skill not found' },
		});

		if (!skill) {
			const available = SKILLS.map((s) => `"${s.name}"`).join(', ');
			return {
				content: [
					{
						type: 'text',
						text: `No skill is named "${name}". Available skills: ${available}.`,
					},
				],
				isError: true,
			};
		}

		return {
			content: [{ type: 'text', text: skill.instructions }],
		};
	},
});
