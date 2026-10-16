import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { InferTelemetryProps } from '@n8n/telemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { RateLimitInfo } from 'express-rate-limit';

export type RateLimitName =
	| 'read_endpoint'
	| 'read_all_endpoints'
	| 'write_endpoint'
	| 'write_all_endpoints';

type SummaryEvent = InferTelemetryProps<typeof TELEMETRY_EVENT.PUBLIC_API.RATE_LIMIT_SUMMARY>;

type LimitSummary = NonNullable<SummaryEvent[RateLimitName]>;

type BusiestWindowRanges = LimitSummary['keys_by_busiest_window'];

const RATE_LIMIT_NAMES: RateLimitName[] = [
	'read_endpoint',
	'read_all_endpoints',
	'write_endpoint',
	'write_all_endpoints',
];

const RANGES: Array<[lowest: number, range: keyof BusiestWindowRanges]> = [
	[1_600, 'range_1600_plus'],
	[800, 'range_800_1599'],
	[400, 'range_400_799'],
	[200, 'range_200_399'],
	[100, 'range_100_199'],
	[50, 'range_50_99'],
	[0, 'range_0_49'],
];

/**
 * Collects counts from the Public API rate limiter for the telemetry event. The API keys stay in
 * this process: the summary that leaves it contains only counts.
 */
@Service()
export class PublicApiRateLimitSummary {
	/** For each limit, the highest count of each API key in one window. */
	private busiestWindowByKey = new Map<RateLimitName, Map<string, number>>();

	private requestsOverLimit = new Map<RateLimitName, number>();

	constructor(private readonly globalConfig: GlobalConfig) {}

	record(name: RateLimitName, { key, used, limit }: RateLimitInfo) {
		if (!this.globalConfig.diagnostics.enabled) return;

		let busiestWindowByKey = this.busiestWindowByKey.get(name);
		if (!busiestWindowByKey) {
			busiestWindowByKey = new Map();
			this.busiestWindowByKey.set(name, busiestWindowByKey);
		}
		busiestWindowByKey.set(key, Math.max(busiestWindowByKey.get(key) ?? 0, used));

		if (used > limit) {
			this.requestsOverLimit.set(name, (this.requestsOverLimit.get(name) ?? 0) + 1);
		}
	}

	/** Returns the summary since the last call and starts a new one. */
	take(): SummaryEvent | undefined {
		const activeKeys = new Set(
			[...this.busiestWindowByKey.values()].flatMap((byKey) => [...byKey.keys()]),
		);
		if (activeKeys.size === 0) return undefined;

		const summary: SummaryEvent = {
			mode: this.globalConfig.publicApi.rateLimit.mode,
			active_keys: activeKeys.size,
		};
		for (const name of RATE_LIMIT_NAMES) {
			const limitSummary = this.summarizeLimit(name);
			if (limitSummary) summary[name] = limitSummary;
		}

		this.busiestWindowByKey = new Map();
		this.requestsOverLimit = new Map();
		return summary;
	}

	private summarizeLimit(name: RateLimitName): LimitSummary | undefined {
		const { limit, windowSeconds } = this.getConfiguredLimit(name);
		if (limit === 0) return undefined;

		const ranges: BusiestWindowRanges = {
			range_0_49: 0,
			range_50_99: 0,
			range_100_199: 0,
			range_200_399: 0,
			range_400_799: 0,
			range_800_1599: 0,
			range_1600_plus: 0,
		};
		let keysOverLimit = 0;

		for (const busiestWindow of this.busiestWindowByKey.get(name)?.values() ?? []) {
			const [, range] =
				RANGES.find(([lowest]) => busiestWindow >= lowest) ?? RANGES[RANGES.length - 1];
			ranges[range]++;
			if (busiestWindow > limit) keysOverLimit++;
		}

		return {
			limit,
			window_seconds: windowSeconds,
			keys_by_busiest_window: ranges,
			keys_over_limit: keysOverLimit,
			requests_over_limit: this.requestsOverLimit.get(name) ?? 0,
		};
	}

	private getConfiguredLimit(name: RateLimitName) {
		const config = this.globalConfig.publicApi.rateLimit;
		const limits: Record<RateLimitName, { limit: number; windowSeconds: number }> = {
			read_endpoint: {
				limit: config.endpointReadLimit,
				windowSeconds: config.endpointReadWindowSeconds,
			},
			read_all_endpoints: {
				limit: config.globalReadLimit,
				windowSeconds: config.globalReadWindowSeconds,
			},
			write_endpoint: {
				limit: config.endpointWriteLimit,
				windowSeconds: config.endpointWriteWindowSeconds,
			},
			write_all_endpoints: {
				limit: config.globalWriteLimit,
				windowSeconds: config.globalWriteWindowSeconds,
			},
		};
		return limits[name];
	}
}
