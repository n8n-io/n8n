import { CREDENTIAL_DESCRIPTION_WRITE_GUIDANCE } from '@n8n/ai-utilities/credential-description';
import { credentialDescriptionSchema } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { z } from 'zod';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { trackAndReturnToolError } from './tool-error.utils';

const inputSchema = {
	credentialId: z.string().min(1).describe('Credential ID. Use list_credentials to find it.'),
	description: credentialDescriptionSchema.describe(
		CREDENTIAL_DESCRIPTION_WRITE_GUIDANCE + ' Pass null or blank text to clear it.',
	),
};

export const createUpdateCredentialDescriptionTool = (
	user: User,
	credentialsService: CredentialsService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'update_credential_description',
	config: {
		description:
			'Set, replace, or clear the description of a credential you can edit. Credential secrets and settings stay unchanged. ' +
			CREDENTIAL_DESCRIPTION_WRITE_GUIDANCE,
		inputSchema,
		annotations: {
			title: 'Update credential description',
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ credentialId, description }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'update_credential_description',
			parameters: { credentialId, descriptionLength: description?.length ?? 0 },
		};
		try {
			const credential = await credentialsService.updateDescription(
				user,
				credentialId,
				description,
			);
			const output = {
				id: credential.id,
				name: credential.name,
				type: credential.type,
				description: credential.description,
			};
			telemetryPayload.results = { success: true };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (error) {
			return trackAndReturnToolError(telemetry, telemetryPayload, error);
		}
	},
});
