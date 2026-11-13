import { COMPILED_ENGINE_TYPE } from '@n8n/api-types';

export { COMPILED_ENGINE_TYPE, type WorkflowEngineType as EngineType } from '@n8n/api-types';

/** The backend module that serves the compiled engine. */
export const COMPILED_ENGINE_MODULE = 'compiled-engine';

export function isCompiledEngineType(engineType: string | null | undefined): boolean {
	return engineType === COMPILED_ENGINE_TYPE;
}
