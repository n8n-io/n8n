import get from 'lodash/get';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteData,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INode,
	INodeExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	NodeParameterValueType,
	PostReceiveAction,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export interface PostReceiveActionOptions {
	node: INode;
	/** Resolves an '='-expression (or object) against the invoking context. */
	resolveValue: (
		value: NodeParameterValueType,
		itemIndex: number,
		runIndex: number,
		executeData: IExecuteData,
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
	) => NodeParameterValueType;
	/** Credentials exposed as `$credentials` in `filter` expressions. */
	getCredentials?: () => Promise<ICredentialDataDecryptedObject | undefined>;
	extraKeys?: IWorkflowDataProxyAdditionalKeys;
}

/**
 * Runs one declarative `postReceive` action over a set of items. Extracted from
 * `RoutingNode` so the declarative webhook handler shares the exact vocabulary
 * and semantics of action-node routing.
 */
// eslint-disable-next-line complexity
export async function runPostReceiveAction(
	executeSingleFunctions: IExecuteSingleFunctions,
	action: PostReceiveAction,
	inputData: INodeExecutionData[],
	responseData: IN8nHttpFullResponse,
	parameterValue: string | IDataObject | undefined,
	itemIndex: number,
	runIndex: number,
	options: PostReceiveActionOptions,
): Promise<INodeExecutionData[]> {
	if (typeof action === 'function') {
		return await action.call(executeSingleFunctions, inputData, responseData);
	}

	const { node, resolveValue, extraKeys } = options;

	if (action.type === 'rootProperty') {
		try {
			return inputData.flatMap((item) => {
				let itemContent = get(item.json, action.properties.property);

				if (!Array.isArray(itemContent)) {
					itemContent = [itemContent];
				}
				return (itemContent as IDataObject[]).map((json) => {
					return {
						json,
					};
				});
			});
		} catch (error) {
			throw new NodeOperationError(node, error as Error, {
				runIndex,
				itemIndex,
				description: `The rootProperty "${action.properties.property}" could not be found on item.`,
			});
		}
	}

	if (action.type === 'filter') {
		const passValue = action.properties.pass;
		const credentials = await options.getCredentials?.();

		inputData = inputData.filter((item) => {
			// If the value is an expression resolve it
			return resolveValue(passValue, itemIndex, runIndex, executeSingleFunctions.getExecuteData(), {
				...extraKeys,
				$credentials: credentials,
				$response: responseData,
				$responseItem: item.json,
				$value: parameterValue,
				$version: node.typeVersion,
			}) as boolean;
		});

		return inputData;
	}

	if (action.type === 'limit') {
		const maxResults = resolveValue(
			action.properties.maxResults,
			itemIndex,
			runIndex,
			executeSingleFunctions.getExecuteData(),
			{
				...extraKeys,
				$response: responseData,
				$value: parameterValue,
				$version: node.typeVersion,
			},
		) as string;
		return inputData.slice(0, parseInt(maxResults, 10));
	}

	if (action.type === 'set') {
		const { value } = action.properties;
		// If the value is an expression resolve it
		return [
			{
				json: resolveValue(value, itemIndex, runIndex, executeSingleFunctions.getExecuteData(), {
					...extraKeys,
					$response: responseData,
					$value: parameterValue,
					$version: node.typeVersion,
				}) as IDataObject,
			},
		];
	}

	if (action.type === 'sort') {
		// Sort the returned options
		const sortKey = action.properties.key;
		inputData.sort((a, b) => {
			const aSortValue = a.json[sortKey]?.toString().toLowerCase() ?? '';
			const bSortValue = b.json[sortKey]?.toString().toLowerCase() ?? '';
			if (aSortValue < bSortValue) {
				return -1;
			}
			if (aSortValue > bSortValue) {
				return 1;
			}
			return 0;
		});

		return inputData;
	}

	if (action.type === 'setKeyValue') {
		const returnData: INodeExecutionData[] = [];

		inputData.forEach((item) => {
			const returnItem: IDataObject = {};
			for (const [key, propertyValue] of Object.entries(action.properties)) {
				// If the value is an expression resolve it
				returnItem[key] = resolveValue(
					propertyValue,
					itemIndex,
					runIndex,
					executeSingleFunctions.getExecuteData(),
					{
						...extraKeys,
						$response: responseData,
						$responseItem: item.json,
						$value: parameterValue,
						$version: node.typeVersion,
					},
				) as IDataObject[string];
			}
			returnData.push({ json: returnItem });
		});

		return returnData;
	}

	if (action.type === 'binaryData') {
		const body = (responseData.body = Buffer.from(responseData.body as string));
		let { destinationProperty } = action.properties;

		destinationProperty = resolveValue(
			destinationProperty,
			itemIndex,
			runIndex,
			executeSingleFunctions.getExecuteData(),
			{
				...extraKeys,
				$response: responseData,
				$value: parameterValue,
				$version: node.typeVersion,
			},
		) as string;

		const binaryData = await executeSingleFunctions.helpers.prepareBinaryData(body);

		return inputData.map((item) => {
			if (typeof item.json === 'string') {
				// By default is probably the binary data as string set, in this case remove it
				item.json = {};
			}

			item.binary = {
				[destinationProperty]: binaryData,
			};

			return item;
		});
	}

	return [];
}
