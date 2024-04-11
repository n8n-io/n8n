import { withCodSpeed } from '@codspeed/tinybench-plugin';
import { ApplicationError } from 'n8n-workflow';
import Bench from 'tinybench';
import type { Benchmark } from './types';

export class BenchmarkSuite {
	private suite: Bench;

	add({ register, setup, teardown }: Benchmark) {
		// @TEMP: Update time and iterations
		this.suite = withCodSpeed(new Bench({ time: 0, iterations: 1, setup, teardown }));

		register(this.suite);

		return this;
	}

	async warmup() {
		this.assertBenchmarks();

		await this.suite.warmup();
	}

	async run() {
		this.assertBenchmarks();

		await this.suite.run();
	}

	logResults() {
		console.table(this.suite.table());
	}

	private assertBenchmarks() {
		if (this.suite._tasks.size === 0) throw new ApplicationError('No benchmarks found');
	}
}
