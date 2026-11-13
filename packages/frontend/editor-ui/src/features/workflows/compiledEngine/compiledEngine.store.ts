import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { fetchCompileResult } from './compiledEngine.api';
import { COMPILED_ENGINE_MODULE } from './compiledEngine.constants';
import type {
	CompileDiagnostic,
	CompileResult,
	CompileStatus,
	CompiledNodeRunMode,
} from './compiledEngine.types';

export function summarizeCompileResult(result: CompileResult): CompileStatus {
	const errors = result.diagnostics.filter((d) => d.severity === 'error').length;
	const warnings = result.diagnostics.filter((d) => d.severity === 'warning').length;
	if (result.ok && errors === 0) return { state: 'ok', warnings };
	// A failed compile always counts as at least one problem.
	return { state: 'problems', errors: Math.max(errors, 1), warnings };
}

/**
 * Holds the latest compile result of each workflow on the compiled engine.
 * The editor fetches a result after each save.
 */
export const useCompiledEngineStore = defineStore('compiledEngine', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const resultByWorkflowId = ref<Record<string, CompileResult>>({});
	const loadingByWorkflowId = ref<Record<string, boolean>>({});
	const errorByWorkflowId = ref<Record<string, string>>({});
	// Only the fetch that started last can write its outcome.
	const latestSequenceByWorkflowId: Record<string, number> = {};

	const isModuleActive = computed(
		() => settingsStore.isModuleActive(COMPILED_ENGINE_MODULE) === true,
	);

	async function fetchResult(workflowId: string): Promise<void> {
		const sequence = (latestSequenceByWorkflowId[workflowId] ?? 0) + 1;
		latestSequenceByWorkflowId[workflowId] = sequence;
		const isStale = () => latestSequenceByWorkflowId[workflowId] !== sequence;

		loadingByWorkflowId.value[workflowId] = true;
		try {
			const result = await fetchCompileResult(rootStore.restApiContext, workflowId);
			if (isStale()) return;
			resultByWorkflowId.value[workflowId] = result;
			delete errorByWorkflowId.value[workflowId];
		} catch (error) {
			if (isStale()) return;
			delete resultByWorkflowId.value[workflowId];
			errorByWorkflowId.value[workflowId] = error instanceof Error ? error.message : String(error);
		} finally {
			if (!isStale()) loadingByWorkflowId.value[workflowId] = false;
		}
	}

	function clear(workflowId: string) {
		// Make a fetch in flight stale, so that it does not write a result.
		latestSequenceByWorkflowId[workflowId] = (latestSequenceByWorkflowId[workflowId] ?? 0) + 1;
		delete resultByWorkflowId.value[workflowId];
		delete errorByWorkflowId.value[workflowId];
		delete loadingByWorkflowId.value[workflowId];
	}

	function getResult(workflowId: string): CompileResult | undefined {
		return resultByWorkflowId.value[workflowId];
	}

	function getStatus(workflowId: string): CompileStatus {
		if (loadingByWorkflowId.value[workflowId]) return { state: 'loading' };
		const error = errorByWorkflowId.value[workflowId];
		if (error !== undefined) return { state: 'failed', message: error };
		const result = resultByWorkflowId.value[workflowId];
		return result ? summarizeCompileResult(result) : { state: 'idle' };
	}

	function getNodeRunMode(workflowId: string, nodeName: string): CompiledNodeRunMode | undefined {
		return resultByWorkflowId.value[workflowId]?.nodes[nodeName];
	}

	function getNodeDiagnostics(workflowId: string, nodeName: string): CompileDiagnostic[] {
		return (resultByWorkflowId.value[workflowId]?.diagnostics ?? []).filter(
			(d) => d.node === nodeName,
		);
	}

	function hasNodeError(workflowId: string, nodeName: string): boolean {
		return getNodeDiagnostics(workflowId, nodeName).some((d) => d.severity === 'error');
	}

	return {
		isModuleActive,
		fetchResult,
		clear,
		getResult,
		getStatus,
		getNodeRunMode,
		getNodeDiagnostics,
		hasNodeError,
	};
});
