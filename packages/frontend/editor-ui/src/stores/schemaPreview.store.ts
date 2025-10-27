import * as schemaPreviewApi from '@/api/schemaPreview';
import { createResultError, createResultOk, type Result } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { JSONSchema7 } from 'json-schema';
import type { PushPayload } from '@n8n/api-types';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { generateJsonSchema } from '@/utils/json-schema';

export const useSchemaPreviewStore = defineStore('schemaPreview', () => {
	// Type cast to avoid 'Type instantiation is excessively deep and possibly infinite'
	const schemaPreviews = reactive<Map<string, Result<JSONSchema7, Error>>>(new Map()) as Map<
		string,
		Result<JSONSchema7, Error>
	>;

	const rootStore = useRootStore();
	const telemetry = useTelemetry();
	const workflowsStore = useWorkflowsStore();

	function getSchemaPreviewKey({
		nodeType,
		version,
		operation,
		resource,
	}: schemaPreviewApi.GetSchemaPreviewOptions) {
		return `${nodeType}_${version}_${resource?.toString() ?? 'all'}_${operation?.toString() ?? 'all'}`;
	}

	async function getSchemaPreview(
		options: schemaPreviewApi.GetSchemaPreviewOptions,
	): Promise<Result<JSONSchema7, Error>> {
		const key = getSchemaPreviewKey(options);
		const cached = schemaPreviews.get(key);
		if (cached) return cached;

		try {
			const preview = await schemaPreviewApi.getSchemaPreview(rootStore.baseUrl, options);
			const result = createResultOk(preview);
			schemaPreviews.set(key, result);
			return result;
		} catch (error) {
			const result = createResultError(error);
			schemaPreviews.set(key, result);
			return result;
		}
	}

	async function trackSchemaPreviewExecution(pushEvent: PushPayload<'nodeExecuteAfterData'>) {
		if (schemaPreviews.size === 0 || pushEvent.data.executionStatus !== 'success') {
			return;
		}

		const node = workflowsStore.getNodeByName(pushEvent.nodeName);

		if (!node) return;

		const {
			id,
			type,
			typeVersion,
			parameters: { resource, operation },
		} = node;
		const result = schemaPreviews.get(
			getSchemaPreviewKey({ nodeType: type, version: typeVersion, resource, operation }),
		);

		if (!result?.ok) return;

		telemetry.track('User executed node with schema preview', {
			node_id: id,
			node_type: type,
			node_version: typeVersion,
			node_resource: resource,
			node_operation: operation,
			schema_preview: JSON.stringify(result.result),
			output_schema: JSON.stringify(generateJsonSchema(pushEvent.data.data?.main?.[0]?.[0]?.json)),
			workflow_id: workflowsStore.workflowId,
		});
	}

	return { getSchemaPreview, trackSchemaPreviewExecution };
});
