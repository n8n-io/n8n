/**
 * The library entry of `@n8n/workflow-lang` for n8n (the `compiled-engine`
 * backend module). It gives the converter, the compiler and the credentials
 * builder. The workflow SDK that converted sources import is `src/sdk`.
 */
export { convertWorkflow, formatConvertDiagnostic } from './convert/index.ts';
export type { ConvertOptions } from './convert/index.ts';
export type { ConvertDiagnostic, ConvertResult, N8nWorkflow } from './convert/types.ts';
export { credentialKey, credentialSlots } from './convert/naming.ts';
export { COMPILER_VERSION, compile, decodeModule } from './compiler/index.ts';
export type { CompileOptions, CompileResult, Manifest } from './compiler/index.ts';
export { buildCredentialsFile, CredentialsToolError } from './credentials/build.ts';
export type {
	CredentialsFile,
	CredentialsFileEntry,
	ExportedCredential,
	Slot,
	SlotReport,
} from './credentials/build.ts';
export { describeCredentialType, parentTypes, registryOf } from './credentials/types.ts';
export type { CredentialTypeInfo, CredentialTypeRegistry } from './credentials/types.ts';
export { runDataTableCall } from './services/data-table.ts';
export type { DataTableBackend, ServiceAnswer, ServiceCallEvent } from './services/data-table.ts';
export { runDeduplicationCall } from './services/deduplication.ts';
export type { DeduplicationBackend } from './services/deduplication.ts';
