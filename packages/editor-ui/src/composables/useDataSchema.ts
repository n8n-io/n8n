import type { Optional, Primitives, Schema, INodeUi } from '@/Interface';
import {
	type ITaskDataConnections,
	type IDataObject,
	type INodeExecutionData,
	NodeConnectionType,
} from 'n8n-workflow';
import { merge } from 'lodash-es';
import { generatePath } from '@/utils/mappingUtils';
import { isObj } from '@/utils/typeGuards';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { isPresent } from '@/utils/typesUtils';

export function useDataSchema() {
	function getSchema(
		input: Optional<Primitives | object>,
		path = '',
		excludeValues = false,
	): Schema {
		let schema: Schema = { type: 'undefined', value: 'undefined', path };
		switch (typeof input) {
			case 'object':
				if (input === null) {
					schema = { type: 'null', value: '[null]', path };
				} else if (input instanceof Date) {
					schema = { type: 'string', value: input.toISOString(), path };
				} else if (Array.isArray(input)) {
					schema = {
						type: 'array',
						value: input.map((item, index) => ({
							key: index.toString(),
							...getSchema(item, `${path}[${index}]`, excludeValues),
						})),
						path,
					};
				} else if (isObj(input)) {
					schema = {
						type: 'object',
						value: Object.entries(input).map(([k, v]) => ({
							key: k,
							...getSchema(v, generatePath(path, [k]), excludeValues),
						})),
						path,
					};
				}
				break;
			case 'function':
				schema = { type: 'function', value: '', path };
				break;
			default:
				schema = {
					type: typeof input,
					value: excludeValues ? '' : String(input),
					path,
				};
		}

		return schema;
	}

	function getSchemaForExecutionData(data: IDataObject[], excludeValues = false) {
		const [head, ...tail] = data;

		return getSchema(merge({}, head, ...tail, head), undefined, excludeValues);
	}

	// Returns the data of the main input
	function getMainInputData(
		connectionsData: ITaskDataConnections,
		outputIndex: number,
	): INodeExecutionData[] {
		if (
			!connectionsData?.hasOwnProperty(NodeConnectionType.Main) ||
			connectionsData.main === undefined ||
			connectionsData.main.length < outputIndex ||
			connectionsData.main[outputIndex] === null
		) {
			return [];
		}
		return connectionsData.main[outputIndex] as INodeExecutionData[];
	}

	function getNodeInputData(
		node: INodeUi | null,
		runIndex = 0,
		outputIndex = 0,
	): INodeExecutionData[] {
		const { getWorkflowExecution } = useWorkflowsStore();
		if (node === null) {
			return [];
		}

		if (getWorkflowExecution === null) {
			return [];
		}
		const executionData = getWorkflowExecution.data;
		if (!executionData?.resultData) {
			// unknown status
			return [];
		}
		const runData = executionData.resultData.runData;

		if (!runData?.[node.name]?.[runIndex].data || runData[node.name][runIndex].data === undefined) {
			return [];
		}

		return getMainInputData(runData[node.name][runIndex].data!, outputIndex);
	}

	function getInputDataWithPinned(
		node: INodeUi | null,
		runIndex = 0,
		outputIndex = 0,
	): INodeExecutionData[] {
		if (!node) return [];

		const { pinDataByNodeName } = useWorkflowsStore();
		const pinnedData = pinDataByNodeName(node.name);
		let inputData = getNodeInputData(node, runIndex, outputIndex);

		if (pinnedData) {
			inputData = Array.isArray(pinnedData)
				? pinnedData.map((json) => ({ json }))
				: [{ json: pinnedData }];
		}

		return inputData;
	}

	function schemaMatches(schema: Schema, search: string): boolean {
		const searchLower = search.toLocaleLowerCase();
		return (
			!!schema.key?.toLocaleLowerCase().includes(searchLower) ||
			(typeof schema.value === 'string' && schema.value.toLocaleLowerCase().includes(searchLower))
		);
	}

	function filterSchema(schema: Schema, search: string): Schema | null {
		if (!search.trim()) return schema;

		if (Array.isArray(schema.value)) {
			const filteredValue = schema.value
				.map((value) => filterSchema(value, search))
				.filter(isPresent);

			if (filteredValue.length === 0) {
				return schemaMatches(schema, search) ? schema : null;
			}

			return {
				...schema,
				value: filteredValue,
			};
		}

		return schemaMatches(schema, search) ? schema : null;
	}

	return {
		getSchema,
		getSchemaForExecutionData,
		getNodeInputData,
		getInputDataWithPinned,
		filterSchema,
	};
}
