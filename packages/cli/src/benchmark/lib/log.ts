import pico from 'picocolors';
import { assert } from 'n8n-workflow';
import config from '@/config';
import type Bench from 'tinybench';
import type { Suites } from './types';

export const toOneLineJson = (obj: object) =>
	JSON.stringify(obj)
		.replace(/:/g, ': ')
		.replace(/,/g, ', ')
		.replace(/"/g, '')
		.replace(/^\{/, '{ ')
		.replace(/\}$/, ' }');

export function log(message: string, details?: string) {
	const parts = [pico.magenta('[benchmarking]'), message];

	if (details) {
		parts[parts.length - 1] += ':';
		parts.push(pico.dim(details));
	}

	console.log(parts.join(' '));
}

const indentation = {
	first: ' ',
	second: ' '.repeat(4),
	third: ' '.repeat(6),
};

function truncate(n: number, decimalPlaces = 3) {
	const nStr = n.toString();

	const truncated = nStr.slice(0, nStr.indexOf('.') + decimalPlaces + 1);

	if (truncated.length === 5) return '0' + truncated;

	return truncated;
}

const toDirsAndFileName = (key: string) => {
	const segments = key.split('/');
	const dirs = segments.slice(0, -1).join('/') + '/';
	const [fileName] = segments.slice(-1);

	return [dirs, fileName];
};

export function logResults(suites: Suites, results: Bench['results']) {
	const dbType = config.getEnv('database.type') === 'postgresdb' ? 'postgres' : 'sqlite';
	const columnDivider = pico.dim('·'.repeat(3));

	for (const [key, suite] of Object.entries(suites)) {
		const [dirs, fileName] = toDirsAndFileName(key);

		const title = [
			'\n',
			pico.bgWhite(pico.black(' BENCHMARK ')),
			pico.gray(dirs) + pico.bold(fileName),
			pico.dim('[' + dbType + ']'),
			'\n',
		].join(' ');

		console.log(title);

		for (const task of suite.tasks) {
			console.log(indentation.first, pico.white('•'), task.name);

			const result = results.shift();

			assert(result !== undefined);

			const { totalTime, samples, sd, hz, moe, sem } = result;

			const zerothLine = [
				indentation.second + pico.dim('·'),
				pico.dim('Ran'),
				pico.magenta(samples.length),
				pico.dim('iterations in'),
				pico.magenta(truncate(totalTime) + ' ms'),
				pico.dim('at a rate of'),
				pico.magenta(truncate(hz) + ' op/s'),
			].join(' ');

			console.log(zerothLine);

			const [p75, p99, p999] = [result.p75, result.p99, result.p999].map((n) => truncate(n));

			const firstLine = [
				indentation.second + pico.dim('·'),
				pico.dim('p75'),
				pico.magenta(p75 + ' ms'),
				columnDivider,
				pico.dim('p99'),
				pico.magenta(p99 + ' ms'),
				columnDivider,
				pico.dim('p999'),
				pico.magenta(p999 + ' ms'),
			].join(' ');

			console.log(firstLine);

			const [min, max, mean] = [result.min, result.max, result.mean].map((n) => truncate(n));

			const secondLine = [
				indentation.second + pico.dim('·'),
				pico.dim('min'),
				pico.magenta(min + ' ms'),
				columnDivider,
				pico.dim('max'),
				pico.magenta(max + ' ms'),
				columnDivider,
				pico.dim('mean'),
				pico.magenta(mean + ' ms'),
			].join(' ');

			console.log(secondLine);

			const thirdLine = [
				indentation.second + pico.dim('·'),
				pico.dim('MoE'),
				pico.magenta('±' + truncate(moe, 1) + '%'),
				columnDivider,
				pico.dim('std err'),
				pico.magenta(truncate(sem) + ' ms'),
				columnDivider,
				pico.dim('std dev'),
				pico.magenta(truncate(sd) + ' ms'),
			].join(' ');

			console.log(thirdLine + '\n');
		}
	}
}
