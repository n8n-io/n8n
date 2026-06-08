import { AgentsConfig } from '@n8n/config';
import { OperationalError } from 'n8n-workflow';

import type { AiService } from '@/services/ai.service';

import {
	AGENT_KNOWLEDGE_DAYTONA_API_KEY_REQUIRED_MESSAGE,
	AGENT_KNOWLEDGE_DAYTONA_VOLUME_ID_REQUIRED_MESSAGE,
	AGENT_KNOWLEDGE_DAYTONA_VOLUME_SUBPATH_PREFIX_INVALID_MESSAGE,
	AGENT_KNOWLEDGE_N8N_SANDBOX_UNSUPPORTED_MESSAGE,
	AgentKnowledgeSandboxConfigService,
} from '../agent-knowledge-sandbox-config.service';

function makeConfig(overrides: Partial<AgentsConfig> = {}): AgentsConfig {
	return Object.assign(new AgentsConfig(), {
		aiSandboxEnabled: true,
		aiSandboxProvider: 'n8n-sandbox',
		aiSandboxTimeout: 300_000,
		aiSandboxDaytonaVolumeId: '',
		aiSandboxDaytonaVolumeSubpathPrefix: 'agent-knowledge',
		daytonaApiUrl: '',
		daytonaApiKey: '',
		aiSandboxImage: 'daytonaio/sandbox:0.5.0',
		...overrides,
	});
}

function makeService(overrides: Partial<AgentsConfig> = {}, aiService?: AiService) {
	return new AgentKnowledgeSandboxConfigService(makeConfig(overrides), aiService);
}

describe('AgentKnowledgeSandboxConfigService', () => {
	it('returns disabled config when agent knowledge sandboxing is disabled', () => {
		const service = makeService({ aiSandboxEnabled: false, aiSandboxProvider: 'daytona' });

		expect(service.isAvailable()).toBe(false);
		expect(service.resolveConfig()).toEqual({
			enabled: false,
			provider: 'daytona',
			timeout: 300000,
		});
	});

	it('rejects n8n-sandbox for agent knowledge operations', () => {
		const service = makeService({ aiSandboxEnabled: true, aiSandboxProvider: 'n8n-sandbox' });

		expect(() => service.assertKnowledgeSandboxSupported()).toThrow(
			AGENT_KNOWLEDGE_N8N_SANDBOX_UNSUPPORTED_MESSAGE,
		);
		expect(() => service.resolveConfig()).toThrow(AGENT_KNOWLEDGE_N8N_SANDBOX_UNSUPPORTED_MESSAGE);
		expect(service.isAvailable()).toBe(false);
	});

	it('treats unknown providers as unsupported n8n-sandbox default', () => {
		const service = makeService({ aiSandboxProvider: 'gvisor' });
		expect(() => service.assertKnowledgeSandboxSupported()).toThrow(
			AGENT_KNOWLEDGE_N8N_SANDBOX_UNSUPPORTED_MESSAGE,
		);
	});

	it('requires a Daytona volume id in Daytona mode', () => {
		const service = makeService({
			aiSandboxProvider: 'daytona',
			daytonaApiKey: 'dtn_test',
			aiSandboxDaytonaVolumeId: '',
		});

		expect(() => service.resolveDaytonaVolumeConfig()).toThrow(
			AGENT_KNOWLEDGE_DAYTONA_VOLUME_ID_REQUIRED_MESSAGE,
		);
		expect(service.isAvailable()).toBe(false);
	});

	it('requires a Daytona API key in Daytona mode', () => {
		const service = makeService({
			aiSandboxProvider: 'daytona',
			daytonaApiKey: '',
			aiSandboxDaytonaVolumeId: 'vol-1',
		});

		expect(() => service.assertKnowledgeSandboxSupported()).toThrow(
			AGENT_KNOWLEDGE_DAYTONA_API_KEY_REQUIRED_MESSAGE,
		);
		expect(() => service.resolveConfig()).toThrow(AGENT_KNOWLEDGE_DAYTONA_API_KEY_REQUIRED_MESSAGE);
	});

	it('resolves Daytona sandbox config without per-corpus volumes', () => {
		const service = makeService({
			aiSandboxProvider: 'daytona',
			daytonaApiUrl: 'https://api.daytona.test',
			daytonaApiKey: ' dtn_test ',
			aiSandboxImage: ' daytonaio/sandbox:0.5.0 ',
			aiSandboxTimeout: 12345,
			aiSandboxDaytonaVolumeId: 'vol-1',
		});

		expect(service.isAvailable()).toBe(true);
		expect(service.resolveConfig()).toEqual({
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://api.daytona.test',
			daytonaApiKey: 'dtn_test',
			image: 'daytonaio/sandbox:0.5.0',
			timeout: 12345,
			name: undefined,
		});
	});

	it('does not report Daytona proxy mode as available for knowledge workspaces', () => {
		const aiService = {
			isProxyEnabled: jest.fn(() => true),
		} as unknown as AiService;
		const service = makeService(
			{
				aiSandboxProvider: 'daytona',
				daytonaApiKey: 'dtn_test',
				aiSandboxDaytonaVolumeId: 'vol-1',
			},
			aiService,
		);

		expect(service.isAvailable()).toBe(false);
		expect(service.isDaytonaProxyEnabled()).toBe(true);
	});

	it('resolves shared Daytona volume config with normalized prefix', () => {
		const service = makeService({
			aiSandboxProvider: 'daytona',
			daytonaApiKey: 'dtn_test',
			aiSandboxDaytonaVolumeId: ' vol-1 ',
			aiSandboxDaytonaVolumeSubpathPrefix: ' agent-knowledge/staging ',
		});

		expect(service.resolveDaytonaVolumeConfig()).toEqual({
			volumeId: 'vol-1',
			subpathPrefix: 'agent-knowledge/staging',
		});
	});

	it('uses the default volume subpath prefix when blank', () => {
		const service = makeService({
			aiSandboxProvider: 'daytona',
			daytonaApiKey: 'dtn_test',
			aiSandboxDaytonaVolumeId: 'vol-1',
			aiSandboxDaytonaVolumeSubpathPrefix: '   ',
		});

		expect(service.resolveDaytonaVolumeConfig().subpathPrefix).toBe('agent-knowledge');
	});

	it.each([
		'/root',
		'root/',
		'../root',
		'root/../other',
		'root//other',
		'root/./other',
		'root\\other',
	])('rejects invalid volume subpath prefix %s', (prefix) => {
		const service = makeService({
			aiSandboxProvider: 'daytona',
			daytonaApiKey: 'dtn_test',
			aiSandboxDaytonaVolumeId: 'vol-1',
			aiSandboxDaytonaVolumeSubpathPrefix: prefix,
		});

		expect(() => service.resolveDaytonaVolumeConfig()).toThrow(
			AGENT_KNOWLEDGE_DAYTONA_VOLUME_SUBPATH_PREFIX_INVALID_MESSAGE,
		);
	});

	it('rejects volume subpath prefixes with control characters', () => {
		const service = makeService({
			aiSandboxProvider: 'daytona',
			daytonaApiKey: 'dtn_test',
			aiSandboxDaytonaVolumeId: 'vol-1',
			aiSandboxDaytonaVolumeSubpathPrefix: `root/${String.fromCharCode(0)}`,
		});

		expect(() => service.resolveDaytonaVolumeConfig()).toThrow(OperationalError);
		expect(() => service.resolveDaytonaVolumeConfig()).toThrow(
			AGENT_KNOWLEDGE_DAYTONA_VOLUME_SUBPATH_PREFIX_INVALID_MESSAGE,
		);
	});
});
