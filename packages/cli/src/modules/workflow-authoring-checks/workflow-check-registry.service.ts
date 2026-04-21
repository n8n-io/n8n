import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import type { WorkflowCheckTypeKey } from './workflow-authoring-checks.constants';
import type { WorkflowCheckType } from './workflow-authoring-checks.types';

@Service()
export class WorkflowCheckRegistry {
	private readonly types = new Map<WorkflowCheckTypeKey, WorkflowCheckType>();

	register(type: WorkflowCheckType) {
		if (this.types.has(type.type)) {
			throw new UnexpectedError(`Duplicate workflow check type: ${type.type}`);
		}
		this.types.set(type.type, type);
	}

	getType(typeKey: WorkflowCheckTypeKey): WorkflowCheckType | undefined {
		return this.types.get(typeKey);
	}

	listTypes(): WorkflowCheckType[] {
		return [...this.types.values()];
	}
}
