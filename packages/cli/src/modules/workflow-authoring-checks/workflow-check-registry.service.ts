import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import type { WorkflowCheck } from './workflow-authoring-checks.types';

@Service()
export class WorkflowCheckRegistry {
	private readonly checks = new Map<string, WorkflowCheck>();

	register(check: WorkflowCheck) {
		if (this.checks.has(check.id)) {
			throw new UnexpectedError(`Duplicate workflow check id: ${check.id}`);
		}
		this.checks.set(check.id, check);
	}

	get(id: string): WorkflowCheck | undefined {
		return this.checks.get(id);
	}

	list(): WorkflowCheck[] {
		return [...this.checks.values()];
	}
}
