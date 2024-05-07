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
		await super.setup();
	}

	async teardown() {
		await this.benchmark();

		await super.teardown();

		process.exit(0); // prevent actual test run
	}

	getVmContext() {
		return super.getVmContext();
	}

	setupBenchmark() {
		this.bench = withCodSpeed(new Bench());
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
