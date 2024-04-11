import 'reflect-metadata';
import { BenchmarkSuite } from './benchmark-suite';
import { webhook } from './webhook.benchmark';

async function main() {
	process.env.NODE_ENV = 'test';

	const webhookSuite = new BenchmarkSuite().register(webhook);

	process.env.NODE_ENV = 'test';

	// await suite.warmup(); // @TODO: Restore
	await webhookSuite.run();

	webhookSuite.logResults();
}

void main();
