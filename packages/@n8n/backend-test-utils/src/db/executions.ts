import Container from 'typedi';
import { ExecutionEntity, ExecutionRepository } from '@n8n/db';

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
