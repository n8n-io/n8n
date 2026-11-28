import type {
	ILoadOptionsFunctions,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	INodeType,
} from 'n8n-workflow';
import { findDisplayedProperty, requestUrl } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { MiniMax } from '../MiniMax.node';

const GATEWAY_MINIMAX_URL = 'https://gateway.example.com/v1/gateway/minimax/v1';

interface DropdownModelsResult {
	isDynamic: boolean;
	models: string[];
}

function getDefaultVersion(node: INodeType): number {
	if (typeof node.description.defaultVersion === 'number') {
		return node.description.defaultVersion;
	}
	const versions = Array.isArray(node.description.version)
		? node.description.version
		: [node.description.version];
	return Math.max(...versions);
}

function isPropertyOption(
	option: INodePropertyOptions | INodeProperties | INodePropertyCollection,
): option is INodePropertyOptions {
	return 'value' in option;
}

function createGatewayLoadContext(
	node: INodeType,
	resource: string,
	operation: string,
	gatewayModelIds: string[],
): ReturnType<typeof mockDeep<ILoadOptionsFunctions>> {
	const ctx = mockDeep<ILoadOptionsFunctions>();
	const defaultVersion = getDefaultVersion(node);
	const parameters: Record<string, string> = { resource, operation };

	ctx.getCredentials.mockResolvedValue({
		apiKey: 'gateway-jwt-token',
		url: GATEWAY_MINIMAX_URL,
	});
	ctx.getNode.mockReturnValue({
		id: 'minimax-node-id',
		name: 'MiniMax',
		type: '@n8n/n8n-nodes-langchain.minimax',
		typeVersion: defaultVersion,
		position: [0, 0],
		parameters,
		credentials: {
			minimaxApi: { id: null, name: 'Gateway credits', __aiGatewayManaged: true },
		},
	});
	ctx.getCurrentNodeParameter.mockImplementation(
		(parameterName: string) => parameters[parameterName],
	);
	ctx.getCurrentNodeParameters.mockReturnValue(parameters);
	ctx.getNodeParameter.mockImplementation(
		(parameterName: string) => parameters[parameterName] ?? '',
	);
	ctx.helpers.httpRequestWithAuthentication.mockResolvedValue({
		data: gatewayModelIds.map((id) => ({ id })),
	});

	return ctx;
}

async function resolveDropdownModels(
	node: INodeType,
	resource: string,
	operation: string,
	ctx: ILoadOptionsFunctions,
): Promise<DropdownModelsResult> {
	const defaultVersion = getDefaultVersion(node);
	const property = findDisplayedProperty(
		'modelId',
		node.description.properties,
		{ resource, operation },
		{ typeVersion: defaultVersion },
		node.description,
	);

	if (!property || !('type' in property)) {
		throw new Error(`No displayed modelId property found for ${resource}:${operation}`);
	}

	if (property.type === 'resourceLocator') {
		const listMode = property.modes?.find((mode) => mode.type === 'list');
		const methodName = listMode?.typeOptions?.searchListMethod;
		const searchMethod = methodName ? node.methods?.listSearch?.[methodName] : undefined;
		if (!searchMethod) {
			throw new Error(
				`Missing listSearch method "${methodName ?? ''}" for ${resource}:${operation}`,
			);
		}
		const { results } = await searchMethod.call(ctx);
		return {
			isDynamic: true,
			models: results.map((item) => String(item.value)),
		};
	}

	const loadOptionsMethod = property.typeOptions?.loadOptionsMethod;
	if (property.type === 'options' && loadOptionsMethod) {
		const loadMethod = node.methods?.loadOptions?.[loadOptionsMethod];
		if (!loadMethod) {
			throw new Error(
				`Missing loadOptions method "${loadOptionsMethod}" for ${resource}:${operation}`,
			);
		}
		const options = await loadMethod.call(ctx);
		return {
			isDynamic: true,
			models: options.map((option) => String(option.value)),
		};
	}

	// Static hardcoded options ignore the selected credential.
	const staticOptions = (property.options ?? []).filter(isPropertyOption);
	return {
		isDynamic: false,
		models: staticOptions.map((option) => String(option.value)),
	};
}

// Regression tests for RLY-317: Gateway credits must only list supported MiniMax video models.
describe('MiniMax Gateway credits model picker (RLY-317)', () => {
	let node: INodeType;

	beforeEach(() => {
		node = new MiniMax();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should dynamically load only Gateway-supported models for text:message', async () => {
		const ctx = createGatewayLoadContext(node, 'text', 'message', ['MiniMax-M3']);

		const result = await resolveDropdownModels(node, 'text', 'message', ctx);

		expect(result.isDynamic).toBe(true);
		expect(result.models).toEqual(['MiniMax-M3']);
		expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'minimaxApi',
			expect.objectContaining({
				method: 'GET',
				url: requestUrl`${GATEWAY_MINIMAX_URL}/models`,
			}),
		);
	});

	it('should dynamically load only Gateway-supported models for video:imageToVideo', async () => {
		const ctx = createGatewayLoadContext(node, 'video', 'imageToVideo', ['MiniMax-H3']);

		const result = await resolveDropdownModels(node, 'video', 'imageToVideo', ctx);

		expect(result.models).toEqual(['MiniMax-H3']);
		expect(result.isDynamic).toBe(true);
	});

	it('should dynamically load only Gateway-supported models for video:textToVideo', async () => {
		const ctx = createGatewayLoadContext(node, 'video', 'textToVideo', ['MiniMax-H3']);

		const result = await resolveDropdownModels(node, 'video', 'textToVideo', ctx);

		expect(result.models).toEqual(['MiniMax-H3']);
		expect(result.isDynamic).toBe(true);
	});
});
