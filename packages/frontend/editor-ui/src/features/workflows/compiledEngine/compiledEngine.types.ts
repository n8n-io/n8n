import type {
	CompiledEngineCompileResponse,
	CompiledEngineDiagnostic,
	CompiledEngineDiagnosticSeverity,
	CompiledNodeTier,
} from '@n8n/api-types';

export type CompileResult = CompiledEngineCompileResponse;
export type CompileDiagnostic = CompiledEngineDiagnostic;
export type CompileDiagnosticSeverity = CompiledEngineDiagnosticSeverity;
export type CompiledNodeRunMode = CompiledNodeTier;

export type CompileStatus =
	| { state: 'idle' }
	| { state: 'loading' }
	| { state: 'failed'; message: string }
	| { state: 'ok'; warnings: number }
	| { state: 'problems'; errors: number; warnings: number };
