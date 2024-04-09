import { Bench } from 'tinybench';
import { withCodSpeed } from '@codspeed/tinybench-plugin';

async function main() {
	const bench = withCodSpeed(new Bench());

	bench.add('some benchmark', () => {
		console.log(Math.random());
	});

	await bench.warmup();
	await bench.run();

	console.table(bench.table());
}

void main();
