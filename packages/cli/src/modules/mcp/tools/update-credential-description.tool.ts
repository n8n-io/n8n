import {
	SHARED_BUILDER_TOOL_NAMES,
	updateCredentialDescriptionSchema,
	UPDATE_CREDENTIAL_DESCRIPTION_TOOL_DESCRIPTION,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { z } from 'zod';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { trackAndReturnToolError } from './tool-error.utils';

export const createUpdateCredentialDescriptionTool = (
	user: User,
	credentialsService: CredentialsService,
	telemetry: Telemetry,
): ToolDefinition<typeof updateCredentialDescriptionSchema.shape> => ({
	name: SHARED_BUILDER_TOOL_NAMES.UPDATE_CREDENTIAL_DESCRIPTION,
	config: {
		description: UPDATE_CREDENTIAL_DESCRIPTION_TOOL_DESCRIPTION,
		inputSchema: updateCredentialDescriptionSchema.shape,
		outputSchema: { success: z.boolean(), error: z.string().optional() },
		annotations: {
			title: 'Update credential description',
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async (input: z.infer<typeof updateCredentialDescriptionSchema>) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: SHARED_BUILDER_TOOL_NAMES.UPDATE_CREDENTIAL_DESCRIPTION,
			parameters: { credentialId: input.credentialId },
		};
		try {
			const { credentialId, description } = updateCredentialDescriptionSchema.parse(input);
			await credentialsService.updateDescription(user, credentialId, description);
			const output = { success: true };
			telemetryPayload.results = { success: true };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (error) {
			return trackAndReturnToolError(telemetry, telemetryPayload, error, (message) => ({
				success: false,
				error: message,
			}));
		}
	},
});
