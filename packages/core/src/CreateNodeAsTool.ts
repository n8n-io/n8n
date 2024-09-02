import { DynamicStructuredTool } from '@langchain/core/tools';
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeParameters,
	type INodeType,
} from 'n8n-workflow';
import { z } from 'zod';

type NestedObject = { [key: string]: unknown };

function encodeDotNotation(key: string): string {
	// __value replace to get complicated params working
	return key.replace(/\./g, '__').replace('__value', '');
}

function decodeDotNotation(key: string): string {
	return key.replace(/__/g, '.');
}

function traverseObject(
	obj: NestedObject,
	path: string[] = [],
	results: Map<string, string> = new Map(),
): Map<string, string> {
	for (const [key, value] of Object.entries(obj)) {
		const currentPath = [...path, key];
		const fullPath = currentPath.join('.');

		if (typeof value === 'string' && value.startsWith("={{ '__PLACEHOLDER")) {
			results.set(encodeDotNotation(fullPath), value);
		} else if (Array.isArray(value)) {
			// eslint-disable-next-line @typescript-eslint/no-use-before-define
			traverseArray(value, currentPath, results);
		} else if (typeof value === 'object' && value !== null) {
			if (Object.keys(value).length > 0) {
				traverseObject(value as NestedObject, currentPath, results);
			}
		}
	}

	return results;
}

function traverseArray(arr: unknown[], path: string[], results: Map<string, string>): void {
	arr.forEach((item, index) => {
		const currentPath = [...path, index.toString()];
		const fullPath = currentPath.join('.');

		if (typeof item === 'string' && item.startsWith("={{ '__PLACEHOLDER")) {
			results.set(encodeDotNotation(fullPath), item);
		} else if (Array.isArray(item)) {
			traverseArray(item, currentPath, results);
		} else if (typeof item === 'object' && item !== null) {
			traverseObject(item as NestedObject, currentPath, results);
		}
	});
}

function buildStructureFromMatches(
	baseKey: string,
	matchingKeys: string[],
	values: Record<string, string>,
): Record<string, unknown> {
	const result = {};

	for (const matchingKey of matchingKeys) {
		const decodedKey = decodeDotNotation(matchingKey);
		const remainingPath = decodedKey
			.slice(baseKey.length)
			.split('.')
			.filter((k) => k !== '');
		let current: Record<string, unknown> = result;

		for (let i = 0; i < remainingPath.length - 1; i++) {
			if (!(remainingPath[i] in current)) {
				current[remainingPath[i]] = {};
			}
			current = current[remainingPath[i]] as Record<string, unknown>;
		}

		const lastKey = remainingPath[remainingPath.length - 1];
		current[lastKey ?? matchingKey] = values[matchingKey];
	}

	return Object.keys(result).length === 0 ? values[encodeDotNotation(baseKey)] : result;
}

function extractPlaceholderDescription(value: string): string {
	const match = value.match(/{{ '__PLACEHOLDER:\s*(.+?)\s*' }}/);
	return match ? match[1] : 'No description provided';
}

export function createNodeAsTool(
	node: INodeType,
	ctx: IExecuteFunctions,
	nodeParameters: INodeParameters,
): DynamicStructuredTool {
	const placeholderValues = traverseObject(nodeParameters);

	// Generate Zod schema
	const schemaObj: { [key: string]: z.ZodString } = {};
	for (const [key, value] of placeholderValues.entries()) {
		const description = extractPlaceholderDescription(value);

		schemaObj[key] = z.string().describe(description);
	}
	const schema = z.object(schemaObj);

	const toolDescription = ctx.getNodeParameter(
		'toolDescription',
		0,
		node.description.description,
	) as string;
	type GetNodeParameterMethod = IExecuteFunctions['getNodeParameter'];

	const tool = new DynamicStructuredTool({
		name: node.description.name,
		description: toolDescription ? toolDescription : node.description.description,
		schema,
		func: async (functionArgs: z.infer<typeof schema>) => {
			// Create a proxy for ctx
			const ctxProxy = new Proxy(ctx, {
				get(target: IExecuteFunctions, prop: string | symbol, receiver: unknown) {
					if (prop === 'getNodeParameter') {
						// eslint-disable-next-line @typescript-eslint/unbound-method
						return new Proxy(target.getNodeParameter, {
							apply(
								targetMethod: GetNodeParameterMethod,
								thisArg: unknown,
								argumentsList: Parameters<GetNodeParameterMethod>,
							): ReturnType<GetNodeParameterMethod> {
								const [key] = argumentsList;
								if (typeof key !== 'string') {
									return Reflect.apply(targetMethod, thisArg, argumentsList);
								}

								const encodedKey = encodeDotNotation(key);
								// Check if the full key or any more specific key is a placeholder
								const matchingKeys = Array.from(placeholderValues.keys()).filter((k) =>
									k.startsWith(encodedKey),
								);

								if (matchingKeys.length > 0) {
									// If there are matching keys, build the structure using args
									const res = buildStructureFromMatches(encodedKey, matchingKeys, functionArgs);

									return res?.[decodeDotNotation(key)] ?? res;
								}

								// If no placeholder is found, use the original function
								return Reflect.apply(targetMethod, thisArg, argumentsList);
							},
						});
					}
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
					return Reflect.get(target, prop, receiver);
				},
			});

			ctxProxy.addInputData(NodeConnectionType.AiTool, [[{ json: functionArgs }]]);
			const result = await node.execute?.call(ctxProxy);
			const mappedResults = result?.[0]?.flatMap((item: { json: unknown }) => item.json);
			ctxProxy.addOutputData(NodeConnectionType.AiTool, 0, [
				[{ json: { response: mappedResults } }],
			]);
			return JSON.stringify(mappedResults);
		},
	});

	return tool;
}

export async function getNodeAsToll(
	ctx: IExecuteFunctions,
	node: INodeType,
	nodeParameters: INodeParameters,
) {
	return {
		response: createNodeAsTool(node, ctx, nodeParameters),
	};
}
