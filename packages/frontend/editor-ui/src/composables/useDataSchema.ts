import { useI18n } from '@n8n/i18n';
import type { INodeUi, Optional, Primitives, Schema, SchemaType } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { generatePath, getNodeParentExpression } from '@/utils/mappingUtils';
import { isObject } from '@/utils/objectUtils';
import { isObj } from '@/utils/typeGuards';
import { isPresent, shorten } from '@/utils/typesUtils';
import type { JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName } from 'json-schema';
import merge from 'lodash/merge';
import {
	type IDataObject,
	type INodeExecutionData,
	type INodeTypeDescription,
	type ITaskDataConnections,
	NodeConnectionTypes,
} from 'n8n-workflow';
import { ref } from 'vue';
import { type IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { DATA_TYPE_ICON_MAP } from '@/constants';

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

	function getSchemaForJsonSchema(schema: JSONSchema7 | JSONSchema7Definition, path = ''): Schema {
		if (typeof schema !== 'object') {
			return {
				type: 'null',
				path,
				value: 'null',
			};
		}
		if (schema.type === 'array') {
			return {
				type: 'array',
				value: isObject(schema.items)
					? [{ ...getSchemaForJsonSchema(schema.items, `${path}[0]`), key: '0' }]
					: [],
				path,
			};
		}

		if (schema.type === 'object') {
			const properties = schema.properties ?? {};
			const value = Object.entries(properties).map(([key, propSchema]) => {
				const newPath = path ? `${path}.${key}` : `.${key}`;
				const transformed = getSchemaForJsonSchema(propSchema, newPath);
				return { ...transformed, key };
			});

			return {
				type: 'object',
				value,
				path,
			};
		}

		const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
		return {
			type: JsonSchemaTypeToSchemaType(type),
			value: '',
			path,
		};
	}

	function JsonSchemaTypeToSchemaType(type: JSONSchema7TypeName | undefined): SchemaType {
		switch (type) {
			case undefined:
				return 'undefined';
			case 'integer':
				return 'number';
			default:
				return type;
		}
	}

	// Returns the data of the main input
	function getMainInputData(
		connectionsData: ITaskDataConnections,
		outputIndex: number,
	): INodeExecutionData[] {
		if (
			!connectionsData?.hasOwnProperty(NodeConnectionTypes.Main) ||
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
		getSchemaForJsonSchema,
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
	preview: boolean;
	isNodeExecuted: boolean;
	hasBinary: boolean;
	runIndex: number;
	isDataEmpty: boolean;
};

export type RenderItem = {
	type: 'item';
	id: string;
	icon: IconName;
	title?: string;
	path?: string;
	level?: number;
	depth?: number;
	expression?: string;
	value?: string;
	collapsable?: boolean;
	nodeName?: string;
	nodeType?: INodeUi['type'];
	preview?: boolean;
	locked?: boolean;
	lockedTooltip?: string;
};

export type RenderHeader = {
	type: 'header';
	id: string;
	title: string;
	collapsable: boolean;
	itemCount: number | null;
	info?: string;
	nodeType?: INodeTypeDescription;
	preview?: boolean;
};

export type RenderIcon = {
	id: string;
	type: 'icon';
	icon: IconName;
	tooltip: string;
};

export type RenderNotice = {
	id: string;
	type: 'notice';
	level: number;
	message: string;
};

export type RenderEmpty = {
	id: string;
	type: 'empty';
	level: number;
	nodeName: string;
	key: 'emptyData' | 'emptySchema' | 'emptySchemaWithBinary' | 'executeSchema';
};

export type Renders = RenderHeader | RenderItem | RenderIcon | RenderNotice | RenderEmpty;

const icons = {
	object: DATA_TYPE_ICON_MAP.object,
	array: DATA_TYPE_ICON_MAP.array,
	['string']: DATA_TYPE_ICON_MAP.string,
	null: 'case-upper',
	['number']: DATA_TYPE_ICON_MAP.number,
	['boolean']: DATA_TYPE_ICON_MAP.boolean,
	function: 'code',
	bigint: 'calculator',
	symbol: 'sun',
	['undefined']: 'ban',
} satisfies Record<string, IconName>;

const getIconBySchemaType = (type: Schema['type']): IconName => icons[type];

const emptyItem = (
	key: RenderEmpty['key'],
	{ nodeName, level }: { nodeName?: string; level?: number } = {},
): RenderEmpty => ({
	id: `empty-${window.crypto.randomUUID()}`,
	type: 'empty',
	key,
	level: level ?? 0,
	nodeName: nodeName ?? '',
});

const moreFieldsItem = (): RenderIcon => ({
	id: `moreFields-${window.crypto.randomUUID()}`,
	type: 'icon',
	icon: 'ellipsis',
	tooltip: useI18n().baseText('dataMapping.schemaView.previewExtraFields'),
});

const isEmptySchema = (schema: Schema) => {
	// Utilize the generated schema instead of looping over the entire data again
	// The schema for empty data is { type: 'object', value: [] }
	const isObjectOrArray = schema.type === 'object';
	const isEmpty = Array.isArray(schema.value) && schema.value.length === 0;

	return isObjectOrArray && isEmpty;
};

const prefixTitle = (title: string, prefix?: string) => (prefix ? `${prefix}[${title}]` : title);

export const useFlattenSchema = () => {
	const closedNodes = ref<Set<string>>(new Set());
	const toggleNode = (id: string) => {
		if (closedNodes.value.has(id)) {
			closedNodes.value.delete(id);
		} else {
			closedNodes.value.add(id);
		}
	};

	const flattenSchema = ({
		isDataEmpty,
		schema,
		nodeType,
		nodeName,
		expressionPrefix = '',
		depth = 0,
		prefix = '',
		level = 0,
		preview,
		truncateLimit,
	}: {
		isDataEmpty: boolean;
		schema: Schema;
		expressionPrefix?: string;
		nodeType?: string;
		nodeName?: string;
		depth?: number;
		prefix?: string;
		level?: number;
		preview?: boolean;
		truncateLimit: number;
	}): Renders[] => {
		// only show empty item for the first level
		if (isEmptySchema(schema) && level < 0) {
			return [emptyItem(isDataEmpty ? 'emptyData' : 'emptySchema')];
		}

		const expression = `{{ ${expressionPrefix ? expressionPrefix + schema.path : schema.path.slice(1)} }}`;

		const id = `${nodeName}-${expression}`;

		if (Array.isArray(schema.value)) {
			const items: Renders[] = [];

			if (schema.key) {
				items.push({
					title: prefixTitle(schema.key, prefix),
					path: schema.path,
					expression,
					depth,
					level,
					icon: getIconBySchemaType(schema.type),
					id,
					collapsable: true,
					nodeType,
					nodeName,
					type: 'item',
					preview,
				});
			}

			if (closedNodes.value.has(id)) {
				return items;
			}

			return items.concat(
				schema.value
					.map((item) => {
						const itemPrefix = schema.type === 'array' ? schema.key : '';
						return flattenSchema({
							isDataEmpty,
							schema: item,
							expressionPrefix,
							nodeType,
							nodeName,
							depth,
							prefix: itemPrefix,
							level: level + 1,
							preview,
							truncateLimit,
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
					value: shorten(schema.value, truncateLimit, 0),
					id,
					icon: getIconBySchemaType(schema.type),
					collapsable: false,
					nodeType,
					nodeName,
					type: 'item',
					preview,
				},
			];
		}

		return [];
	};

	const flattenMultipleSchemas = (
		nodes: SchemaNode[],
		additionalInfo: (node: INodeUi) => string,
		truncateLimit: number,
	) => {
		return nodes.reduce<Renders[]>((acc, item) => {
			acc.push({
				title: item.node.name,
				id: item.node.name,
				collapsable: true,
				nodeType: item.nodeType,
				itemCount: item.itemsCount,
				info: additionalInfo(item.node),
				type: 'header',
				preview: item.preview,
			});

			if (closedNodes.value.has(item.node.name)) {
				return acc;
			}

			if (isEmptySchema(item.schema)) {
				if (!item.isNodeExecuted) {
					acc.push(emptyItem('executeSchema', { level: 1 }));
					return acc;
				}

				if (item.isDataEmpty) {
					acc.push(emptyItem('emptyData', { level: 1 }));
					return acc;
				}
				acc.push(emptyItem(item.hasBinary ? 'emptySchemaWithBinary' : 'emptySchema', { level: 1 }));
				return acc;
			}

			acc = acc.concat(
				flattenSchema({
					isDataEmpty: item.isDataEmpty,
					schema: item.schema,
					depth: item.depth,
					nodeType: item.node.type,
					nodeName: item.node.name,
					preview: item.preview,
					truncateLimit,
					expressionPrefix: getNodeParentExpression({
						nodeName: item.node.name,
						distanceFromActive: item.depth,
					}),
				}),
			);

			if (item.preview) {
				acc.push(moreFieldsItem());
			}

			return acc;
		}, []);
	};

	return {
		closedNodes,
		toggleNode,
		flattenSchema,
		flattenMultipleSchemas,
	};
};
