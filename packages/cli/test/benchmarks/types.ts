import type { Hook } from 'tinybench';
import type Bench from 'tinybench';

export type Benchmark = {
	setup: Hook;
	teardown: Hook;
	register: (bench: Bench) => void;
};
