import { createDataSource } from '../../database/data-source';
import { createEngine } from '../../engine/create-engine';

export async function executeCommand(args: string[]): Promise<void> {
	const workflowId = args[0];
	if (!workflowId) {
		console.error("Usage: engine execute <workflow-id> [--input '{}'] [--watch] [--version <n>]");
		process.exit(1);
	}

	// Parse flags
	let input: unknown;
	let watch = false;
	let version: number | undefined;

	for (let i = 1; i < args.length; i++) {
		if (args[i] === '--input' && args[i + 1]) {
			input = JSON.parse(args[++i]);
		} else if (args[i] === '--watch') {
			watch = true;
		} else if (args[i] === '--version' && args[i + 1]) {
			version = parseInt(args[++i], 10);
		}
	}

	const dataSource = createDataSource();
	await dataSource.initialize();

	const { eventBus, engineService, queue } = createEngine(dataSource);
	queue.start();

	if (watch) {
		eventBus.onAny((event) => {
			const time = new Date().toISOString().split('T')[1];
			console.log(`[${time}] ${event.type}`, JSON.stringify(event, null, 2));
		});
	}

	const executionId = await engineService.startExecution(workflowId, input, 'manual', version);
	console.log(`Execution started: ${executionId}`);

	if (!watch) {
		// Without --watch, wait for execution to finish silently
		await new Promise<void>((resolve) => {
			eventBus.on('execution:completed', () => {
				resolve();
			});
			eventBus.on('execution:failed', () => {
				resolve();
			});
			eventBus.on('execution:cancelled', () => {
				resolve();
			});
		});

		queue.stop();
		await dataSource.destroy();
	} else {
		// With --watch, keep process alive and log events until completion
		eventBus.on('execution:completed', async () => {
			console.log('Execution completed.');
			queue.stop();
			await dataSource.destroy();
			process.exit(0);
		});
		eventBus.on('execution:failed', async () => {
			console.log('Execution failed.');
			queue.stop();
			await dataSource.destroy();
			process.exit(1);
		});
		eventBus.on('execution:cancelled', async () => {
			console.log('Execution cancelled.');
			queue.stop();
			await dataSource.destroy();
			process.exit(0);
		});
	}
}
