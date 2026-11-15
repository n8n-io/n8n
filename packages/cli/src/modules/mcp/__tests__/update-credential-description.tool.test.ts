import type { OperationContext, User } from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { Telemetry } from '@/telemetry';

import { createUpdateCredentialDescriptionTool } from '../tools/update-credential-description.tool';

describe('update credential description MCP tool', () => {
	const user = mock<User>({ id: 'user-1' });
	const service = mock<CredentialsService>();
	const telemetry = mock<Telemetry>();
	beforeEach(() => vi.resetAllMocks());

	it.each(['  Reporting  ', '', null])(
		'updates or clears the description: %s',
		async (description) => {
			const tool = createUpdateCredentialDescriptionTool(user, service, telemetry);
			const result = await tool.handler({ credentialId: 'cred-1', description }, {} as never);
			expect(service.updateDescription).toHaveBeenCalledWith(
				user,
				'cred-1',
				description?.trim() || null,
				{},
			);
			expect(result.structuredContent).toEqual({ success: true });
			expect(result.content).toEqual([{ type: 'text', text: JSON.stringify({ success: true }) }]);
			expect(tool.config.annotations?.readOnlyHint).toBe(false);
			expect(tool.config.annotations?.destructiveHint).toBe(true);
			expect(telemetry.track.mock.calls[0][1]).toMatchObject({
				parameters: { credentialId: 'cred-1' },
			});
			expect(JSON.stringify(telemetry.track.mock.calls)).not.toContain('Reporting');
		},
	);

	it('passes the operation context to the service', async () => {
		const ctx: OperationContext = { security: mock<SecurityContext>({ subIdentityId: 'login-1' }) };
		const tool = createUpdateCredentialDescriptionTool(user, service, telemetry, ctx);

		await tool.handler({ credentialId: 'cred-1', description: 'Reporting' }, {} as never);

		expect(service.updateDescription.mock.calls[0][3]).toBe(ctx);
	});

	it('rejects invalid input before calling the service', async () => {
		const tool = createUpdateCredentialDescriptionTool(user, service, telemetry);
		const result = await tool.handler(
			{ credentialId: 'cred-1', description: 'x'.repeat(513) },
			{} as never,
		);
		expect(result.isError).toBe(true);
		expect(result.structuredContent).toMatchObject({ success: false });
		expect(service.updateDescription).not.toHaveBeenCalled();
	});

	it('returns an error when the service rejects the edit', async () => {
		service.updateDescription.mockRejectedValue(new Error('No access'));
		const result = await createUpdateCredentialDescriptionTool(user, service, telemetry).handler(
			{ credentialId: 'cred-1', description: 'Reporting' },
			{} as never,
		);
		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({ success: false, error: 'No access' });
	});
});
