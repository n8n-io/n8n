import {
	MAX_AGENT_FILE_SIZE_BYTES,
	MAX_AGENT_FILES_PER_UPLOAD,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES,
} from '@n8n/api-types';
import { Container } from '@n8n/di';

import { KnowledgeConfig } from '../knowledge.config';

describe('KnowledgeConfig', () => {
	beforeEach(() => {
		Container.reset();
	});

	afterEach(() => {
		delete process.env.N8N_KNOWLEDGE_MAX_FILE_SIZE_MB;
		delete process.env.N8N_KNOWLEDGE_MAX_FILES_PER_UPLOAD;
		delete process.env.N8N_KNOWLEDGE_MAX_TOTAL_SIZE_MB;
	});

	it('defaults to the limits the editor falls back to', () => {
		const config = Container.get(KnowledgeConfig);

		expect(config.maxFileSizeMb).toBe(25);
		expect(config.maxFileSizeBytes).toBe(MAX_AGENT_FILE_SIZE_BYTES);
		expect(config.maxFilesPerUpload).toBe(MAX_AGENT_FILES_PER_UPLOAD);
		expect(config.maxTotalSizeMb).toBe(1536);
		expect(config.maxTotalSizeBytes).toBe(MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES);
	});

	it('reads the limits from their environment variables', () => {
		process.env.N8N_KNOWLEDGE_MAX_FILE_SIZE_MB = '50';
		process.env.N8N_KNOWLEDGE_MAX_FILES_PER_UPLOAD = '3';
		process.env.N8N_KNOWLEDGE_MAX_TOTAL_SIZE_MB = '500';

		const config = Container.get(KnowledgeConfig);

		expect(config.maxFileSizeMb).toBe(50);
		expect(config.maxFileSizeBytes).toBe(50 * 1024 * 1024);
		expect(config.maxFilesPerUpload).toBe(3);
		expect(config.maxTotalSizeMb).toBe(500);
		expect(config.maxTotalSizeBytes).toBe(500 * 1024 * 1024);
	});

	it.each(['0', '-5', 'abc', '1.5'])(
		'keeps the default when a limit is not a positive integer (%s)',
		(value) => {
			process.env.N8N_KNOWLEDGE_MAX_FILE_SIZE_MB = value;
			process.env.N8N_KNOWLEDGE_MAX_FILES_PER_UPLOAD = value;
			process.env.N8N_KNOWLEDGE_MAX_TOTAL_SIZE_MB = value;

			const config = Container.get(KnowledgeConfig);

			expect(config.maxFileSizeMb).toBe(25);
			expect(config.maxFilesPerUpload).toBe(MAX_AGENT_FILES_PER_UPLOAD);
			expect(config.maxTotalSizeMb).toBe(1536);
		},
	);
});
