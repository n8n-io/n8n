import { AgentIntegrationConfigSchema } from '../agent-integration.schema';
import { AgentConnectIntegrationDto } from '../dto';

describe('AgentConnectIntegrationDto', () => {
	it('accepts n8n_chat with an empty credentialId', () => {
		const result = AgentConnectIntegrationDto.safeParse({ type: 'n8n_chat', credentialId: '' });
		expect(result.success).toBe(true);
	});

	it('rejects slack with an empty credentialId', () => {
		const result = AgentConnectIntegrationDto.safeParse({ type: 'slack', credentialId: '' });
		expect(result.success).toBe(false);
	});

	it('accepts slack with a real credentialId', () => {
		const result = AgentConnectIntegrationDto.safeParse({ type: 'slack', credentialId: 'cred-1' });
		expect(result.success).toBe(true);
	});

	it('leaves the n8n Chat credential to its config schema', () => {
		const entry = { type: 'n8n_chat', credentialId: 'cred-1' };
		expect(AgentConnectIntegrationDto.safeParse(entry).success).toBe(true);
		expect(AgentIntegrationConfigSchema.safeParse(entry).success).toBe(false);
	});

	it('accepts webhook with an empty credentialId', () => {
		const result = AgentConnectIntegrationDto.safeParse({ type: 'webhook', credentialId: '' });
		expect(result.success).toBe(true);
	});

	it('accepts webhook that replaces an entry without a credential', () => {
		const result = AgentConnectIntegrationDto.safeParse({
			type: 'webhook',
			credentialId: 'cred-1',
			replaces: { credentialId: '' },
		});
		expect(result.success).toBe(true);
	});

	it('rejects slack that replaces an entry without a credential', () => {
		const result = AgentConnectIntegrationDto.safeParse({
			type: 'slack',
			credentialId: 'cred-1',
			replaces: { credentialId: '' },
		});
		expect(result.success).toBe(false);
	});
});
