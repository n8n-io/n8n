import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { mcpPackageSizeLimit, type PackageSizeLimit } from './base64-limits';
import { PackageImportConfig } from '../n8n-packages.config';

/**
 * The largest package that the MCP tools export or import with the settings of this instance.
 * Both tools use the same limit, and the export also checks each file of the package against the
 * limits of the import, so an export fits in an import request to this instance. Another instance
 * can have lower limits and reject the package.
 */
export function instanceMcpPackageSizeLimit(): PackageSizeLimit {
	return mcpPackageSizeLimit(
		Container.get(PackageImportConfig).maxUncompressedBytes,
		Container.get(GlobalConfig).endpoints.payloadSizeMax,
	);
}
