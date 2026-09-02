import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

// We generate OpenAPI 3.0, which marks a nullable field with `nullable: true`. OpenAPI 3.1 removed
// that keyword, and `.openapi()` accepts only the fields both versions define, so it rejects
// `nullable` outright. This adds it back.
export function alsoNullable(metadata: ZodOpenAPIMetadata): ZodOpenAPIMetadata {
	return { ...metadata, nullable: true } as ZodOpenAPIMetadata;
}
