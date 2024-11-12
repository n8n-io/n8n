import { ref } from 'vue';
import type { Optional, Primitives, Schema, INodeUi } from '@/Interface';
import {
	type ITaskDataConnections,
	type IDataObject,
	type INodeExecutionData,
	type INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import { merge } from 'lodash-es';
import { generatePath, getMappedExpression } from '@/utils/mappingUtils';
import { isObj } from '@/utils/typeGuards';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { isPresent, shorten } from '@/utils/typesUtils';
import { useI18n } from '@/composables/useI18n';
import { checkExhaustive } from '@/utils/typeGuards';

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

export type SchemaNode = {
	node: INodeUi;
	nodeType: INodeTypeDescription;
	depth: number;
	connectedOutputIndexes: number[];
	itemsCount: number;
	schema: Schema;
};

export type RenderItem = {
	title?: string;
	path?: string;
	level?: number;
	depth?: number;
	expression?: string;
	value?: string;
	id: string;
	icon?: string;
	collapsable?: boolean;
	nodeType?: INodeUi['type'];
	type: 'item';
};

export type RenderHeader = {
	id: string;
	title: string;
	info?: string;
	collapsable: boolean;
	nodeType: INodeTypeDescription;
	itemCount: number | null;
	type: 'header';
};

type Renders = RenderHeader | RenderItem;

const getIconBySchemaType = (type: Schema['type']): string => {
	switch (type) {
		case 'object':
			return 'cube';
		case 'array':
			return 'list';
		case 'string':
		case 'null':
			return 'font';
		case 'number':
			return 'hashtag';
		case 'boolean':
			return 'check-square';
		case 'function':
			return 'code';
		case 'bigint':
			return 'calculator';
		case 'symbol':
			return 'sun';
		case 'undefined':
			return 'ban';
		default:
			checkExhaustive(type);
			return '';
	}
};

const isDataEmpty = (schema: Schema | null) => {
	if (!schema) return true;
	// Utilize the generated schema instead of looping over the entire data again
	// The schema for empty data is { type: 'object' | 'array', value: [] }
	const isObjectOrArray = schema.type === 'object' || schema.type === 'array';
	const isEmpty = Array.isArray(schema.value) && schema.value.length === 0;

	return isObjectOrArray && isEmpty;
};

export const useFlattenSchema = () => {
	const closedNodes = ref<Set<string>>(new Set());
	const toggleNode = (id: string) => {
		if (closedNodes.value.has(id)) {
			closedNodes.value.delete(id);
		} else {
			closedNodes.value.add(id);
		}
	};

	const flattSchema = ({
		schema,
		node = { name: '', type: '' },
		depth = 0,
		prefix = '',
		level = 0,
	}: {
		schema: Schema;
		node?: { name: string; type: string };
		depth?: number;
		prefix?: string;
		level?: number;
	}): RenderItem[] => {
		const expression = getMappedExpression({
			nodeName: node.name,
			distanceFromActive: depth,
			path: schema.path,
		});

		if (Array.isArray(schema.value)) {
			const items: RenderItem[] = [];

			if (schema.key) {
				items.push({
					title: prefix ? `${prefix}[${schema.key}]` : schema.key,
					path: schema.path,
					expression,
					depth,
					level,
					icon: getIconBySchemaType(schema.type),
					id: expression,
					collapsable: true,
					nodeType: node.type,
					type: 'item',
				});
			}

			if (closedNodes.value.has(expression)) {
				return items;
			}

			return items.concat(
				schema.value
					.map((item) => {
						const itemPrefix = schema.type === 'array' ? schema.key : '';
						return flattSchema({ schema: item, node, depth, prefix: itemPrefix, level: level + 1 });
					})
					.flat(),
			);
		} else if (schema.key) {
			return [
				{
					title: schema.key,
					path: schema.path,
					expression,
					level,
					depth,
					value: shorten(schema.value, 600, 0),
					id: expression,
					icon: getIconBySchemaType(schema.type),
					collapsable: false,
					nodeType: node.type,
					type: 'item',
				},
			];
		} else {
			return [];
		}
	};

	const flattMultipleSchema = (nodes: SchemaNode[], additionalInfo: (node: INodeUi) => string) =>
		nodes.reduce<Renders[]>((acc, item, index) => {
			acc.push({
				title: item.node.name,
				id: item.node.name,
				collapsable: true,
				nodeType: item.nodeType,
				itemCount: item.itemsCount,
				info: additionalInfo(item.node),
				type: 'header',
			});

			if (closedNodes.value.has(item.node.name)) {
				return acc;
			}

			if (isDataEmpty(item.schema)) {
				acc.push({
					id: `empty-${index}`,
					value: useI18n().baseText('dataMapping.schemaView.emptyData'),
					type: 'item',
				});
				return acc;
			}

			acc.push(...flattSchema(item));
			return acc;
		}, []);

	return { closedNodes, toggleNode, flattSchema, flattMultipleSchema };
};
