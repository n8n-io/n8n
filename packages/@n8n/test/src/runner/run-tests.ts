import type { WorkflowTestRunEvent } from '@n8n/api-types';
import path from 'node:path';

import { WorkflowTestReporter } from './workflow-test-reporter';

async function sendToParent(event: WorkflowTestRunEvent) {
	await new Promise<void>((resolve, reject) => {
		if (!process.send) throw new Error('The test runner needs an IPC channel to its parent');
		process.send(event, (error: Error | null) => (error ? reject(error) : resolve()));
	});
}

async function runTests(directory: string) {
	const { startVitest } = await import('vitest/node');
	const vitest = await startVitest(
		[],
		{
			root: directory,
			config: false,
			watch: false,
			reporters: [new WorkflowTestReporter(sendToParent)],
		},
		{
			resolve: {
				alias: {
					'@n8n/test': path.resolve(__dirname, '..', 'index.js'),
				},
			},
		},
	);
	await vitest.close();
	process.disconnect();
}

void runTests(path.resolve(process.argv[2]));
