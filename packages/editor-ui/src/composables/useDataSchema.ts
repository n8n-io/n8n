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
			outputIndex < 0 ||
			outputIndex >= connectionsData.main.length ||
			connectionsData.main[outputIndex] === null
		) {
			return [];
		}
		return connectionsData.main[outputIndex];
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

		const taskData = runData?.[node.name]?.[runIndex];
		if (taskData?.data === undefined) {
			return [];
		}

		return getMainInputData(taskData.data, outputIndex);
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
	icon: string;
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

const icons = {
	object: 'cube',
	array: 'list',
	['string']: 'font',
	null: 'font',
	['number']: 'hashtag',
	['boolean']: 'check-square',
	function: 'code',
	bigint: 'calculator',
	symbol: 'sun',
	['undefined']: 'ban',
} as const;

const getIconBySchemaType = (type: Schema['type']): string => icons[type];

const emptyItem = (): RenderItem => ({
	id: `empty-${window.crypto.randomUUID()}`,
	icon: '',
	value: useI18n().baseText('dataMapping.schemaView.emptyData'),
	type: 'item',
});

const isDataEmpty = (schema: Schema) => {
	// Utilize the generated schema instead of looping over the entire data again
	// The schema for empty data is { type: 'object', value: [] }
	const isObjectOrArray = schema.type === 'object';
	const isEmpty = Array.isArray(schema.value) && schema.value.length === 0;

	return isObjectOrArray && isEmpty;
};

const prefixTitle = (title: string, prefix?: string) => (prefix ? `${prefix}[${title}]` : title);

export const useFlattenSchema = () => {
	const closedNodes = ref<Set<string>>(new Set());
	const headerIds = ref<Set<string>>(new Set());
	const toggleLeaf = (id: string) => {
		if (closedNodes.value.has(id)) {
			closedNodes.value.delete(id);
		} else {
			closedNodes.value.add(id);
		}
	};

	const toggleNode = (id: string) => {
		if (closedNodes.value.has(id)) {
			closedNodes.value = new Set(headerIds.value);
			closedNodes.value.delete(id);
		} else {
			closedNodes.value.add(id);
		}
	};

	const flattenSchema = ({
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
		// only show empty item for the first level
		if (isDataEmpty(schema) && depth <= 0) {
			return [emptyItem()];
		}

		const expression = getMappedExpression({
			nodeName: node.name,
			distanceFromActive: depth,
			path: schema.path,
		});

		if (Array.isArray(schema.value)) {
			const items: RenderItem[] = [];

			if (schema.key) {
				items.push({
					title: prefixTitle(schema.key, prefix),
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
						return flattenSchema({
							schema: item,
							node,
							depth,
							prefix: itemPrefix,
							level: level + 1,
						});
					})
					.flat(),
			);
		} else if (schema.key) {
			return [
				{
					title: prefixTitle(schema.key, prefix),
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
		}

		return [];
	};

	const flattenMultipleSchemas = (
		nodes: SchemaNode[],
		additionalInfo: (node: INodeUi) => string,
	) => {
		headerIds.value.clear();

		return nodes.reduce<Renders[]>((acc, item) => {
			acc.push({
				title: item.node.name,
				id: item.node.name,
				collapsable: true,
				nodeType: item.nodeType,
				itemCount: item.itemsCount,
				info: additionalInfo(item.node),
				type: 'header',
			});

			headerIds.value.add(item.node.name);

			if (closedNodes.value.has(item.node.name)) {
				return acc;
			}

			if (isDataEmpty(item.schema)) {
				acc.push(emptyItem());
				return acc;
			}

			acc.push(...flattenSchema(item));
			return acc;
		}, []);
	};

	return { closedNodes, toggleLeaf, toggleNode, flattenSchema, flattenMultipleSchemas };
};
