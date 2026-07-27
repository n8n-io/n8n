import { Config, Env } from '../decorators';

@Config
export class CompressionNodeConfig {
	/** Maximum total decompressed output size in bytes. Default: 2 GiB. */
	@Env('N8N_COMPRESSION_NODE_MAX_DECOMPRESSED_SIZE_BYTES')
	maxDecompressedSize: number = 2 * 1024 * 1024 * 1024;

	/** Maximum number of entries allowed in a ZIP archive. Default: 5000. */
	@Env('N8N_COMPRESSION_NODE_MAX_ZIP_ENTRIES')
	maxZipEntries: number = 5000;
}
