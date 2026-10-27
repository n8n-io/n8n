import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { Telemetry } from '@/telemetry';

import { createUpdateCredentialDescriptionTool } from '../tools/update-credential-description.tool';

describe('update_credential_description', () => {
	const user = mock<User>({ id: 'user-1' });
	const credentialsService = mock<CredentialsService>();
	const telemetry = mock<Telemetry>();
	const tool = createUpdateCredentialDescriptionTool(user, credentialsService, telemetry);

	beforeEach(() => vi.resetAllMocks());

	it.each(['Production reporting', null])(
		'writes %j and returns only metadata',
		async (description) => {
			const credential = {
				id: 'cred-1',
				name: 'Reporting',
				type: 'postgres',
				description,
				data: 'encrypted-secret',
			};
			credentialsService.updateDescription.mockResolvedValue(credential);
			const result = await tool.handler({ credentialId: 'cred-1', description }, mock());
			expect(credentialsService.updateDescription).toHaveBeenCalledWith(
				user,
				'cred-1',
				description,
			);
			expect(result.structuredContent).toEqual({
				id: 'cred-1',
				name: 'Reporting',
				type: 'postgres',
				description,
			});
			expect(result.content).toEqual([
				{ type: 'text', text: JSON.stringify(result.structuredContent) },
			]);
			expect(JSON.stringify(result)).not.toContain('encrypted-secret');
			expect(JSON.stringify(telemetry.track.mock.calls)).not.toContain('Production reporting');
		},
	);

	it('returns a tool error when the update fails', async () => {
		credentialsService.updateDescription.mockRejectedValue(
			new Error('Credential not found or access denied'),
		);
		const result = await tool.handler({ credentialId: 'cred-1', description: 'New' }, mock());
		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({ error: 'Credential not found or access denied' });
	});

	it('requires a description so an omitted field cannot clear the stored value', () => {
		const schema = z.object(tool.config.inputSchema!);
		expect(schema.safeParse({ credentialId: 'cred-1' }).success).toBe(false);
	});
});
