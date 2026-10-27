import get from 'lodash/get';
import { NodeOperationError } from 'n8n-workflow';
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

export interface PostReceiveActionOptions {
	node: INode;
	/** Resolves an expression (or an object that holds expressions) for the caller. */
	resolveValue: (
		value: NodeParameterValueType,
		itemIndex: number,
		runIndex: number,
		executeData: IExecuteData,
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
	) => NodeParameterValueType;
	/** Supplies `$credentials` for `filter` actions. */
	getCredentials: () => Promise<ICredentialDataDecryptedObject | undefined>;
}

/**
 * Runs one declarative `postReceive` action over a set of items. It is not part of
 * `RoutingNode`, so that declarative triggers can shape their items with the same actions.
 */
export async function runPostReceiveAction(
	executeSingleFunctions: IExecuteSingleFunctions,
	action: PostReceiveAction,
	inputData: INodeExecutionData[],
	responseData: IN8nHttpFullResponse,
	parameterValue: string | IDataObject | undefined,
	itemIndex: number,
	runIndex: number,
	{ node, resolveValue, getCredentials }: PostReceiveActionOptions,
): Promise<INodeExecutionData[]> {
	if (typeof action === 'function') {
		return await action.call(executeSingleFunctions, inputData, responseData);
	}

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
		const credentials = await getCredentials();

		inputData = inputData.filter((item) => {
			// If the value is an expression resolve it
			return resolveValue(passValue, itemIndex, runIndex, executeSingleFunctions.getExecuteData(), {
				$credentials: credentials,
				$response: responseData,
				$responseItem: item.json,
				$value: parameterValue,
				$version: node.typeVersion,
			});
		});

		return inputData;
	}

	if (action.type === 'limit') {
		const maxResults = resolveValue(
			action.properties.maxResults,
			itemIndex,
			runIndex,
			executeSingleFunctions.getExecuteData(),
			{ $response: responseData, $value: parameterValue, $version: node.typeVersion },
		) as string;
		return inputData.slice(0, parseInt(maxResults, 10));
	}

	if (action.type === 'set') {
		const { value } = action.properties;
		// If the value is an expression resolve it
		return [
			{
				json: resolveValue(value, itemIndex, runIndex, executeSingleFunctions.getExecuteData(), {
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
		const toSortValue = (item: INodeExecutionData) =>
			// eslint-disable-next-line @typescript-eslint/no-base-to-string -- object values sort as "[object Object]", kept for compatibility
			item.json[sortKey]?.toString().toLowerCase() ?? '';
		inputData.sort((a, b) => {
			const aSortValue = toSortValue(a);
			const bSortValue = toSortValue(b);
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
						$response: responseData,
						$responseItem: item.json,
						$value: parameterValue,
						$version: node.typeVersion,
					},
				);
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
			{ $response: responseData, $value: parameterValue, $version: node.typeVersion },
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
