import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { mcpPackageSizeLimit, type PackageSizeLimit } from './base64-limits';
import { PackageImportConfig } from '../n8n-packages.config';

/**
 * The largest package that the MCP tools export or import with the settings of this instance.
 * Both tools use the same limit, so that an export always fits in an import request.
 */
export function instanceMcpPackageSizeLimit(): PackageSizeLimit {
	return mcpPackageSizeLimit(
		Container.get(PackageImportConfig).maxUncompressedBytes,
		Container.get(GlobalConfig).endpoints.payloadSizeMax,
	);
}
