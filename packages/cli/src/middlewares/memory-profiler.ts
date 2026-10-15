import { isRecord } from '@n8n/utils/is-record';
import type { RequestHandler } from 'express';
import { channel } from 'node:diagnostics_channel';

const requests = channel('n8n.memory-profiler.requests');
let sequence = 0;

export function createMemoryProfilerMiddleware(
	restEndpoint: string,
	publicApiEndpoint: string,
): RequestHandler {
	Reflect.set(globalThis, Symbol.for('n8n.memory-profiler.requests'), true);
	const prefixes = [
		{ api: 'public', prefix: `/${publicApiEndpoint}` },
		{ api: 'internal', prefix: `/${restEndpoint}` },
	];
	return (req, res, next) => {
		if (!requests.hasSubscribers) return next();
		const path = req.path.toLowerCase();
		const target = prefixes.find(
			({ prefix }) => path === prefix.toLowerCase() || path.startsWith(`${prefix.toLowerCase()}/`),
		);
		if (!target) return next();
		const startedAtMs = Date.now();
		const clock = performance.now();
		const identity = {
			id: ++sequence,
			pid: process.pid,
			api: target.api,
			method: req.method,
			startedAtMs,
		};
		requests.publish({ ...identity, event: 'start', route: `${target.prefix}/(pending)` });
		let finished = false;
		const finish = () => {
			if (finished) return;
			finished = true;
			res.off('finish', finish);
			res.off('close', finish);
			const route: unknown = req.route;
			let pattern = `${target.prefix}/(unmatched)`;
			if (isRecord(route) && typeof route.path === 'string') {
				// Express mount paths contain resolved parameters. Keep their names instead.
				const params = Object.entries(req.params);
				const base = req.baseUrl
					.split('/')
					.map((part) => {
						let decoded: string;
						try {
							decoded = decodeURIComponent(part);
						} catch {
							return ':parameter';
						}
						const param = params.find(
							([, value]) => typeof value === 'string' && decoded === value,
						);
						return param ? `:${param[0]}` : part;
					})
					.join('/');
				pattern = `${base}${route.path}`;
			}
			requests.publish({
				...identity,
				event: 'finish',
				route: pattern,
				durationMs: performance.now() - clock,
				statusCode: res.statusCode,
				aborted: !res.writableFinished,
			});
		};
		res.once('finish', finish);
		res.once('close', finish);
		next();
	};
}
