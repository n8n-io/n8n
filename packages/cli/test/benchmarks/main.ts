import 'reflect-metadata';
import { BenchmarkSuite } from './benchmark-suite';
import { webhook } from './webhook.benchmarks';

async function main() {
	process.env.NODE_ENV = 'test';

	const webhookSuite = new BenchmarkSuite().add(webhook);

	// const webhookSuite = new BenchmarkSuite({ setup, register });

	// await suite.warmup(); // @TODO: Restore
	await webhookSuite.run();

	webhookSuite.logResults();
}

void main();
