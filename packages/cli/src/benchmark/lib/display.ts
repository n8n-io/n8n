import pico from 'picocolors';
import type Bench from 'tinybench';
import type { Suites } from './types';
import { assert } from 'n8n-workflow';

function truncate(n: number, decimalPlaces: number) {
	const nStr = n.toString();
	const index = nStr.indexOf('.');

	let truncated = nStr.slice(0, index + decimalPlaces + 1);

	while (truncated.length < index + decimalPlaces + 1) {
		truncated += '0';
	}

	return truncated;
}

export function display(suites: Suites, results: Bench['results']) {
	const INDENTATION = {
		FIRST: ' ',
		SECOND: ' '.repeat(4),
		THIRD: ' '.repeat(6),
	};

	for (const [key, suite] of Object.entries(suites)) {
		const segments = key.split('/');
		const dirs = segments.slice(0, -1).join('/') + '/';
		const [fileName] = segments.slice(-1);

		console.log(
			'\n',
			pico.bgWhite(pico.black(' BENCHMARK ')),
			pico.gray(dirs) + pico.bold(fileName + '.ts'),
			'\n',
		);

		for (const task of suite.tasks) {
			console.log(INDENTATION.FIRST, pico.white('•'), task.name);

			const result = results.shift();

			assert(result !== undefined);

			const [p75, p99, p999] = [result.p75, result.p99, result.p999].map((n) => truncate(n, 3));

			console.log(
				INDENTATION.SECOND,
				pico.dim('p75'),
				pico.magenta(p75 + ' ms'),
				'  ',
				pico.dim('p99'),
				pico.magenta(p99 + ' ms'),
				'  ',
				pico.dim('p999'),
				pico.magenta(p999 + ' ms'),
			);

			const [min, max, mean] = [result.min, result.max, result.mean].map((n) => truncate(n, 3));

			console.log(
				INDENTATION.SECOND,
				pico.dim('min'),
				pico.magenta(min + ' ms'),
				'  ',
				pico.dim('max'),
				pico.magenta(max + ' ms'),
				'  ',
				pico.dim('mean'),
				pico.magenta(mean + ' ms'),
			);

			const { totalTime, samples, sd, hz, moe, sem, variance } = result;

			console.log(
				INDENTATION.SECOND,
				pico.dim('details'),
				'\n',
				pico.dim(INDENTATION.THIRD + '├─'),
				pico.dim('total time'),
				pico.magenta(truncate(totalTime, 3) + ' ms'),
				'\n',
				pico.dim(INDENTATION.THIRD + '├─'),
				pico.dim('iterations'),
				pico.magenta(samples.length),
				'\n',
				pico.dim(INDENTATION.THIRD + '├─'),
				pico.dim('throughput'),
				pico.magenta(truncate(hz, 3) + ' ops/s'),
				'\n',
				pico.dim(INDENTATION.THIRD + '├─'),
				pico.dim('variance'),
				pico.magenta(variance + ' ms²'),
				'\n',
				pico.dim(INDENTATION.THIRD + '├─'),
				pico.dim('margin of error'),
				pico.magenta('±' + moe + '%'),
				'\n',
				pico.dim(INDENTATION.THIRD + '├─'),
				pico.dim('standard deviation'),
				pico.magenta(sd + ' ms'),
				'\n',
				pico.dim(INDENTATION.THIRD + '└─'),
				pico.dim('standard error of the mean'),
				pico.magenta(sem + ' ms'),
				'\n',
			);
		}
	}
}
