import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type IHttpRequestOptions,
	type INodeExecutionData,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import type { Action, Http, HttpRequest } from './define';
import type { AnySchema, JsonSchema, ObjectOf, Shape } from './schema';
import { validate } from './validate';

const isRecord = (value: unknown): value is IDataObject =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** `notion.databasePage.getAll` → `notionDatabasePageGetAll`. */
export const nodeNameOf = (actionId: string) =>
	actionId
		.split('.')
		.map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
		.join('');

function toProperty(name: string, schema: AnySchema): INodeProperties {
	const { json } = schema;
	const base = {
		displayName: name,
		name,
		required: !schema.isOptional,
		...(json['x-n8n-hint'] ? { description: json['x-n8n-hint'] } : {}),
	};
	if (json.enum) {
		const options = json.enum.flatMap((value) =>
			typeof value === 'string' || typeof value === 'number'
				? [{ name: String(value), value }]
				: [],
		);
		return { ...base, type: 'options', options, default: options[0]?.value ?? '' };
	}
	switch (json.type) {
		case 'string':
			return {
				...base,
				type: 'string',
				default: typeof json.default === 'string' ? json.default : '',
			};
		case 'number':
		case 'integer':
			return {
				...base,
				type: 'number',
				default: typeof json.default === 'number' ? json.default : 0,
			};
		case 'boolean':
			return { ...base, type: 'boolean', default: json.default === true };
		default:
			// Complex fields keep their JSON value; n8n resolves expressions inside it per item.
			return { ...base, type: 'json', default: JSON.stringify(json.default ?? {}) };
	}
}

function readParameter(context: IExecuteFunctions, name: string, itemIndex: number): unknown {
	const value: unknown = context.getNodeParameter(name, itemIndex, undefined);
	if (typeof value !== 'string' || !/^\s*[[{]/.test(value)) return value;
	try {
		const parsed: unknown = JSON.parse(value);
		return parsed;
	} catch {
		return value;
	}
}

function toRequestOptions(request: HttpRequest, baseUrl: string | undefined): IHttpRequestOptions {
	const query = Object.fromEntries(
		Object.entries(request.query ?? {}).filter(([, value]) => value !== undefined),
	);
	return {
		method: request.method ?? 'GET',
		url: request.url ?? `${baseUrl ?? ''}${request.path ?? ''}`,
		qs: query,
		headers: { ...request.headers },
		json: true,
		...(request.body !== undefined ? { body: request.body } : {}),
		...(request.fullResponse ? { returnFullResponse: true } : {}),
	};
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * An n8n node type for one action. The platform part lives here: parameters are resolved per
 * item and validated against `input`, output items are validated against `output` and paired
 * with their input item, and continue-on-fail routes failed items to the error output.
 */
export function toNodeType<S extends Shape, O extends AnySchema>(
	action: Action<S, O>,
): new () => INodeType {
	const inputKeys = Object.keys(action.input);
	const outputSchema: JsonSchema = action.output.json;
	const isInput = (value: unknown): value is ObjectOf<S> =>
		validate(value, action.inputSchema).length === 0;

	const description: INodeTypeDescription = {
		displayName: `${action.node.displayName}: ${action.action}`,
		name: nodeNameOf(action.id),
		group: [action.flow.effect === 'write' ? 'output' : 'input'],
		version: 1,
		description: action.summary,
		defaults: { name: action.action },
		inputs: ['main'],
		outputs: ['main'],
		credentials: action.credentialTypes.map((name) => ({
			name,
			required: action.credentialTypes.length === 1,
		})),
		properties: Object.entries(action.input).map(([name, schema]) => toProperty(name, schema)),
	};

	async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = this.getNode().credentials ?? {};
		const credentialType = action.credentialTypes.find((type) => credentials[type] !== undefined);
		const http: Http = {
			request: async (request) => {
				const options = toRequestOptions(request, action.node.baseUrl);
				const response: unknown = credentialType
					? await this.helpers.httpRequestWithAuthentication.call(this, credentialType, options)
					: await this.helpers.httpRequest(options);
				return response;
			},
		};

		const runItem = async (itemIndex: number): Promise<INodeExecutionData[]> => {
			const input = Object.fromEntries(
				inputKeys
					.map((key) => [key, readParameter(this, key, itemIndex)] as const)
					.filter(([, value]) => value !== undefined && value !== ''),
			);
			if (!isInput(input)) {
				const issues = validate(input, action.inputSchema);
				throw new NodeOperationError(this.getNode(), issues.join('; '), { itemIndex });
			}
			const emitted: unknown[] = [];
			await action.run({ input, http, emit: (item) => emitted.push(item) });
			return emitted.map((item) => {
				const issues = validate(item, outputSchema, { path: 'output' });
				if (issues.length > 0 || !isRecord(item)) {
					throw new NodeOperationError(
						this.getNode(),
						`Output does not match the contract: ${issues.join('; ') || 'not an object'}`,
						{ itemIndex },
					);
				}
				return { json: item, pairedItem: { item: itemIndex } };
			});
		};

		const results = await this.getInputData().reduce<Promise<INodeExecutionData[]>>(
			async (previous, _item, itemIndex) => {
				const done = await previous;
				try {
					return [...done, ...(await runItem(itemIndex))];
				} catch (error) {
					if (!this.continueOnFail()) throw error;
					return [
						...done,
						{ json: { error: errorMessage(error) }, pairedItem: { item: itemIndex } },
					];
				}
			},
			Promise.resolve([]),
		);
		return [results];
	}

	return class implements INodeType {
		description = description;

		execute = execute;
	};
}
