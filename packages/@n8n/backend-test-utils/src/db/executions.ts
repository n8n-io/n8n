import type { ExecutionEntity } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';

export function newExecution(attributes: Partial<ExecutionEntity> = {}): ExecutionEntity {
	const { finished, mode, startedAt, stoppedAt, waitTill, status, deletedAt } = attributes;

	const execution = Container.get(ExecutionRepository).create({
		finished: finished ?? true,
		mode: mode ?? 'manual',
		startedAt: startedAt ?? new Date(),
		stoppedAt: stoppedAt ?? new Date(),
		waitTill: waitTill ?? null,
		status: status ?? 'success',
		deletedAt,
		...attributes,
	});

	return execution;
}
