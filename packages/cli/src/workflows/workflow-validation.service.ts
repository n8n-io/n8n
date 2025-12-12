import { Service } from '@n8n/di';
import { validateWorkflowHasTriggerLikeNode } from 'n8n-workflow';
import type { INodes } from 'n8n-workflow';

import { STARTING_NODES } from '@/constants';
import type { NodeTypes } from '@/node-types';

export interface WorkflowValidationResult {
	isValid: boolean;
	error?: string;
}

@Service()
export class WorkflowValidationService {
	validateForActivation(nodes: INodes, nodeTypes: NodeTypes): WorkflowValidationResult {
		const triggerValidation = validateWorkflowHasTriggerLikeNode(nodes, nodeTypes, STARTING_NODES);

		if (!triggerValidation.isValid) {
			return {
				isValid: false,
				error:
					triggerValidation.error ??
					'Workflow cannot be activated because it has no trigger node. At least one trigger, webhook, or polling node is required.',
			};
		}

		return { isValid: true };
	}
}
