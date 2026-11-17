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
export {
	identityKey,
	localTimeIsUtc,
	processIdentity,
	setRunnerZone,
	setTargetNode,
	targetNode,
} from './convert/node-identity.ts';
export type { NodeIdentity } from './convert/node-identity.ts';
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
export { publicCredential } from './credentials/public.ts';
export type { PublicCredential } from './credentials/public.ts';
export { nodeDescriptionOf } from './node-compile/convert.ts';
export {
	evaluateCredentialFlags,
	evaluateDerivation,
	evaluateInSandbox,
	unprovenFlagNodes,
} from './node-compile/evaluate-node.ts';
export type { CredentialDerivation } from './node-compile/specialise.ts';
export type { NodeSources } from './node-compile/convert.ts';
export type { CredentialTypeInfo, CredentialTypeRegistry } from './credentials/types.ts';
export { runDataTableCall } from './services/data-table.ts';
export type { DataTableBackend, ServiceAnswer, ServiceCallEvent } from './services/data-table.ts';
export { BINARY_DATA_MAX_BYTES, runBinaryDataCall } from './services/binary-data.ts';
export type { BinaryDataBackend } from './services/binary-data.ts';
export { runDeduplicationCall } from './services/deduplication.ts';
export type { DeduplicationBackend } from './services/deduplication.ts';
export {
	ChatMemoryStore,
	CHAT_MEMORY_HOST_MARGIN_MS,
	CHAT_MEMORY_IDLE_MS,
} from './services/chat-memory.ts';
export type { ChatMemoryOptions } from './services/chat-memory.ts';
