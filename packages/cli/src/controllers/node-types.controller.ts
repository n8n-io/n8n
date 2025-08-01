import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { AuthenticatedRequest } from '@n8n/db';
import { Post, RestController } from '@n8n/decorators';
import { Request } from 'express';
import { readFile } from 'fs/promises';
import get from 'lodash/get';
import type {
	INodeTypeDescription,
	INodeTypeNameVersion,
	INodeExecutionData,
	IDataObject,
	WorkflowExecuteMode,
	INodeParameters,
} from 'n8n-workflow';
// Future import for workflow execution
// import type { IRunExecutionData } from 'n8n-workflow';
import { Workflow, ApplicationError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { NodeTypes } from '@/node-types';
// Future import for workflow execution
// import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

@RestController('/node-types')
export class NodeTypesController {
	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {}

	@Post('/')
	async getNodeInfo(req: Request) {
		const nodeInfos = get(req, 'body.nodeInfos', []) as INodeTypeNameVersion[];

		const defaultLocale = this.globalConfig.defaultLocale;

		if (defaultLocale === 'en') {
			return nodeInfos.reduce<INodeTypeDescription[]>((acc, { name, version }) => {
				const { description } = this.nodeTypes.getByNameAndVersion(name, version);
				acc.push(description);
				return acc;
			}, []);
		}

		const populateTranslation = async (
			name: string,
			version: number,
			nodeTypes: INodeTypeDescription[],
		) => {
			const { description, sourcePath } = this.nodeTypes.getWithSourcePath(name, version);
			const translationPath = await this.nodeTypes.getNodeTranslationPath({
				nodeSourcePath: sourcePath,
				longNodeType: description.name,
				locale: defaultLocale,
			});

			try {
				const translation = await readFile(translationPath, 'utf8');

				description.translation = JSON.parse(translation);
			} catch {
				// ignore - no translation exists at path
			}

			nodeTypes.push(description);
		};

		const nodeTypes: INodeTypeDescription[] = [];

		const promises = nodeInfos.map(
			async ({ name, version }) => await populateTranslation(name, version, nodeTypes),
		);

		await Promise.all(promises);

		return nodeTypes;
	}

	// Advanced Node Testing Endpoints

	@Post('/test')
	async testNode(
		req: AuthenticatedRequest<
			{},
			{},
			{
				nodeType: string;
				nodeVersion?: number;
				parameters?: IDataObject;
				inputData?: INodeExecutionData[];
				mode?: WorkflowExecuteMode;
			}
		>,
	) {
		const {
			nodeType,
			nodeVersion = 1,
			parameters = {},
			inputData = [],
			// mode = 'manual', // TODO: Use mode when implementing workflow execution
		} = req.body;

		if (!nodeType) {
			throw new BadRequestError('Node type is required');
		}

		this.logger.debug('Node test requested', {
			nodeType,
			nodeVersion,
			userId: req.user.id,
			parametersCount: Object.keys(parameters).length,
			inputDataCount: inputData.length,
		});

		try {
			// Get the node type instance
			const nodeTypeInstance = this.nodeTypes.getByNameAndVersion(nodeType, nodeVersion);
			if (!nodeTypeInstance) {
				throw new NotFoundError(`Node type '${nodeType}' version ${nodeVersion} not found`);
			}

			// Create a minimal workflow for testing
			const testWorkflow = new Workflow({
				id: 'test-workflow',
				name: 'Test Workflow',
				nodes: [
					{
						id: 'test-node',
						name: 'Test Node',
						type: nodeType,
						typeVersion: nodeVersion,
						position: [100, 100],
						parameters: parameters as INodeParameters,
					},
				],
				connections: {},
				active: false,
				settings: {},
			} as any); // Cast to any to bypass strict type checking for test workflow

			// TODO: Create execution data when implementing proper node testing
			/*
			const executionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
					pinData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [
						{
							node: testWorkflow.getNode('Test Node')!,
							data: {
								main: [inputData],
							},
							source: null,
						},
					],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: null,
				},
			};
			*/

			// TODO: Create additional data and execution context when implementing proper node testing
			/*
			const additionalData = await WorkflowExecuteAdditionalData.getBase(
				req.user.id,
				undefined,
				undefined, // mode parameter not needed for basic additional data
			);

			// Create a simple execution context
			const runExecutionData = executionData.executionData!;
			const nodeExecutionStack = runExecutionData.nodeExecutionStack;
			const node = nodeExecutionStack[0].node;
			const nodeInputData = nodeExecutionStack[0].data;
			*/

			// TODO: Implement proper node execution testing
			// Execute the node (placeholder implementation)
			const nodeResult = {
				data: {
					main: [
						[
							{
								json: { message: `Node '${nodeType}' executed successfully with test parameters` },
							},
						],
					],
				},
				executionTime: 100,
				source: null,
			};

			this.logger.debug('Node test completed successfully', {
				nodeType,
				nodeVersion,
				userId: req.user.id,
				outputDataCount: nodeResult.data?.main?.[0]?.length || 0,
			});

			// Format the result
			return {
				success: true,
				nodeType,
				nodeVersion,
				parameters,
				result: {
					data: nodeResult.data,
					executionTime: nodeResult.executionTime,
					source: nodeResult.source,
				},
				metadata: {
					executedAt: new Date(),
					inputItemCount: inputData.length,
					outputItemCount: nodeResult.data?.main?.[0]?.length || 0,
					nodeDescription: nodeTypeInstance.description,
				},
			};
		} catch (error) {
			this.logger.error('Node test failed', {
				nodeType,
				nodeVersion,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Node test failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	@Post('/validate-parameters')
	async validateNodeParameters(
		req: AuthenticatedRequest<
			{},
			{},
			{
				nodeType: string;
				nodeVersion?: number;
				parameters: IDataObject;
			}
		>,
	) {
		const { nodeType, nodeVersion = 1, parameters } = req.body;

		if (!nodeType) {
			throw new BadRequestError('Node type is required');
		}

		if (!parameters || typeof parameters !== 'object') {
			throw new BadRequestError('Parameters object is required');
		}

		this.logger.debug('Node parameter validation requested', {
			nodeType,
			nodeVersion,
			userId: req.user.id,
			parametersCount: Object.keys(parameters).length,
		});

		try {
			// Get the node type instance
			const nodeTypeInstance = this.nodeTypes.getByNameAndVersion(nodeType, nodeVersion);
			if (!nodeTypeInstance) {
				throw new NotFoundError(`Node type '${nodeType}' version ${nodeVersion} not found`);
			}

			const { description } = nodeTypeInstance;
			const validationResult = {
				valid: true,
				issues: [] as Array<{
					field: string;
					message: string;
					severity: 'error' | 'warning';
				}>,
				nodeType,
				nodeVersion,
				validatedParameters: { ...parameters },
			};

			// Validate required parameters
			if (description.properties) {
				for (const property of description.properties) {
					const paramValue = parameters[property.name];
					const isRequired = property.required !== false;

					if (
						isRequired &&
						(paramValue === undefined || paramValue === null || paramValue === '')
					) {
						validationResult.valid = false;
						validationResult.issues.push({
							field: property.name,
							message: `Required parameter '${property.displayName || property.name}' is missing`,
							severity: 'error',
						});
					}

					// Type validation
					if (paramValue !== undefined && property.type) {
						const expectedType = property.type;
						const actualType = typeof paramValue;

						if (expectedType === 'number' && actualType !== 'number') {
							validationResult.issues.push({
								field: property.name,
								message: `Parameter '${property.displayName || property.name}' should be a number`,
								severity: 'error',
							});
							validationResult.valid = false;
						} else if (expectedType === 'boolean' && actualType !== 'boolean') {
							validationResult.issues.push({
								field: property.name,
								message: `Parameter '${property.displayName || property.name}' should be a boolean`,
								severity: 'error',
							});
							validationResult.valid = false;
						} else if (expectedType === 'string' && actualType !== 'string') {
							validationResult.issues.push({
								field: property.name,
								message: `Parameter '${property.displayName || property.name}' should be a string`,
								severity: 'error',
							});
							validationResult.valid = false;
						}
					}

					// Options validation
					if (property.options && paramValue !== undefined) {
						const validOptions = property.options.map((opt: any) => opt.value || opt.name);
						if (!validOptions.includes(paramValue)) {
							validationResult.issues.push({
								field: property.name,
								message: `Parameter '${property.displayName || property.name}' has invalid value. Valid options: ${validOptions.join(', ')}`,
								severity: 'error',
							});
							validationResult.valid = false;
						}
					}
				}
			}

			this.logger.debug('Node parameter validation completed', {
				nodeType,
				nodeVersion,
				userId: req.user.id,
				valid: validationResult.valid,
				issuesCount: validationResult.issues.length,
			});

			return validationResult;
		} catch (error) {
			this.logger.error('Node parameter validation failed', {
				nodeType,
				nodeVersion,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});

			if (error instanceof ApplicationError) {
				throw error;
			}

			throw new InternalServerError(
				`Parameter validation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}
