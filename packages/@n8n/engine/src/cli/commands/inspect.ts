import { createDataSource } from '../../database/data-source';
import { WorkflowExecution } from '../../database/entities/workflow-execution.entity';
import { WorkflowStepExecution } from '../../database/entities/workflow-step-execution.entity';

export async function inspectCommand(args: string[]): Promise<void> {
	const executionId = args[0];
	if (!executionId) {
		console.error('Usage: engine inspect <execution-id>');
		process.exit(1);
	}

	const dataSource = createDataSource();
	await dataSource.initialize();

	// Get execution
	const execution = await dataSource
		.getRepository(WorkflowExecution)
		.findOneBy({ id: executionId });

	if (!execution) {
		console.error(`Execution ${executionId} not found`);
		await dataSource.destroy();
		process.exit(1);
	}

	console.log('\n=== Execution ===');
	console.log(`ID:       ${execution.id}`);
	console.log(`Workflow: ${execution.workflowId} v${execution.workflowVersion}`);
	console.log(`Status:   ${execution.status}`);
	console.log(`Mode:     ${execution.mode}`);
	console.log(`Started:  ${execution.startedAt?.toISOString() ?? '-'}`);
	if (execution.completedAt) {
		console.log(`Finished: ${execution.completedAt.toISOString()}`);
	}
	if (execution.durationMs != null) {
		console.log(
			`Duration: ${execution.durationMs}ms (compute: ${execution.computeMs ?? 0}ms, wait: ${execution.waitMs ?? 0}ms)`,
		);
	}
	if (execution.error) {
		console.log(`Error:    ${JSON.stringify(execution.error)}`);
	}

	// Get steps
	const steps = await dataSource
		.getRepository(WorkflowStepExecution)
		.createQueryBuilder('wse')
		.where('wse.executionId = :id', { id: executionId })
		.orderBy('wse.createdAt', 'ASC')
		.getMany();

	console.log('\n=== Step Timeline ===');
	for (const step of steps) {
		const icon = getStepIcon(step.status);
		const parent = step.parentStepExecutionId ? ' (child)' : '';
		const duration = step.durationMs != null ? ` (${step.durationMs}ms)` : '';
		const attempt = step.attempt > 1 ? ` attempt ${step.attempt}` : '';

		console.log(`  ${icon} ${step.stepId}${parent}${attempt} -- ${step.status}${duration}`);

		if (step.error) {
			const error =
				typeof step.error === 'string'
					? (JSON.parse(step.error) as { message: string })
					: (step.error as { message: string });
			console.log(`    Error: ${error.message}`);
		}
	}

	if (execution.result !== undefined && execution.result !== null) {
		console.log('\n=== Result ===');
		console.log(JSON.stringify(execution.result, null, 2));
	}

	await dataSource.destroy();
}

function getStepIcon(status: string): string {
	switch (status) {
		case 'completed':
			return '[done]';
		case 'failed':
			return '[FAIL]';
		case 'cancelled':
			return '[skip]';
		case 'waiting':
			return '[wait]';
		case 'waiting_approval':
			return '[hold]';
		case 'running':
			return '[ >> ]';
		default:
			return '[    ]';
	}
}
