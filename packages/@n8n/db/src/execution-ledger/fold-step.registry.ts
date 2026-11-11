import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { assertValidFoldStepName, type ExecutionLedgerFoldStep } from './fold-step';

/**
 * Fold steps that the ledger fold runs, in registration order. Lives in `@n8n/db` so packaged
 * modules such as Insights can register a step without importing `cli`.
 */
@Service()
export class FoldStepRegistry {
	private readonly steps = new Map<string, ExecutionLedgerFoldStep>();

	register(step: ExecutionLedgerFoldStep): void {
		assertValidFoldStepName(step.name);
		if (this.steps.has(step.name)) {
			throw new UnexpectedError(`Fold step "${step.name}" is already registered`);
		}
		this.steps.set(step.name, step);
	}

	getAll(): readonly ExecutionLedgerFoldStep[] {
		return [...this.steps.values()];
	}
}
