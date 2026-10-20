import {
	MAX_AGENT_FILE_SIZE_BYTES,
	MAX_AGENT_FILES_PER_UPLOAD,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES,
} from '@n8n/api-types';
import { Container } from '@n8n/di';

import { KnowledgeConfig } from '../knowledge.config';

const ENV_VARS = [
	'N8N_KNOWLEDGE_UPLOAD_MAX_FILE_SIZE_BYTES',
	'N8N_KNOWLEDGE_UPLOAD_MAX_FILES',
	'N8N_KNOWLEDGE_MAX_TOTAL_SIZE_BYTES',
] as const;

describe('KnowledgeConfig', () => {
	beforeEach(() => {
		Container.reset();
		for (const envVar of ENV_VARS) delete process.env[envVar];
	});

	afterEach(() => {
		for (const envVar of ENV_VARS) delete process.env[envVar];
	});

	// The editor validates uploads with the api-types constants until P1 serves the
	// limits through module settings, so the server defaults must stay equal to them.
	it('defaults equal the upload limits the editor enforces', () => {
		const config = new KnowledgeConfig();

		expect(config.uploadMaxFileSizeBytes).toBe(MAX_AGENT_FILE_SIZE_BYTES);
		expect(config.uploadMaxFiles).toBe(MAX_AGENT_FILES_PER_UPLOAD);
		expect(config.maxTotalSizeBytes).toBe(MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES);
	});

	it('reads the limits from the environment', () => {
		process.env.N8N_KNOWLEDGE_UPLOAD_MAX_FILE_SIZE_BYTES = '1048576';
		process.env.N8N_KNOWLEDGE_UPLOAD_MAX_FILES = '3';
		process.env.N8N_KNOWLEDGE_MAX_TOTAL_SIZE_BYTES = '104857600';

		const config = Container.get(KnowledgeConfig);

		expect(config.uploadMaxFileSizeBytes).toBe(1_048_576);
		expect(config.uploadMaxFiles).toBe(3);
		expect(config.maxTotalSizeBytes).toBe(104_857_600);
	});

	it('falls back to the default for a value that is not a positive integer', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		process.env.N8N_KNOWLEDGE_UPLOAD_MAX_FILES = '0';

		const config = Container.get(KnowledgeConfig);

		expect(config.uploadMaxFiles).toBe(MAX_AGENT_FILES_PER_UPLOAD);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('Invalid value for N8N_KNOWLEDGE_UPLOAD_MAX_FILES'),
		);
		warn.mockRestore();
	});
});
