import { get } from 'lodash';
import type {
	FunctionsBase,
	ICredentialDataDecryptedObject,
	ICredentialsExpressionResolveValues,
	IExecuteData,
	IGetNodeParameterOptions,
	INode,
	INodeCredentialDescription,
	INodeCredentialsDetails,
	INodeExecutionData,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
	NodeParameterValueType,
	NodeTypeAndVersion,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	ApplicationError,
	deepCopy,
	ExpressionError,
	LoggerProxy,
	NodeHelpers,
	NodeOperationError,
} from 'n8n-workflow';
import { Container } from 'typedi';

import { HTTP_REQUEST_NODE_TYPE, HTTP_REQUEST_TOOL_NODE_TYPE } from '@/Constants';
import { extractValue } from '@/ExtractValue';
import { InstanceSettings } from '@/InstanceSettings';

import {
	cleanupParameterData,
	ensureType,
	getAdditionalKeys,
	validateValueAgainstSchema,
} from './utils';

export abstract class NodeExecutionContext implements Omit<FunctionsBase, 'getCredentials'> {
	protected readonly instanceSettings = Container.get(InstanceSettings);

	constructor(
		protected readonly workflow: Workflow,
		protected readonly node: INode,
		protected readonly additionalData: IWorkflowExecuteAdditionalData,
		protected readonly mode: WorkflowExecuteMode,
		protected readonly runExecutionData: IRunExecutionData | null = null,
		protected readonly runIndex = 0,
		protected readonly connectionInputData: INodeExecutionData[] = [],
		protected readonly executeData?: IExecuteData,
	) {}

	get logger() {
		return LoggerProxy;
	}

	getExecutionId() {
		return this.additionalData.executionId!;
	}

	getNode(): INode {
		return deepCopy(this.node);
	}

	getWorkflow() {
		const { id, name, active } = this.workflow;
		return { id, name, active };
	}

	getMode() {
		return this.mode;
	}

	getWorkflowStaticData(type: string) {
		return this.workflow.getStaticData(type, this.node);
	}

	getChildNodes(nodeName: string) {
		const output: NodeTypeAndVersion[] = [];
		const nodeNames = this.workflow.getChildNodes(nodeName);

		for (const n of nodeNames) {
			const node = this.workflow.nodes[n];
			output.push({
				name: node.name,
				type: node.type,
				typeVersion: node.typeVersion,
			});
		}
		return output;
	}

	getParentNodes(nodeName: string) {
		const output: NodeTypeAndVersion[] = [];
		const nodeNames = this.workflow.getParentNodes(nodeName);

		for (const n of nodeNames) {
			const node = this.workflow.nodes[n];
			output.push({
				name: node.name,
				type: node.type,
				typeVersion: node.typeVersion,
			});
		}
		return output;
	}

	getKnownNodeTypes() {
		return this.workflow.nodeTypes.getKnownTypes();
	}

	getRestApiUrl() {
		return this.additionalData.restApiUrl;
	}

	getInstanceBaseUrl() {
		return this.additionalData.instanceBaseUrl;
	}

	getInstanceId() {
		return this.instanceSettings.instanceId;
	}

	getTimezone() {
		return this.workflow.timezone;
	}

	getCredentialsProperties(type: string) {
		return this.additionalData.credentialsHelper.getCredentialsProperties(type);
	}

	/** Returns the requested decrypted credentials if the node has access to them */
	protected async _getCredentials<T extends object = ICredentialDataDecryptedObject>(
		type: string,
		executeData?: IExecuteData,
		connectionInputData?: INodeExecutionData[],
		itemIndex?: number,
	): Promise<T> {
		const { workflow, node, additionalData, mode, runExecutionData, runIndex } = this;
		// Get the NodeType as it has the information if the credentials are required
		const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

		// Hardcode for now for security reasons that only a single node can access
		// all credentials
		const fullAccess = [HTTP_REQUEST_NODE_TYPE, HTTP_REQUEST_TOOL_NODE_TYPE].includes(node.type);

		let nodeCredentialDescription: INodeCredentialDescription | undefined;
		if (!fullAccess) {
			if (nodeType.description.credentials === undefined) {
				throw new NodeOperationError(
					node,
					`Node type "${node.type}" does not have any credentials defined`,
					{ level: 'warning' },
				);
			}

			nodeCredentialDescription = nodeType.description.credentials.find(
				(credentialTypeDescription) => credentialTypeDescription.name === type,
			);
			if (nodeCredentialDescription === undefined) {
				throw new NodeOperationError(
					node,
					`Node type "${node.type}" does not have any credentials of type "${type}" defined`,
					{ level: 'warning' },
				);
			}

			if (
				!NodeHelpers.displayParameter(
					// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
					additionalData.currentNodeParameters || node.parameters,
					nodeCredentialDescription,
					node,
					node.parameters,
				)
			) {
				// Credentials should not be displayed even if they would be defined
				throw new NodeOperationError(node, 'Credentials not found');
			}
		}

		// Check if node has any credentials defined
		if (!fullAccess && !node.credentials?.[type]) {
			// If none are defined check if the credentials are required or not

			if (nodeCredentialDescription?.required === true) {
				// Credentials are required so error
				if (!node.credentials) {
					throw new NodeOperationError(node, 'Node does not have any credentials set', {
						level: 'warning',
					});
				}
				if (!node.credentials[type]) {
					throw new NodeOperationError(
						node,
						`Node does not have any credentials set for "${type}"`,
						{
							level: 'warning',
						},
					);
				}
			} else {
				// Credentials are not required
				throw new NodeOperationError(node, 'Node does not require credentials');
			}
		}

		if (fullAccess && !node.credentials?.[type]) {
			// Make sure that fullAccess nodes still behave like before that if they
			// request access to credentials that are currently not set it returns undefined
			throw new NodeOperationError(node, 'Credentials not found');
		}

		let expressionResolveValues: ICredentialsExpressionResolveValues | undefined;
		if (connectionInputData && runExecutionData && runIndex !== undefined) {
			expressionResolveValues = {
				connectionInputData,
				// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
				itemIndex: itemIndex || 0,
				node,
				runExecutionData,
				runIndex,
				workflow,
			} as ICredentialsExpressionResolveValues;
		}

		const nodeCredentials = node.credentials
			? node.credentials[type]
			: ({} as INodeCredentialsDetails);

		// TODO: solve using credentials via expression
		// if (name.charAt(0) === '=') {
		// 	// If the credential name is an expression resolve it
		// 	const additionalKeys = getAdditionalKeys(additionalData, mode);
		// 	name = workflow.expression.getParameterValue(
		// 		name,
		// 		runExecutionData || null,
		// 		runIndex || 0,
		// 		itemIndex || 0,
		// 		node.name,
		// 		connectionInputData || [],
		// 		mode,
		// 		additionalKeys,
		// 	) as string;
		// }

		const decryptedDataObject = await additionalData.credentialsHelper.getDecrypted(
			additionalData,
			nodeCredentials,
			type,
			mode,
			executeData,
			false,
			expressionResolveValues,
		);

		return decryptedDataObject as T;
	}

	protected get additionalKeys() {
		return getAdditionalKeys(this.additionalData, this.mode, this.runExecutionData);
	}

	/** Returns the requested resolved (all expressions replaced) node parameters. */
	getNodeParameter(
		parameterName: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		fallbackValue?: any,
		options?: IGetNodeParameterOptions,
	): NodeParameterValueType | object {
		const itemIndex = 0;
		return this._getNodeParameter(parameterName, itemIndex, fallbackValue, options);
	}

	protected _getNodeParameter(
		parameterName: string,
		itemIndex: number,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		fallbackValue?: any,
		options?: IGetNodeParameterOptions,
	): NodeParameterValueType | object {
		const { workflow, node, mode, runExecutionData, runIndex, connectionInputData, executeData } =
			this;

		const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const value = get(node.parameters, parameterName, fallbackValue);

		if (value === undefined) {
			throw new ApplicationError('Could not get parameter', { extra: { parameterName } });
		}

		if (options?.rawExpressions) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return value;
		}

		const { additionalKeys } = this;

		let returnData;

		try {
			returnData = workflow.expression.getParameterValue(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				value,
				runExecutionData,
				runIndex,
				itemIndex,
				node.name,
				connectionInputData,
				mode,
				additionalKeys,
				executeData,
				false,
				{},
				options?.contextNode?.name,
			);
			cleanupParameterData(returnData);
		} catch (e) {
			if (
				e instanceof ExpressionError &&
				node.continueOnFail &&
				node.type === 'n8n-nodes-base.set'
			) {
				// https://linear.app/n8n/issue/PAY-684
				returnData = [{ name: undefined, value: undefined }];
			} else {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				if (e.context) e.context.parameter = parameterName;
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
				e.cause = value;
				throw e;
			}
		}

		// This is outside the try/catch because it throws errors with proper messages
		if (options?.extractValue) {
			returnData = extractValue(returnData, parameterName, node, nodeType, itemIndex);
		}

		// Make sure parameter value is the type specified in the ensureType option, if needed convert it
		if (options?.ensureType) {
			returnData = ensureType(options.ensureType, returnData, parameterName, {
				itemIndex,
				runIndex,
				nodeCause: node.name,
			});
		}

		// Validate parameter value if it has a schema defined(RMC) or validateType defined
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		returnData = validateValueAgainstSchema(
			node,
			nodeType,
			returnData,
			parameterName,
			runIndex,
			itemIndex,
		);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return returnData;
	}

	evaluateExpression(expression: string, itemIndex: number = 0) {
		return this.workflow.expression.resolveSimpleParameterValue(
			`=${expression}`,
			{},
			this.runExecutionData,
			this.runIndex,
			itemIndex,
			this.node.name,
			this.connectionInputData,
			this.mode,
			this.additionalKeys,
			this.executeData,
		);
	}

	async prepareOutputData(outputData: INodeExecutionData[]) {
		return [outputData];
	}
}
