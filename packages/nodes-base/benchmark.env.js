const NodeEnvironment = require('jest-environment-node').TestEnvironment;
const { Bench } = require('tinybench');

class BenchmarkEnvironment extends NodeEnvironment {
	constructor(config, context) {
		super(config, context);
		this.testPath = context.testPath;
		this.docblockPragmas = context.docblockPragmas;
		this.setupBenchmark();
	}

	async setup() {
		await super.setup();
	}

	async teardown() {
		await this.benchmark();

		await super.teardown();
	}

	getVmContext() {
		return super.getVmContext();
	}

	setupBenchmark() {
		this.bench = new Bench();
	}

	async benchmark() {
		await this.bench.warmup();
		await this.bench.run();
	}

	async handleTestEvent(event) {
		if (event.name === 'add_test') {
			this.bench.add(event.testName, event.fn);
		}
	}
}

module.exports = BenchmarkEnvironment;
