/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { WorkflowsConfig } from '@n8n/config';
import type { WorkflowEntity, IWorkflowDb } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { chunk, cloneDeep, isEqual } from 'lodash';
import {
	ActiveWorkflows,
	ErrorReporter,
	InstanceSettings,
	Logger,
	PollContext,
	TriggerContext,
	type IGetExecutePollFunctions,
	type IGetExecuteTriggerFunctions,
} from 'n8n-core';
import type {
	ExecutionError,
	IDeferredPromise,
	IExecuteResponsePromiseData,
	INode,
	INodeExecutionData,
	IRun,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	WorkflowActivateMode,
	WorkflowExecuteMode,
	INodeType,
	WorkflowId,
} from 'n8n-workflow';
import {
	Workflow,
	WorkflowActivationError,
	WebhookPathTakenError,
	UnexpectedError,
	NodeHelpers,
} from 'n8n-workflow';
import { strict } from 'node:assert';

import { ActivationErrorsService } from '@/activation-errors.service';
import { ActiveExecutions } from '@/active-executions';
import {
	STARTING_NODES,
	WORKFLOW_REACTIVATE_INITIAL_TIMEOUT,
	WORKFLOW_REACTIVATE_MAX_TIMEOUT,
} from '@/constants';
import { executeErrorWorkflow } from '@/execution-lifecycle/execute-error-workflow';
import { ExecutionService } from '@/executions/execution.service';
import { ExternalHooks } from '@/external-hooks';
import { NodeTypes } from '@/node-types';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { ActiveWorkflowsService } from '@/services/active-workflows.service';
import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import { WebhookService } from '@/webhooks/webhook.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';
import { formatWorkflow } from '@/workflows/workflow.formatter';

interface QueuedActivation {
	activationMode: WorkflowActivateMode;
	lastTimeout: number;
	timeout: NodeJS.Timeout;
	workflowData: IWorkflowDb;
}

@Service()
export class ActiveWorkflowManager {
	private queuedActivations: Record<WorkflowId, QueuedActivation> = {};

	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly activeWorkflows: ActiveWorkflows,
		private readonly activeExecutions: ActiveExecutions,
		private readonly externalHooks: ExternalHooks,
		private readonly nodeTypes: NodeTypes,
		private readonly webhookService: WebhookService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly activationErrorsService: ActivationErrorsService,
		private readonly executionService: ExecutionService,
		private readonly workflowStaticDataService: WorkflowStaticDataService,
		private readonly activeWorkflowsService: ActiveWorkflowsService,
		private readonly workflowExecutionService: WorkflowExecutionService,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly workflowsConfig: WorkflowsConfig,
	) {
		this.logger = this.logger.scoped(['workflow-activation']);
	}

	async init() {
		strict(
			this.instanceSettings.instanceRole !== 'unset',
			'Active workflow manager expects instance role to be set',
		);

		await this.addActiveWorkflows('init');

		await this.externalHooks.run('activeWorkflows.initialized');
	}

	async getAllWorkflowActivationErrors() {
		return await this.activationErrorsService.getAll();
	}

	/**
	 * Removes all the currently active workflows from memory.
	 */
	async removeAll() {
		let activeWorkflowIds: string[] = [];
		this.logger.debug('Call to remove all active workflows received (removeAll)');

		activeWorkflowIds.push(...this.activeWorkflows.allActiveWorkflows());

		const activeWorkflows = await this.activeWorkflowsService.getAllActiveIdsInStorage();
		activeWorkflowIds = [...activeWorkflowIds, ...activeWorkflows];
		// Make sure IDs are unique
		activeWorkflowIds = Array.from(new Set(activeWorkflowIds));

		const removePromises = [];
		for (const workflowId of activeWorkflowIds) {
			removePromises.push(this.remove(workflowId));
		}

		await Promise.all(removePromises);
	}

	/**
	 * Returns the ids of the currently active workflows from memory.
	 */
	allActiveInMemory() {
		return this.activeWorkflows.allActiveWorkflows();
	}

	/**
	 * Returns if the workflow is stored as `active`.
	 *
	 * @important Do not confuse with `ActiveWorkflows.isActive()`,
	 * which checks if the workflow is active in memory.
	 */
	async isActive(workflowId: WorkflowId) {
		const workflow = await this.workflowRepository.findOne({
			select: ['active'],
			where: { id: workflowId },
		});

		return !!workflow?.active;
	}

	/**
	 * Register workflow-defined webhooks in the `workflow_entity` table.
	 */
	async addWebhooks(
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	) {
		const webhooks = WebhookHelpers.getWorkflowWebhooks(workflow, additionalData, undefined, true);
		let path = '';

		if (webhooks.length === 0) return false;

		for (const webhookData_orig of webhooks) {
			const webhookData = cloneDeep(webhookData_orig); // Clone to modify safely

			const node = workflow.getNode(webhookData.node) as INode;
			const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

			this.logger.info(`[ADDWEBHOOKS_INFO] Node "${node.name}" (ID: ${node.id}) parameters before processing: ${JSON.stringify(node.parameters)}`);
			this.logger.info(`[ADDWEBHOOKS_INFO] webhookData for node "${node.name}": method=${webhookData.httpMethod}, path=${webhookData.path}`);

			let pathToUseForRegistration = webhookData.path;

			// Logic to potentially update node.parameters.path and pathToUseForRegistration
			if (nodeType?.description.defaults?.name === 'Webhook') {
				// Ensure node.parameters exists. If API sends a node without a parameters object.
				node.parameters = node.parameters || {};

				// Apply known defaults if not present, to make the in-memory object more complete
				// before comparison with the DB state. Based on Webhook/description.ts
				if (node.parameters.httpMethod === undefined) node.parameters.httpMethod = 'GET';
				if (node.parameters.authentication === undefined) node.parameters.authentication = 'none';
				if (node.parameters.responseMode === undefined) node.parameters.responseMode = 'onReceived';
				if (node.parameters.responseCode === undefined) node.parameters.responseCode = 200;
				if (node.parameters.options === undefined) node.parameters.options = {};
				// Path default is '', which we handle specifically below.

				// Ensure webhookId exists for the node.
				if (!node.webhookId) {
					node.webhookId = node.id; // Assign node.id as webhookId
					this.logger.info(
						`[ADDWEBHOOKS_WEBHOOKID_ASSIGN] Node "${node.name}" (ID: ${node.id}) had no webhookId. Assigned node.id as webhookId: "${node.webhookId}".`,
					);
					workflow.staticData = workflow.staticData || {};
					// No need to mark nodesParametersChanged here yet, the path assignment will do it if needed
				}

				// Update node.parameters.path if it's empty or different from node.webhookId.
				if (node.parameters.path === '' || node.parameters.path === undefined || node.parameters.path !== node.webhookId) {
					const oldPath = node.parameters.path;
					node.parameters.path = node.webhookId; // Set parameters.path to the webhookId
					pathToUseForRegistration = node.webhookId;
					webhookData.path = pathToUseForRegistration;

					this.logger.info(
						`[ADDWEBHOOKS_PATH_UPDATE] Node "${node.name}" (ID: ${node.id}) parameters.path updated from "${oldPath === undefined ? 'undefined' : oldPath}" to "${node.parameters.path}". Registering with path: "${pathToUseForRegistration}".`,
					);
					
					workflow.staticData = workflow.staticData || {};
					workflow.staticData.nodesParametersChanged = true; // Mark for saving updated node parameters
				} else {
					pathToUseForRegistration = node.parameters.path;
					webhookData.path = pathToUseForRegistration;
					this.logger.info(
						`[ADDWEBHOOKS_PATH_CONFIRM] Node "${node.name}" (ID: ${node.id}) parameters.path ("${node.parameters.path}") is already set or correctly matches webhookId. Registering with path: "${pathToUseForRegistration}".`,
					);
				}
			}

			// Ensure leading/trailing slashes are handled consistently
			if (pathToUseForRegistration.startsWith('/')) {
				pathToUseForRegistration = pathToUseForRegistration.slice(1);
			}
			if (pathToUseForRegistration.endsWith('/')) {
				pathToUseForRegistration = pathToUseForRegistration.slice(0, -1);
			}

			const methodForRegistration = webhookData.httpMethod;

			const webhookToStore = this.webhookService.createWebhook({
				workflowId: webhookData.workflowId,
				webhookPath: pathToUseForRegistration,
				node: node.name,
				method: methodForRegistration,
			});

			// Handle webhookId for dynamic paths for the object to be stored
			if ((pathToUseForRegistration.startsWith(':') || pathToUseForRegistration.includes(':/')) && node.webhookId) {
				webhookToStore.webhookId = node.webhookId;
				webhookToStore.pathLength = pathToUseForRegistration.split('/').length;
			}

			try {
				await this.webhookService.storeWebhook(webhookToStore); // Stores based on pathToUseForRegistration (node.id)
				// Pass the potentially modified webhookData (with updated path) to createWebhookIfNotExists
				await this.webhookService.createWebhookIfNotExists(workflow, webhookData, mode, activation); // webhookData.path is node.id

				// ***** NEW: Populate cache immediately after storing and creating/checking external webhook *****
				await this.webhookService.populateCache(); 
				this.logger.info(`[ADDWEBHOOKS_CACHE_POPULATED] Webhook cache populated immediately after store/create for node "${node.name}", path "${webhookData.path}".`);

			} catch (error) {
				if (activation === 'init' && error.name === 'QueryFailedError') {
					continue;
				}

				try {
					await this.clearWebhooks(workflow.id);
				} catch (error1) {
					this.errorReporter.error(error1);
					this.logger.error(
						`Could not remove webhooks of workflow "${workflow.id}" because of error: "${(error1 as Error).message}"`,
					);
				}

				if (error instanceof Error && error.name === 'QueryFailedError') {
					error = new WebhookPathTakenError(webhookToStore.node, error);
				} else if ((error as any).detail) {
					// it's a error running the webhook methods (checkExists, create)
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					(error as any).message = (error as any).detail;
				}

				throw error;
			}
		} // End of for...of webhooks loop

		// The main populateCache was here. It's now moved into the loop for more immediate updates.
		// await this.webhookService.populateCache();


		if (webhooks.length > 0 ) {
			if (workflow.staticData?.nodesParametersChanged) {
				this.logger.info(`[ADDWEBHOOKS_SAVE_FLAG_TRIGGERED] Workflow "${workflow.id}" nodesParametersChanged flag was true. Proceeding with DB update.`);
				delete workflow.staticData.nodesParametersChanged; // Clear flag immediately

				const entityToUpdate = await this.workflowRepository.findById(workflow.id);
				if (entityToUpdate) {
					// Log state of WebhookTrigger from fresh entity
					const webhookNodeForLog = entityToUpdate.nodes.find(n => n.name === 'WebhookTrigger' && n.type === 'n8n-nodes-base.webhook');
					if (webhookNodeForLog) {
						this.logger.info(`[ADDWEBHOOKS_FRESH_ENTITY_PARAMS] Fresh DB WebhookTrigger (${webhookNodeForLog.id}) params: ${JSON.stringify(webhookNodeForLog.parameters)}`);
						this.logger.info(`[ADDWEBHOOKS_FRESH_ENTITY_WEBHOOKID] Fresh DB WebhookTrigger (${webhookNodeForLog.id}) webhookId: "${webhookNodeForLog.webhookId}"`);
					} else {
						this.logger.warn(`[ADDWEBHOOKS_FRESH_ENTITY] WebhookTrigger node not found in fresh entity for initial logging.`);
					}

					// Log the structure of workflow.nodes and entityToUpdate.nodes
					this.logger.info(`[ADDWEBHOOKS_DEBUG] workflow.nodes keys: ${Object.keys(workflow.nodes).join(', ')}`);
					this.logger.info(`[ADDWEBHOOKS_DEBUG] entityToUpdate.nodes count: ${entityToUpdate.nodes.length}`);
					for (const dbNode of entityToUpdate.nodes) {
						this.logger.info(`[ADDWEBHOOKS_DEBUG] DB entity node: id=${dbNode.id}, name=${dbNode.name}, type=${dbNode.type}`);
					}

					let anActualSaveOccurred = false;
					// We iterate through the nodes of the 'workflow' object (in-memory, modified)
					// and apply their state to 'entityToUpdate' (from DB).
					for (const nodeKey in workflow.nodes) {
						const sourceNodeInMemory = workflow.nodes[nodeKey]; // Has our desired parameters and webhookId
						
						// First try to find by ID, then try by name + type if ID doesn't match
						let targetNodeInDbEntity = entityToUpdate.nodes.find(n => n.id === nodeKey);
						
						if (!targetNodeInDbEntity) {
							// If not found by key, try to find by node ID and name
							targetNodeInDbEntity = entityToUpdate.nodes.find(n => 
								(n.id === sourceNodeInMemory.id || n.name === sourceNodeInMemory.name) && 
								n.type === sourceNodeInMemory.type
							);
							
							if (targetNodeInDbEntity) {
								this.logger.info(`[ADDWEBHOOKS_DEBUG] Found node by name+type instead of key. Key: "${nodeKey}", Found node: id=${targetNodeInDbEntity.id}, name=${targetNodeInDbEntity.name}`);
							}
						}

						// We are interested ONLY in Webhook nodes for this specific parameters.path and webhookId update logic
						const nodeType = this.nodeTypes.getByNameAndVersion(sourceNodeInMemory.type, sourceNodeInMemory.typeVersion);
						if (nodeType?.description.defaults?.name === 'Webhook') {
							if (targetNodeInDbEntity) {
								this.logger.info(`[ADDWEBHOOKS_COMPARE] Processing webhook node "${sourceNodeInMemory.name}" (ID: ${sourceNodeInMemory.id})`);
								
								const currentDbParams = targetNodeInDbEntity.parameters || {}; // Use || {} for safer default
								const desiredParams = sourceNodeInMemory.parameters || {};   // Use || {} for safer default

								const currentDbWebhookId = targetNodeInDbEntity.webhookId;
								const desiredWebhookId = sourceNodeInMemory.webhookId; // This should be node.id

								this.logger.info(`[ADDWEBHOOKS_COMPARE] Comparing node "${sourceNodeInMemory.name}" (ID: ${sourceNodeInMemory.id})`);
								this.logger.info(`[ADDWEBHOOKS_COMPARE_PARAMS] Current DB Params (raw from entity): ${JSON.stringify(targetNodeInDbEntity.parameters)}`);
								this.logger.info(`[ADDWEBHOOKS_COMPARE_PARAMS] Desired In-Memory Params (raw from sourceNode): ${JSON.stringify(sourceNodeInMemory.parameters)}`);
								this.logger.info(`[ADDWEBHOOKS_COMPARE_PARAMS] currentDbParams (processed for isEqual): ${JSON.stringify(currentDbParams)}`);
								this.logger.info(`[ADDWEBHOOKS_COMPARE_PARAMS] desiredParams (processed for isEqual): ${JSON.stringify(desiredParams)}`);
								const paramsAreEqual = isEqual(cloneDeep(currentDbParams), cloneDeep(desiredParams)); // cloneDeep before isEqual for safety
								this.logger.info(`[ADDWEBHOOKS_COMPARE_PARAMS] Result of isEqual for params: ${paramsAreEqual}`);
								
								let nodeSpecificChange = false;
								if (!paramsAreEqual) { // cloneDeep before isEqual for safety
									targetNodeInDbEntity.parameters = cloneDeep(desiredParams); // Assign the modified parameters
									this.logger.info(`[ADDWEBHOOKS_PARAM_CHANGE_APPLIED] Node "${sourceNodeInMemory.name}" (ID: ${sourceNodeInMemory.id}) parameters updated in entityToUpdate.`);
									nodeSpecificChange = true;
								}

								this.logger.info(`[ADDWEBHOOKS_COMPARE_WEBHOOKID] Current DB WebhookID: "${currentDbWebhookId}" (type: ${typeof currentDbWebhookId})`);
								this.logger.info(`[ADDWEBHOOKS_COMPARE_WEBHOOKID] Desired In-Memory WebhookID: "${desiredWebhookId}" (type: ${typeof desiredWebhookId})`);
								const webhookIdsAreEqual = (currentDbWebhookId === desiredWebhookId);
								this.logger.info(`[ADDWEBHOOKS_COMPARE_WEBHOOKID] Result of '===' for webhookIds: ${webhookIdsAreEqual}`);

								if (!webhookIdsAreEqual) {
									targetNodeInDbEntity.webhookId = desiredWebhookId; // Assign the modified webhookId
									this.logger.info(`[ADDWEBHOOKS_WEBHOOKID_CHANGE_APPLIED] Node "${sourceNodeInMemory.name}" (ID: ${sourceNodeInMemory.id}) webhookId updated in entityToUpdate.`);
									nodeSpecificChange = true;
								}
                                if (nodeSpecificChange) {
                                    anActualSaveOccurred = true; // Mark that we have made changes to entityToUpdate
                                }
							} else {
								this.logger.warn(`[ADDWEBHOOKS_COMPARE_WARN] Node "${sourceNodeInMemory.name}" (ID: ${sourceNodeInMemory.id}) from in-memory workflow not found in fresh DB entity.nodes.`);
							}
						}
					}

					if (anActualSaveOccurred) {
						await this.workflowRepository.save(entityToUpdate);
						this.logger.info(`[ADDWEBHOOKS_SAVE_DB_SUCCESS] Successfully saved entityToUpdate for workflow "${workflow.id}" to database due to nodesParametersChanged flag and detected modifications.`);
						
						// --- Cache refresh logic (similar to previous, ensure it fits your actual methods) ---
						const reloadedWorkflowEntity = await this.workflowRepository.findById(workflow.id);
						if (reloadedWorkflowEntity) {
							const reloadedWorkflowInstance = new Workflow({
                                id: reloadedWorkflowEntity.id,
                                name: reloadedWorkflowEntity.name,
                                nodes: reloadedWorkflowEntity.nodes,
                                connections: reloadedWorkflowEntity.connections,
                                active: reloadedWorkflowEntity.active,
                                nodeTypes: this.nodeTypes,
                                staticData: reloadedWorkflowEntity.staticData,
                                settings: reloadedWorkflowEntity.settings,
                            });
							
							if (this.activeWorkflows.isActive(reloadedWorkflowEntity.id)) {
								await this.activeWorkflows.remove(reloadedWorkflowEntity.id);
							}
							
							const hasTriggersOrPollers = reloadedWorkflowInstance.getTriggerNodes().length > 0 || reloadedWorkflowInstance.getPollNodes().length > 0;
							if (hasTriggersOrPollers && this.shouldAddTriggersAndPollers()) {
								try {
									const additionalDataForCache = await WorkflowExecuteAdditionalData.getBase();
									await this.activeWorkflows.add(
										reloadedWorkflowEntity.id,
										reloadedWorkflowInstance,
										additionalDataForCache,
										'trigger', 
										'update',  
										this.getExecuteTriggerFunctions(reloadedWorkflowEntity, additionalDataForCache, 'trigger', 'update'),
										this.getExecutePollFunctions(reloadedWorkflowEntity, additionalDataForCache, 'trigger', 'update')
									);
									this.logger.info(`[ADDWEBHOOKS_CACHE_REFRESH_SUCCESS] Post-save cache refresh (trigger/poller) for workflow "${workflow.id}".`);
								} catch (cacheAddError) {
									this.logger.error(`[ADDWEBHOOKS_CACHE_REFRESH_ERROR] Error re-adding workflow ${workflow.id} to activeWorkflows cache: ${cacheAddError.message}`);
								}
							} else {
								this.logger.info(`[ADDWEBHOOKS_CACHE_REFRESH_INFO] Workflow "${workflow.id}" is webhook-only or instance not leader; trigger/poller cache refresh skipped.`);
							}
						}
                        // --- End cache refresh logic ---
					} else {
						this.logger.info(`[ADDWEBHOOKS_SAVE_FLAG_NO_EFFECTIVE_CHANGES] nodesParametersChanged was true, but no differences were applied to DB entity for workflow "${workflow.id}". This might indicate an issue if changes were expected.`);
					}
				} else {
					this.logger.warn(`[ADDWEBHOOKS_SAVE_FLAG_ENTITY_NOT_FOUND] Workflow entity with ID "${workflow.id}" not found for saving when nodesParametersChanged was true.`);
				}
			}

			// Ensure the entire staticData object is saved if it was modified or if other parts of it might have changed.
			if (workflow.staticData) {
				this.logger.info(`[ADDWEBHOOKS_SAVE_STATIC_DATA] Attempting to save workflow.staticData for workflow "${workflow.id}".`);
				try {
		await this.workflowStaticDataService.saveStaticData(workflow);
					this.logger.info(`[ADDWEBHOOKS_SAVE_STATIC_DATA] Successfully saved workflow.staticData for workflow "${workflow.id}".`);
				} catch (staticDataSaveError) {
					 this.logger.error(`[ADDWEBHOOKS_SAVE_STATIC_DATA] Error saving workflow.staticData for workflow "${workflow.id}": ${(staticDataSaveError as Error).message}`);
				}
			}
		}

		// The main populateCache was here. It's now moved into the loop for more immediate updates.
		// await this.webhookService.populateCache();

		this.logger.debug(`Added webhooks for workflow "${workflow.name}" (ID ${workflow.id})`, {
			workflowId: workflow.id,
		});

		return true;
	}

	/**
	 * Remove all webhooks of a workflow from the database, and
	 * deregister those webhooks from external services.
	 */
	async clearWebhooks(workflowId: WorkflowId) {
		const workflowData = await this.workflowRepository.findOne({
			where: { id: workflowId },
		});

		if (workflowData === null) {
			throw new UnexpectedError('Could not find workflow', { extra: { workflowId } });
		}

		const workflow = new Workflow({
			id: workflowId,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: workflowData.active,
			nodeTypes: this.nodeTypes,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});

		const mode = 'internal';

		const additionalData = await WorkflowExecuteAdditionalData.getBase();

		const webhooks = WebhookHelpers.getWorkflowWebhooks(workflow, additionalData, undefined, true);

		for (const webhookData of webhooks) {
			await this.webhookService.deleteWebhook(workflow, webhookData, mode, 'update');
		}

		await this.workflowStaticDataService.saveStaticData(workflow);

		await this.webhookService.deleteWorkflowWebhooks(workflowId);
	}

	/**
	 * Return poll function which gets the global functions from n8n-core
	 * and overwrites the emit to be able to start it in subprocess
	 */
	getExecutePollFunctions(
		workflowData: IWorkflowDb,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): IGetExecutePollFunctions {
		return (workflow: Workflow, node: INode) => {
			const __emit = (
				data: INodeExecutionData[][],
				responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
				donePromise?: IDeferredPromise<IRun | undefined>,
			) => {
				this.logger.debug(`Received event to trigger execution for workflow "${workflow.name}"`);
				void this.workflowStaticDataService.saveStaticData(workflow);
				const executePromise = this.workflowExecutionService.runWorkflow(
					workflowData,
					node,
					data,
					additionalData,
					mode,
					responsePromise,
				);

				if (donePromise) {
					void executePromise.then((executionId) => {
						this.activeExecutions
							.getPostExecutePromise(executionId)
							.then(donePromise.resolve)
							.catch(donePromise.reject);
					});
				} else {
					void executePromise.catch((error: Error) => this.logger.error(error.message, { error }));
				}
			};

			const __emitError = (error: ExecutionError) => {
				void this.executionService
					.createErrorExecution(error, node, workflowData, workflow, mode)
					.then(() => {
						this.executeErrorWorkflow(error, workflowData, mode);
					});
			};

			return new PollContext(workflow, node, additionalData, mode, activation, __emit, __emitError);
		};
	}

	/**
	 * Return trigger function which gets the global functions from n8n-core
	 * and overwrites the emit to be able to start it in subprocess
	 */
	getExecuteTriggerFunctions(
		workflowData: IWorkflowDb,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): IGetExecuteTriggerFunctions {
		return (workflow: Workflow, node: INode) => {
			const emit = (
				data: INodeExecutionData[][],
				responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
				donePromise?: IDeferredPromise<IRun | undefined>,
			) => {
				this.logger.debug(`Received trigger for workflow "${workflow.name}"`);
				void this.workflowStaticDataService.saveStaticData(workflow);

				const executePromise = this.workflowExecutionService.runWorkflow(
					workflowData,
					node,
					data,
					additionalData,
					mode,
					responsePromise,
				);

				if (donePromise) {
					void executePromise.then((executionId) => {
						this.activeExecutions
							.getPostExecutePromise(executionId)
							.then(donePromise.resolve)
							.catch(donePromise.reject);
					});
				} else {
					executePromise.catch((error: Error) => this.logger.error(error.message, { error }));
				}
			};
			const emitError = (error: Error): void => {
				this.logger.info(
					`The trigger node "${node.name}" of workflow "${workflowData.name}" failed with the error: "${error.message}". Will try to reactivate.`,
					{
						nodeName: node.name,
						workflowId: workflowData.id,
						workflowName: workflowData.name,
					},
				);

				// Remove the workflow as "active"

				void this.activeWorkflows.remove(workflowData.id);

				void this.activationErrorsService.register(workflowData.id, error.message);

				// Run Error Workflow if defined
				const activationError = new WorkflowActivationError(
					`There was a problem with the trigger node "${node.name}", for that reason did the workflow had to be deactivated`,
					{ cause: error, node },
				);
				this.executeErrorWorkflow(activationError, workflowData, mode);

				this.addQueuedWorkflowActivation(activation, workflowData as WorkflowEntity);
			};
			return new TriggerContext(workflow, node, additionalData, mode, activation, emit, emitError);
		};
	}

	executeErrorWorkflow(
		error: ExecutionError,
		workflowData: IWorkflowBase,
		mode: WorkflowExecuteMode,
	) {
		const fullRunData: IRun = {
			data: {
				resultData: {
					error,
					runData: {},
				},
			},
			finished: false,
			mode,
			startedAt: new Date(),
			stoppedAt: new Date(),
			status: 'running',
		};

		executeErrorWorkflow(workflowData, fullRunData, mode);
	}

	/**
	 * Register as active in memory all workflows stored as `active`,
	 * only on instance init or (in multi-main setup) on leadership change.
	 */
	async addActiveWorkflows(activationMode: 'init' | 'leadershipChange') {
		const dbWorkflowIds = await this.workflowRepository.getAllActiveIds();

		if (dbWorkflowIds.length === 0) return;

		if (this.instanceSettings.isLeader) {
			this.logger.info(' ================================');
			this.logger.info('   Start Active Workflows:');
			this.logger.info(' ================================');
		}

		const batches = chunk(dbWorkflowIds, this.workflowsConfig.activationBatchSize);

		for (const batch of batches) {
			const activationPromises = batch.map(async (dbWorkflowId) => {
				await this.activateWorkflow(dbWorkflowId, activationMode);
			});

			await Promise.all(activationPromises);
		}

		this.logger.debug('Finished activating all workflows');
	}

	private async activateWorkflow(
		workflowId: WorkflowId,
		activationMode: 'init' | 'leadershipChange',
	) {
		const dbWorkflow = await this.workflowRepository.findById(workflowId);
		if (!dbWorkflow) return;

		try {
			const added = await this.add(dbWorkflow.id, activationMode, dbWorkflow, {
				shouldPublish: false,
			});

			if (added.webhooks || added.triggersAndPollers) {
				this.logger.info(`   - ${formatWorkflow(dbWorkflow)})`);
				this.logger.info('     => Started');
				this.logger.debug(`Activated workflow ${formatWorkflow(dbWorkflow)}`, {
					workflowName: dbWorkflow.name,
					workflowId: dbWorkflow.id,
				});
			}
		} catch (error) {
			this.errorReporter.error(error);
			this.logger.info(
				`     => ERROR: Workflow ${formatWorkflow(dbWorkflow)} could not be activated on first try, keep on trying if not an auth issue`,
			);

			this.logger.info(`               ${error.message}`);
			this.logger.error(
				`Issue on initial workflow activation try of ${formatWorkflow(dbWorkflow)} (startup)`,
				{
					workflowName: dbWorkflow.name,
					workflowId: dbWorkflow.id,
				},
			);

			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			this.executeErrorWorkflow(error, dbWorkflow, 'internal');

			// do not keep trying to activate on authorization error
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			if (error.message.includes('Authorization')) return;

			this.addQueuedWorkflowActivation('init', dbWorkflow);
		}
	}

	async clearAllActivationErrors() {
		this.logger.debug('Clearing all activation errors');

		await this.activationErrorsService.clearAll();
	}

	@OnLeaderTakeover()
	async addAllTriggerAndPollerBasedWorkflows() {
		await this.addActiveWorkflows('leadershipChange');
	}

	@OnLeaderStepdown()
	@OnShutdown()
	async removeAllTriggerAndPollerBasedWorkflows() {
		await this.activeWorkflows.removeAllTriggerAndPollerBasedWorkflows();
	}

	/**
	 * Register a workflow as active.
	 *
	 * An activatable workflow may be webhook-, trigger-, or poller-based:
	 *
	 * - A `webhook` is an HTTP-based node that can start a workflow when called
	 * by a third-party service.
	 * - A `poller` is an HTTP-based node that can start a workflow when detecting
	 * a change while regularly checking a third-party service.
	 * - A `trigger` is any non-HTTP-based node that can start a workflow, e.g. a
	 * time-based node like Schedule Trigger or a message-queue-based node.
	 *
	 * Note that despite the name, most "trigger" nodes are actually webhook-based
	 * and so qualify as `webhook`, e.g. Stripe Trigger.
	 *
	 * Triggers and pollers are registered as active in memory at `ActiveWorkflows`,
	 * but webhooks are registered by being entered in the `webhook_entity` table,
	 * since webhooks do not require continuous execution.
	 *
	 * Returns whether this operation added webhooks and/or triggers and pollers.
	 */
	async add(
		workflowId: WorkflowId,
		activationMode: WorkflowActivateMode,
		existingWorkflow?: WorkflowEntity,
		{ shouldPublish } = { shouldPublish: true },
	) {
		const added = { webhooks: false, triggersAndPollers: false };

		if (this.instanceSettings.isMultiMain && shouldPublish) {
			void this.publisher.publishCommand({
				command: 'add-webhooks-triggers-and-pollers',
				payload: { workflowId },
			});

			return added;
		}

		let workflow: Workflow;

		const shouldAddWebhooks = this.shouldAddWebhooks(activationMode);
		const shouldAddTriggersAndPollers = this.shouldAddTriggersAndPollers();

		try {
			const dbWorkflow = existingWorkflow ?? (await this.workflowRepository.findById(workflowId));

			if (!dbWorkflow) {
				throw new WorkflowActivationError(`Failed to find workflow with ID "${workflowId}"`, {
					level: 'warning',
				});
			}

			if (['init', 'leadershipChange'].includes(activationMode) && !dbWorkflow.active) {
				this.logger.debug(
					`Skipping workflow ${formatWorkflow(dbWorkflow)} as it is no longer active`,
					{ workflowId: dbWorkflow.id },
				);

				return added;
			}

			workflow = new Workflow({
				id: dbWorkflow.id,
				name: dbWorkflow.name,
				nodes: cloneDeep(dbWorkflow.nodes),
				connections: cloneDeep(dbWorkflow.connections),
				active: dbWorkflow.active,
				nodeTypes: this.nodeTypes,
				staticData: cloneDeep(dbWorkflow.staticData),
				settings: cloneDeep(dbWorkflow.settings),
			});

			const canBeActivated = this.checkIfWorkflowCanBeActivated(workflow, STARTING_NODES);

			if (!canBeActivated) {
				throw new WorkflowActivationError(
					`Workflow ${formatWorkflow(dbWorkflow)} has no node to start the workflow - at least one trigger, poller or webhook node is required`,
					{ level: 'warning' },
				);
			}

			const additionalData = await WorkflowExecuteAdditionalData.getBase();

			if (shouldAddWebhooks) {
				added.webhooks = await this.addWebhooks(
					workflow,
					additionalData,
					'trigger',
					activationMode,
				);
			}

			if (shouldAddTriggersAndPollers) {
				added.triggersAndPollers = await this.addTriggersAndPollers(dbWorkflow, workflow, {
					activationMode,
					executionMode: 'trigger',
					additionalData,
				});
			}

			// Workflow got now successfully activated so make sure nothing is left in the queue
			this.removeQueuedWorkflowActivation(workflowId);

			await this.activationErrorsService.deregister(workflowId);

			const triggerCount = this.countTriggers(workflow, additionalData);
			await this.workflowRepository.updateWorkflowTriggerCount(workflow.id, triggerCount);
		} catch (e) {
			const error = e instanceof Error ? e : new Error(`${e}`);
			await this.activationErrorsService.register(workflowId, error.message);

			throw e;
		}

		// If for example webhooks get created it sometimes has to save the
		// id of them in the static data. So make sure that data gets persisted.
		await this.workflowStaticDataService.saveStaticData(workflow);

		return added;
	}

	/**
	 * A workflow can only be activated if it has a node which has either triggers
	 * or webhooks defined.
	 *
	 * @param {string[]} [ignoreNodeTypes] Node-types to ignore in the check
	 */
	checkIfWorkflowCanBeActivated(workflow: Workflow, ignoreNodeTypes?: string[]): boolean {
		let node: INode;
		let nodeType: INodeType | undefined;

		for (const nodeName of Object.keys(workflow.nodes)) {
			node = workflow.nodes[nodeName];

			if (node.disabled === true) {
				// Deactivated nodes can not trigger a run so ignore
				continue;
			}

			if (ignoreNodeTypes !== undefined && ignoreNodeTypes.includes(node.type)) {
				continue;
			}

			nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

			if (nodeType === undefined) {
				// Type is not known so check is not possible
				continue;
			}

			if (
				nodeType.poll !== undefined ||
				nodeType.trigger !== undefined ||
				nodeType.webhook !== undefined
			) {
				// Is a trigger node. So workflow can be activated.
				return true;
			}
		}

		return false;
	}

	/**
	 * Count all triggers in the workflow, excluding Manual Trigger.
	 */
	private countTriggers(workflow: Workflow, additionalData: IWorkflowExecuteAdditionalData) {
		const triggerFilter = (nodeType: INodeType) =>
			!!nodeType.trigger && !nodeType.description.name.includes('manualTrigger');

		// Retrieve unique webhooks as some nodes have multiple webhooks
		const workflowWebhooks = WebhookHelpers.getWorkflowWebhooks(
			workflow,
			additionalData,
			undefined,
			true,
		);

		const uniqueWebhooks = workflowWebhooks.reduce<Set<string>>((acc, webhook) => {
			acc.add(webhook.node);
			return acc;
		}, new Set());

		return (
			workflow.queryNodes(triggerFilter).length +
			workflow.getPollNodes().length +
			uniqueWebhooks.size
		);
	}

	/**
	 * Add a workflow to the activation queue.
	 * Meaning it will keep on trying to activate it in regular
	 * amounts indefinitely.
	 */
	private addQueuedWorkflowActivation(
		activationMode: WorkflowActivateMode,
		workflowData: WorkflowEntity,
	) {
		const workflowId = workflowData.id;
		const workflowName = workflowData.name;

		const retryFunction = async () => {
			this.logger.info(`Try to activate workflow "${workflowName}" (${workflowId})`, {
				workflowId,
				workflowName,
			});
			try {
				await this.add(workflowId, activationMode, workflowData);
			} catch (error) {
				this.errorReporter.error(error);
				let lastTimeout = this.queuedActivations[workflowId].lastTimeout;
				if (lastTimeout < WORKFLOW_REACTIVATE_MAX_TIMEOUT) {
					lastTimeout = Math.min(lastTimeout * 2, WORKFLOW_REACTIVATE_MAX_TIMEOUT);
				}

				this.logger.info(
					` -> Activation of workflow "${workflowName}" (${workflowId}) did fail with error: "${
						error.message as string
					}" | retry in ${Math.floor(lastTimeout / 1000)} seconds`,
					{
						workflowId,
						workflowName,
					},
				);

				this.queuedActivations[workflowId].lastTimeout = lastTimeout;
				this.queuedActivations[workflowId].timeout = setTimeout(retryFunction, lastTimeout);
				return;
			}
			this.logger.info(
				` -> Activation of workflow "${workflowName}" (${workflowId}) was successful!`,
				{
					workflowId,
					workflowName,
				},
			);
		};

		// Just to be sure that there is not chance that for any reason
		// multiple run in parallel
		this.removeQueuedWorkflowActivation(workflowId);

		this.queuedActivations[workflowId] = {
			activationMode,
			lastTimeout: WORKFLOW_REACTIVATE_INITIAL_TIMEOUT,
			timeout: setTimeout(retryFunction, WORKFLOW_REACTIVATE_INITIAL_TIMEOUT),
			workflowData,
		};
	}

	/**
	 * Remove a workflow from the activation queue
	 */
	private removeQueuedWorkflowActivation(workflowId: WorkflowId) {
		if (this.queuedActivations[workflowId]) {
			clearTimeout(this.queuedActivations[workflowId].timeout);
			delete this.queuedActivations[workflowId];
		}
	}

	/**
	 * Remove all workflows from the activation queue
	 */
	removeAllQueuedWorkflowActivations() {
		for (const workflowId in this.queuedActivations) {
			this.removeQueuedWorkflowActivation(workflowId);
		}
	}

	/**
	 * Makes a workflow inactive
	 *
	 * @param {string} workflowId The id of the workflow to deactivate
	 */
	// TODO: this should happen in a transaction
	// maybe, see: https://github.com/n8n-io/n8n/pull/8904#discussion_r1530150510
	async remove(workflowId: WorkflowId) {
		if (this.instanceSettings.isMultiMain) {
			try {
				await this.clearWebhooks(workflowId);
			} catch (error) {
				this.errorReporter.error(error);
				this.logger.error(
					`Could not remove webhooks of workflow "${workflowId}" because of error: "${error.message}"`,
				);
			}

			void this.publisher.publishCommand({
				command: 'remove-triggers-and-pollers',
				payload: { workflowId },
			});

			return;
		}

		try {
			await this.clearWebhooks(workflowId);
		} catch (error) {
			this.errorReporter.error(error);
			this.logger.error(
				`Could not remove webhooks of workflow "${workflowId}" because of error: "${error.message}"`,
			);
		}

		await this.activationErrorsService.deregister(workflowId);

		if (this.queuedActivations[workflowId] !== undefined) {
			this.removeQueuedWorkflowActivation(workflowId);
		}

		// if it's active in memory then it's a trigger
		// so remove from list of actives workflows
		await this.removeWorkflowTriggersAndPollers(workflowId);
	}

	/**
	 * Stop running active triggers and pollers for a workflow.
	 */
	async removeWorkflowTriggersAndPollers(workflowId: WorkflowId) {
		if (!this.activeWorkflows.isActive(workflowId)) return;

		const wasRemoved = await this.activeWorkflows.remove(workflowId);

		if (wasRemoved) {
			this.logger.debug(`Removed triggers and pollers for workflow "${workflowId}"`, {
				workflowId,
			});
		}
	}

	/**
	 * Register as active in memory a trigger- or poller-based workflow.
	 */
	async addTriggersAndPollers(
		dbWorkflow: WorkflowEntity,
		workflow: Workflow,
		{
			activationMode,
			executionMode,
			additionalData,
		}: {
			activationMode: WorkflowActivateMode;
			executionMode: WorkflowExecuteMode;
			additionalData: IWorkflowExecuteAdditionalData;
		},
	) {
		const getTriggerFunctions = this.getExecuteTriggerFunctions(
			dbWorkflow,
			additionalData,
			executionMode,
			activationMode,
		);

		const getPollFunctions = this.getExecutePollFunctions(
			dbWorkflow,
			additionalData,
			executionMode,
			activationMode,
		);

		if (workflow.getTriggerNodes().length === 0 && workflow.getPollNodes().length === 0) {
			return false;
		}

		await this.activeWorkflows.add(
			workflow.id,
			workflow,
			additionalData,
			executionMode,
			activationMode,
			getTriggerFunctions,
			getPollFunctions,
		);

		this.logger.debug(`Added triggers and pollers for workflow ${formatWorkflow(dbWorkflow)}`);

		return true;
	}

	async removeActivationError(workflowId: WorkflowId) {
		await this.activationErrorsService.deregister(workflowId);
	}

	/**
	 * Whether this instance may add webhooks to the `webhook_entity` table.
	 */
	shouldAddWebhooks(activationMode: WorkflowActivateMode) {
		// Always try to populate the webhook entity table as well as register the webhooks
		// to prevent issues with users upgrading from a version < 1.15, where the webhook entity
		// was cleared on shutdown to anything past 1.28.0, where we stopped populating it on init,
		// causing all webhooks to break
		if (activationMode === 'init') return true;

		if (activationMode === 'leadershipChange') return false;

		return this.instanceSettings.isLeader; // 'update' or 'activate'
	}

	/**
	 * Whether this instance may add triggers and pollers to memory.
	 *
	 * In both single- and multi-main setup, only the leader is allowed to manage
	 * triggers and pollers in memory, to ensure they are not duplicated.
	 */
	shouldAddTriggersAndPollers() {
		return this.instanceSettings.isLeader;
	}
}
