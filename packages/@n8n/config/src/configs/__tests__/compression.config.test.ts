import { Container } from '@n8n/di';

import { GlobalConfig } from '../../index';

describe('CompressionNodeConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should use default values', () => {
		const { compressionNode } = Container.get(GlobalConfig);

		expect(compressionNode.maxDecompressedSize).toBe(2 * 1024 * 1024 * 1024);
		expect(compressionNode.maxZipEntries).toBe(5000);
	});

	it('should use custom max decompressed size from env', () => {
		vi.stubEnv('N8N_COMPRESSION_NODE_MAX_DECOMPRESSED_SIZE_BYTES', String(500 * 1024 * 1024));

		const { compressionNode } = Container.get(GlobalConfig);

		expect(compressionNode.maxDecompressedSize).toBe(500 * 1024 * 1024);
	});

	it('should use custom max zip entries from env', () => {
		vi.stubEnv('N8N_COMPRESSION_NODE_MAX_ZIP_ENTRIES', '5000');

		const { compressionNode } = Container.get(GlobalConfig);

		expect(compressionNode.maxZipEntries).toBe(5000);
	});
});
