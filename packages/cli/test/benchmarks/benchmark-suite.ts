import { withCodSpeed } from '@codspeed/tinybench-plugin';
import { ApplicationError } from 'n8n-workflow';
import Bench from 'tinybench';

export class BenchmarkSuite {
	private readonly suite: Bench;

	constructor() {
		this.suite = withCodSpeed(new Bench({ time: 0, iterations: 1 })); // @TEMP: Update constructor arg
	}

	register(registerFn: (bench: Bench) => void) {
		registerFn(this.suite);

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
