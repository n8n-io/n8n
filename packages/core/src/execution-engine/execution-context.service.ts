import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import {
	IExecuteData,
	IExecutionContext,
	INodeExecutionData,
	PlaintextExecutionContext,
	toCredentialContext,
	toExecutionContextEstablishmentHookParameter,
	Workflow,
} from 'n8n-workflow';

import { Cipher } from '@/encryption';

import { ExecutionContextHookRegistry } from './execution-context-hook-registry.service';

@Service()
export class ExecutionContextService {
	constructor(
		private readonly logger: Logger,
		private readonly executionContextHookRegistry: ExecutionContextHookRegistry,
		private readonly cipher: Cipher,
	) {}

	decryptExecutionContext(context: IExecutionContext): PlaintextExecutionContext {
		let credentials = undefined;
		if (context.credentials) {
			const decrypted = this.cipher.decrypt(context.credentials);
			credentials = toCredentialContext(decrypted);
		}
		return {
			...context,
			credentials,
		};
	}

	encryptExecutionContext(context: PlaintextExecutionContext): IExecutionContext {
		let credentials = undefined;
		if (context.credentials) {
			credentials = this.cipher.encrypt(context.credentials);
		}
		return {
			...context,
			credentials,
		};
	}

	mergeExecutionContexts(
		baseContext: PlaintextExecutionContext,
		contextToMerge: Partial<PlaintextExecutionContext>,
	): PlaintextExecutionContext {
		const newContext = {
			...baseContext,
			...contextToMerge,
		};

		if (contextToMerge.credentials) {
			newContext.credentials = {
				...baseContext.credentials,
				...contextToMerge.credentials,
			};
		}

		return newContext;
	}

	// startItem is mutated to reflect any changes to trigger items made by the hooks
	async augmentExecutionContextWithHooks(
		workflow: Workflow,
		startItem: IExecuteData,
		contextToAugment: IExecutionContext,
	): Promise<{
		context: IExecutionContext;
		triggerItems: INodeExecutionData[] | null;
	}> {
		// Main input data is an array of items, each item represents an event that triggers the workflow execution
		// The 'main' selector selects the input name of the nodes, and the 0 index represents the runIndex,
		// 0 being the first run of this node in the workflow.

		let currentTriggerItems = startItem.data['main'][0];

		// startNodeParameters will hold the parameters of the start node
		// this can be the settings for the different hooks to be executed
		// for example to extract the bearer token from the start node data.

		const contextEstablishmentHookParameters = startItem.node.parameters?.contextEstablishmentHooks;

		if (
			!contextEstablishmentHookParameters ||
			typeof contextEstablishmentHookParameters !== 'object'
		) {
			// no execution establishment hooks found, we just return the original context
			return {
				context: contextToAugment,
				triggerItems: currentTriggerItems,
			};
		}

		const startNodeParameters = toExecutionContextEstablishmentHookParameter(
			contextEstablishmentHookParameters,
		);

		if (startNodeParameters === null) {
			// no execution establishment hooks found, we just return the original context
			return {
				context: contextToAugment,
				triggerItems: currentTriggerItems,
			};
		}

		// decrypt the context to work with plaintext data
		let context = this.decryptExecutionContext(contextToAugment);

		// based on startNodeParameters, startNodeType and currentTriggerItems we can now
		// iterate over the different hooks to extract specific data for the runtime context
		for (const hookParameters of startNodeParameters.hooks) {
			const hook = this.executionContextHookRegistry.getHookByName(hookParameters.hookName);

			const isAllowedToFail = hookParameters.isAllowedToFail;

			if (!hook) {
				this.logger.warn(
					`Execution context establishment hook ${hookParameters.hookName} not found, skipping this hook`,
				);
				continue;
			}
			try {
				// call the hook to let it modify the context and/or the main input data
				const result = await hook.execute({
					triggerNode: startItem.node,
					workflow,
					triggerItems: currentTriggerItems,
					context,
					options: hookParameters,
				});

				if (result.triggerItems) {
					// Update trigger items in case they were modified by the hook
					currentTriggerItems = result.triggerItems;
				}

				if (result.contextUpdate) {
					// Merge any returned context fields into the execution context
					context = this.mergeExecutionContexts(context, result.contextUpdate);
				}
			} catch (error) {
				this.logger.warn(
					`Failed to execute context establishment hook ${hookParameters.hookName}`,
					{ error },
				);
				if (!isAllowedToFail) {
					// If the hook is not allowed to fail, rethrow the error
					throw error;
				}
			}
		}

		return {
			context: this.encryptExecutionContext(context),
			triggerItems: currentTriggerItems,
		};
	}
}
