import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createDataSource } from '../../database/data-source';
import { TranspilerService } from '../../transpiler/transpiler.service';
import { EngineEventBus } from '../../engine/event-bus.service';
import { EngineService } from '../../engine/engine.service';
import { StepProcessorService } from '../../engine/step-processor.service';
import { StepPlannerService } from '../../engine/step-planner.service';
import { StepQueueService } from '../../engine/step-queue.service';
import { CompletionService } from '../../engine/completion.service';
import { registerEventHandlers } from '../../engine/event-handlers';
import { WorkflowEntity } from '../../database/entities/workflow.entity';
import type { ExecutionCompletedEvent, ExecutionFailedEvent } from '../../engine/event-bus.types';

export async function benchCommand(args: string[]): Promise<void> {
	const filePath = args[0];
	if (!filePath) {
		console.error('Usage: engine bench <file.ts> --iterations 100');
		process.exit(1);
	}

	let iterations = 10;
	for (let i = 1; i < args.length; i++) {
		if (args[i] === '--iterations' && args[i + 1]) {
			iterations = parseInt(args[++i], 10);
		}
	}

	// Read and compile
	const absolutePath = resolve(filePath);
	const source = readFileSync(absolutePath, 'utf-8');
	const transpiler = new TranspilerService();
	const result = transpiler.compile(source);

	if (result.errors.length > 0) {
		console.error('Compilation errors:');
		for (const err of result.errors) console.error(`  ${err.message}`);
		process.exit(1);
	}

	// Setup engine
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

	// Save workflow
	const workflowRepo = dataSource.getRepository(WorkflowEntity);
	const id = crypto.randomUUID();
	await workflowRepo.save(
		workflowRepo.create({
			id,
			version: 1,
			name: 'Benchmark',
			code: source,
			compiledCode: result.code,
			triggers: [],
			settings: {},
			graph: result.graph,
			sourceMap: result.sourceMap,
			active: true,
		}),
	);

	console.log(`Benchmarking: ${filePath}`);
	console.log(`Iterations: ${iterations}`);
	console.log('');

	const durations: number[] = [];

	for (let i = 0; i < iterations; i++) {
		const start = performance.now();
		const executionId = await engineService.startExecution(id, { iteration: i }, 'test');

		await new Promise<void>((resolve) => {
			const completedHandler = (event: ExecutionCompletedEvent) => {
				if (event.executionId === executionId) resolve();
			};
			const failedHandler = (event: ExecutionFailedEvent) => {
				if (event.executionId === executionId) resolve();
			};
			eventBus.on<ExecutionCompletedEvent>('execution:completed', completedHandler);
			eventBus.on<ExecutionFailedEvent>('execution:failed', failedHandler);
		});

		const elapsed = performance.now() - start;
		durations.push(elapsed);

		if ((i + 1) % Math.max(1, Math.floor(iterations / 10)) === 0) {
			process.stdout.write(`\r  Progress: ${i + 1}/${iterations}`);
		}
	}

	console.log('\n');

	// Calculate stats
	durations.sort((a, b) => a - b);
	const sum = durations.reduce((a, b) => a + b, 0);
	const avg = sum / durations.length;
	const min = durations[0];
	const max = durations[durations.length - 1];
	const p50 = durations[Math.floor(durations.length * 0.5)];
	const p95 = durations[Math.floor(durations.length * 0.95)];
	const p99 = durations[Math.floor(durations.length * 0.99)];

	console.log('Results:');
	console.log(`  Total:    ${sum.toFixed(0)}ms`);
	console.log(`  Average:  ${avg.toFixed(1)}ms`);
	console.log(`  Min:      ${min.toFixed(1)}ms`);
	console.log(`  Max:      ${max.toFixed(1)}ms`);
	console.log(`  P50:      ${p50.toFixed(1)}ms`);
	console.log(`  P95:      ${p95.toFixed(1)}ms`);
	console.log(`  P99:      ${p99.toFixed(1)}ms`);
	console.log(`  Throughput: ${(iterations / (sum / 1000)).toFixed(1)} executions/sec`);

	queue.stop();
	await dataSource.destroy();
}
