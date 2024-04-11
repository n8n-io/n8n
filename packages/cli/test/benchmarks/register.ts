import type Bench from 'tinybench';
import { webhook } from './webhook.benchmark';

export function register(bench: Bench) {
	webhook(bench);
}
