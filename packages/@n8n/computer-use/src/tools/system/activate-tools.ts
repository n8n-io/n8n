import { z } from 'zod';

import type { ToolGroup } from '../../config';
import { TOOL_GROUP_DEFINITIONS, NON_CONFIGURABLE_TOOL_GROUPS } from '../../config';
import type { AffectedResource, ToolDefinition } from '../types';

// All tool groups that can be activated (excludes `system` itself)
const activatableGroups = (Object.keys(TOOL_GROUP_DEFINITIONS) as ToolGroup[]).filter(
	(g) => !NON_CONFIGURABLE_TOOL_GROUPS.has(g),
) as [ToolGroup, ...ToolGroup[]];

const inputSchema = z.object({
	toolGroups: z
		.array(z.enum(activatableGroups))
		.min(1)
		.describe('Tool groups to activate. Only groups that are currently disabled will be changed.'),
});

export const activateToolsTool: ToolDefinition<typeof inputSchema> = {
	name: 'activate_tools',
	description:
		'Activate one or more tool groups that are currently disabled. ' +
		'For each requested group that is set to "deny", its permission mode is changed to "ask" and ' +
		'the updated tool list is uploaded to the n8n instance. ' +
		'Groups that are already active are left unchanged. ' +
		'After activation, the newly enabled tools are available from the next conversation turn.',
	inputSchema,
	annotations: { readOnlyHint: false },

	getAffectedResources({ toolGroups }, context): AffectedResource[] {
		return toolGroups
			.filter((group) => context.session?.getGroupMode(group) === 'deny')
			.map((group) => ({
				toolGroup: 'system' as ToolGroup,
				resource: `activate:${group}`,
				description: `Activate tool group: ${group}`,
			}));
	},

	async execute({ toolGroups }, context) {
		await context.session?.activateToolGroups(toolGroups);
		return {
			content: [
				{
					type: 'text' as const,
					text:
						`Tool groups activated: ${toolGroups.join(', ')}. ` +
						`The newly enabled tools will be available from the next conversation turn. ` +
						`Inform the user and end your current response.`,
				},
			],
		};
	},
};
