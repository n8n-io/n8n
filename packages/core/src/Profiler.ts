import { setFlagsFromString } from 'v8';
import { runInNewContext } from 'vm';
import { sleep, ErrorReporterProxy as ErrorReporter } from 'n8n-workflow';

const isProfilingEnabled = process.env.PROFILING_ENABLED === 'true';

if (isProfilingEnabled) {
	setFlagsFromString('--expose_gc');
}

const gc = isProfilingEnabled ? (runInNewContext('gc') as unknown as () => void) : () => undefined;
const gcAndWait = async (duration = 100) => {
	gc();
	await sleep(duration);
};

const currentMemory = () => Math.floor(process.memoryUsage().heapTotal / 1024 / 1024);

const noopProfiler = async () => ({ end: async () => undefined });

const actualProfiler = async (metadata: Record<string, string | number | boolean | undefined>) => {
	await gcAndWait();
	const startMemory = currentMemory();
	return {
		end: async () => {
			const used = currentMemory() - startMemory;
			if (used > 5) {
				await gcAndWait(1000);
				const current = currentMemory();
				const retained = current - startMemory;
				const recovered = used - retained;
				const payload = {
					metadata,
					memory: { used, retained, recovered, current },
				};
				if (retained > 5) {
					ErrorReporter.warn('Potential memory leak detected', { extra: payload });
				}
				if (recovered > 20) {
					ErrorReporter.warn('Too much garbage generated', { extra: payload });
				}
			}
		},
	};
};

export const profileStart = isProfilingEnabled ? actualProfiler : noopProfiler;
