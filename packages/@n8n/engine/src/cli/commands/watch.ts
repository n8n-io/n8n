import { createDataSource } from '../../database/data-source';
import { WorkflowExecution } from '../../database/entities/workflow-execution.entity';
import { EngineEventBus } from '../../engine/event-bus.service';
import { StepProcessorService } from '../../engine/step-processor.service';
import { StepPlannerService } from '../../engine/step-planner.service';
import { StepQueueService } from '../../engine/step-queue.service';
import { CompletionService } from '../../engine/completion.service';
import { registerEventHandlers } from '../../engine/event-handlers';

const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled'];

export async function watchCommand(args: string[]): Promise<void> {
	const executionId = args[0];
	if (!executionId) {
		console.error('Usage: engine watch <execution-id>');
		process.exit(1);
	}

	const dataSource = createDataSource();
	await dataSource.initialize();

	// Check execution exists
	const execution = await dataSource
		.getRepository(WorkflowExecution)
		.findOneBy({ id: executionId });

	if (!execution) {
		console.error(`Execution ${executionId} not found`);
		await dataSource.destroy();
		process.exit(1);
	}

	console.log(`Watching execution ${executionId} (status: ${execution.status})`);

	if (TERMINAL_STATUSES.includes(execution.status)) {
		console.log('Execution already in terminal state. Use "engine inspect" to see details.');
		await dataSource.destroy();
		return;
	}

	// Wire up engine to process steps and emit events
	const eventBus = new EngineEventBus();
	const stepPlanner = new StepPlannerService(dataSource);
	const completionService = new CompletionService(dataSource, eventBus);
	const stepProcessor = new StepProcessorService(dataSource, eventBus);

	registerEventHandlers(eventBus, dataSource, stepPlanner, completionService);

	const queue = new StepQueueService(dataSource, stepProcessor);
	queue.start();

	// Print events as they arrive
	eventBus.onAny((event) => {
		if (!('executionId' in event) || event.executionId !== executionId) return;
		const time = new Date().toISOString().split('T')[1].split('.')[0];
		console.log(`[${time}] ${event.type}`, JSON.stringify(event, null, 2));
	});

	// Exit on terminal events
	const terminalHandler = async (event: { executionId: string }) => {
		if (event.executionId !== executionId) return;
		console.log('\nExecution finished.');
		queue.stop();
		await dataSource.destroy();
		process.exit(0);
	};

	eventBus.on('execution:completed', terminalHandler);
	eventBus.on('execution:failed', terminalHandler);
	eventBus.on('execution:cancelled', terminalHandler);
}
