import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createDataSource } from '../../database/data-source';
import { TranspilerService } from '../../transpiler/transpiler.service';
import { EngineEventBus } from '../../engine/event-bus.service';
import { EngineService } from '../../engine/engine.service';
import { StepPlannerService } from '../../engine/step-planner.service';
import { StepProcessorService } from '../../engine/step-processor.service';
import { StepQueueService } from '../../engine/step-queue.service';
import { CompletionService } from '../../engine/completion.service';
import { registerEventHandlers } from '../../engine/event-handlers';
import type {
	ExecutionCompletedEvent,
	ExecutionFailedEvent,
	ExecutionCancelledEvent,
} from '../../engine/event-bus.types';
import { WorkflowEntity } from '../../database/entities/workflow.entity';

export async function runCommand(args: string[]): Promise<void> {
	const filePath = args[0];
	if (!filePath) {
		console.error("Usage: engine run <file.ts> [--input '{}']");
		process.exit(1);
	}

	let input: unknown;
	for (let i = 1; i < args.length; i++) {
		if (args[i] === '--input' && args[i + 1]) {
			input = JSON.parse(args[++i]);
		}
	}

	// Read and transpile the workflow file
	const absolutePath = resolve(filePath);
	const source = readFileSync(absolutePath, 'utf-8');
	const transpiler = new TranspilerService();
	const result = transpiler.compile(source);

	if (result.errors.length > 0) {
		console.error('Compilation errors:');
		for (const err of result.errors) {
			console.error(`  Line ${err.line ?? '?'}: ${err.message}`);
		}
		process.exit(1);
	}

	// Connect to database and wire up engine
	const dataSource = createDataSource();
	await dataSource.initialize();

	const eventBus = new EngineEventBus();
	const stepPlanner = new StepPlannerService(dataSource);
	const completionService = new CompletionService(dataSource, eventBus);
	const stepProcessor = new StepProcessorService(dataSource, eventBus);
	const engineService = new EngineService(dataSource, eventBus, stepPlanner);

	registerEventHandlers(eventBus, dataSource, stepPlanner, completionService);

	const queue = new StepQueueService(dataSource, stepProcessor);
	queue.start();

	// Print events as they happen
	eventBus.onAny((event) => {
		const time = new Date().toISOString().split('T')[1];
		if (event.type === 'step:completed') {
			console.log(`[${time}] step:completed (${event.stepId})`);
		} else if (event.type === 'step:failed') {
			console.log(`[${time}] step:failed (${event.stepId}): ${event.error.message}`);
		} else if (event.type.startsWith('execution:')) {
			console.log(`[${time}] ${event.type}`);
		}
	});

	// Save workflow to database
	const workflowRepo = dataSource.getRepository(WorkflowEntity);

	// Extract name from the source file path as fallback
	const name =
		result.graph.nodes.find((n) => n.type === 'trigger')?.name ??
		absolutePath.split('/').pop()?.replace(/\.ts$/, '') ??
		'CLI Workflow';

	const id = crypto.randomUUID();
	await workflowRepo.save({
		id,
		version: 1,
		name,
		code: source,
		compiledCode: result.code,
		triggers: [],
		settings: {},
		graph: result.graph,
		sourceMap: result.sourceMap,
		active: true,
	});

	// Execute
	const executionId = await engineService.startExecution(id, input, 'manual');
	console.log(`Execution started: ${executionId}`);

	// Wait for completion
	const exitCode = await new Promise<number>((exitResolve) => {
		eventBus.on<ExecutionCompletedEvent>('execution:completed', (event) => {
			console.log('\nExecution completed.');
			if (event.result !== undefined && event.result !== null) {
				console.log('Result:', JSON.stringify(event.result, null, 2));
			}
			exitResolve(0);
		});
		eventBus.on<ExecutionFailedEvent>('execution:failed', (event) => {
			console.error('\nExecution failed:', event.error.message);
			exitResolve(1);
		});
		eventBus.on<ExecutionCancelledEvent>('execution:cancelled', () => {
			console.log('\nExecution cancelled.');
			exitResolve(0);
		});
	});

	queue.stop();
	await dataSource.destroy();
	process.exit(exitCode);
}
