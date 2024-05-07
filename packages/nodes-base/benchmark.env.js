const NodeEnvironment = require('jest-environment-node').TestEnvironment;
const { Bench } = require('tinybench');
const { withCodSpeed } = require('@codspeed/tinybench-plugin');

class BenchmarkEnvironment extends NodeEnvironment {
	constructor(config, context) {
		super(config, context);
		this.testPath = context.testPath;
		this.docblockPragmas = context.docblockPragmas;
		this.setupBenchmark();
	}

	async setup() {
		console.log('[benchmarking] env setup');
		await super.setup();
	}

	async teardown() {
		console.log('[benchmarking] env teardown');

		await this.benchmark();

		await super.teardown();
	}

	getVmContext() {
		return super.getVmContext();
	}

	setupBenchmark() {
		console.log('[benchmarking] this.bench setup');
		this.bench = withCodSpeed(new Bench());
	}

	async benchmark() {
		console.log('[benchmarking] bench warmup');
		await this.bench.warmup();
		console.log('[benchmarking] bench run');
		await this.bench.run();
		console.log(this.bench.results[0]);
	}

	async handleTestEvent(event) {
		if (event.name === 'add_test') {
			console.log('[benchmarking] add test', event.testName);
			this.bench.add(event.testName, event.fn);
		}
	}
}

module.exports = BenchmarkEnvironment;
