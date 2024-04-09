import type Bench from 'tinybench';

export function example(bench: Bench) {
	bench.add('Example', () => {
		console.log(Math.random());
	});
}
