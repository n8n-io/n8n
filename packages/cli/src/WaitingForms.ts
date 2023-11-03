import { Service } from 'typedi';

import { NodeTypes } from '@/NodeTypes';
import type { IExecutionResponse } from '@/Interfaces';

import { ExecutionRepository } from '@db/repositories';
import { OwnershipService } from './services/ownership.service';
import { Logger } from '@/Logger';
import { WaitingWebhooks } from './WaitingWebhooks';

@Service()
export class WaitingForms extends WaitingWebhooks {
	constructor(
		logger: Logger,
		nodeTypes: NodeTypes,
		executionRepository: ExecutionRepository,
		ownershipService: OwnershipService,
	) {
		super(logger, nodeTypes, executionRepository, ownershipService);
		this.includeForms = true;
	}

	protected logReceivedWebhook(logger: Logger, method: string, executionId: string) {
		logger.debug(`Received waiting-form "${method}" for execution "${executionId}"`);
	}

	protected disableNode(execution: IExecutionResponse, method?: string) {
		if (method === 'POST') {
			execution.data.executionData!.nodeExecutionStack[0].node.disabled = true;
		}
	}
}
