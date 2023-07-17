import type { Optional, Primitives, Schema } from '@/Interface';
import type { IDataObject } from 'n8n-workflow';
import { merge } from 'lodash-es';
import { generatePath } from '@/utils/mappingUtils';
import { isObj } from '@/utils/typeGuards';
import { useWorkflowsStore } from '@/stores';

export function useDataSchema() {
	function getSchema(input: Optional<Primitives | object>, path = ''): Schema {
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
							...getSchema(item, `${path}[${index}]`),
						})),
						path,
					};
				} else if (isObj(input)) {
					schema = {
						type: 'object',
						value: Object.entries(input).map(([k, v]) => ({
							key: k,
							...getSchema(v, generatePath(path, [k])),
						})),
						path,
					};
				}
				break;
			case 'function':
				schema = { type: 'function', value: '', path };
				break;
			default:
				schema = { type: typeof input, value: String(input), path };
		}

		return schema;
	}

	function getSchemaForExecutionData(data: IDataObject[]) {
		const [head, ...tail] = data;

		return getSchema(merge({}, head, ...tail, head));
	}

	function getWorkflowSchema() {
		const { allNodes } = useWorkflowsStore();

		const schemas = allNodes.reduce((acc: IDataObject, curr) => {
			const { name } = curr;
			const nodeRunData = useWorkflowsStore().getWorkflowResultDataByNodeName(name)?.[0];

			if (nodeRunData?.executionStatus === 'success' && nodeRunData.data !== undefined) {
				const outputs = Object.keys(nodeRunData.data);

				// Nodes might have several outputs, we need to get the schema for each input
				const outputsSchema = outputs.reduce((outputsAcc: IDataObject, inputName) => {
					const inputRunData = nodeRunData.data?.[inputName]?.[0]?.map((item) => item?.json);
					if (inputRunData === undefined) return outputsAcc;

					outputsAcc[inputName] = getSchemaForExecutionData(inputRunData);
					return outputsAcc;
				}, {});

				acc[name] = outputsSchema;
			}

			return acc;
		}, {});

		return schemas;
	}
	return {
		getSchemaForExecutionData,
		getWorkflowSchema,
	};
}
