import { z } from 'zod';

import { Z } from '../../zod-class';

/** 5 MB: larger than public API descriptions such as GitHub's, which is about 4 MB as YAML. */
const MAX_DOCUMENT_LENGTH = 5 * 1024 * 1024;

/** An OpenAPI 3 document as JSON or YAML text. The server publishes one action for each operation. */
export class ImportOpenApiDto extends Z.class({
	document: z.string().min(1).max(MAX_DOCUMENT_LENGTH),
}) {}
