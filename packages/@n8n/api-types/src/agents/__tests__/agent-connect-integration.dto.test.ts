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

	it('rejects n8n_chat with a non-empty credentialId', () => {
		const result = AgentConnectIntegrationDto.safeParse({
			type: 'n8n_chat',
			credentialId: 'cred-1',
		});
		expect(result.success).toBe(false);
	});
});
