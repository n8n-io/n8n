import { normalizeProvider } from '@n8n/ai-utilities/llm-usage';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';

import { LlmUsageConfig } from './llm-usage.config';
import type { ModelPrices } from './pricing';

/** The catalog as served. Nothing in it is trusted: each entry is checked when it loads. */
interface CatalogResponse {
	version?: unknown;
	models?: unknown;
}

interface Tier {
	threshold: number;
	prices: ModelPrices;
}

const REFRESH_INTERVAL_MS = Time.days.toMilliseconds;
/** How often the timer looks for a due refresh, and so how soon a failed load is retried. */
const CHECK_INTERVAL_MS = Time.minutes.toMilliseconds;
const REQUEST_TIMEOUT_MS = 30 * Time.seconds.toMilliseconds;
/** The full catalog is about 1 MB. */
const MAX_CATALOG_BYTES = 20 * 1024 * 1024;
/** A date suffix in a model name, as in `-20250929` or `-2024-07-18`. */
const DATE_SUFFIX = /-\d{8}$|-\d{4}-\d{2}-\d{2}$/;
/** A long-context tier entry: `<model>-gt-<N>k` prices inputs above N thousand tokens. */
const CONTEXT_TIER = /^(.+)-gt-(\d+)k$/;

/** A price per token, or `undefined` when the value is not a usable price. */
const priceOf = (prices: unknown, name: keyof ModelPrices) => {
	if (typeof prices !== 'object' || prices === null) return undefined;
	const value: unknown = Reflect.get(prices, name);
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
};

/** An entry with a provider and a model. A bad entry is skipped, not the whole catalog. */
const isCatalogEntry = (
	entry: unknown,
): entry is { provider: string; model: string; prices?: unknown } =>
	typeof entry === 'object' &&
	entry !== null &&
	'provider' in entry &&
	typeof entry.provider === 'string' &&
	'model' in entry &&
	typeof entry.model === 'string';

/** The n8n price catalog, kept in memory and refreshed daily. Only token prices are kept. */
@Service()
export class PriceCatalogService {
	/** Prices by `provider/model`. */
	private prices = new Map<string, ModelPrices>();

	/** Long-context tiers by `provider/model`, highest threshold first. */
	private tiers = new Map<string, Tier[]>();

	/** `provider/model` by model name, or `null` when several providers have the model. */
	private keyByModel = new Map<string, string | null>();

	private version: string | undefined;

	/** The entity tag of the loaded catalog, so an unchanged catalog is not downloaded again. */
	private etag: string | undefined;

	private timer: NodeJS.Timeout | undefined;

	private loadedAt = 0;

	private readonly changeListeners: Array<() => void> = [];

	constructor(
		private readonly config: LlmUsageConfig,
		private readonly outboundHttp: OutboundHttp,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('llm-usage');
	}

	async start() {
		// Checks every minute, so a failed load is retried soon instead of the next day.
		// The timer starts first, so a first load that fails or hangs is retried too.
		this.timer = setInterval(async () => {
			if (Date.now() - this.loadedAt >= REFRESH_INTERVAL_MS) await this.refresh();
		}, CHECK_INTERVAL_MS);
		this.timer.unref();
		await this.refresh();
	}

	stop() {
		clearInterval(this.timer);
	}

	async refresh() {
		if (!this.config.catalogUrl) return;
		try {
			// The URL comes from instance configuration, not from user input.
			const response = await this.outboundHttp
				.requests({ useDefaultSsrfPolicy: 'unsafe' })
				.request<CatalogResponse>({
					url: this.config.catalogUrl,
					method: 'GET',
					json: true,
					timeout: REQUEST_TIMEOUT_MS,
					maxResponseBodyBytes: MAX_CATALOG_BYTES,
					headers: this.etag ? { 'if-none-match': this.etag } : undefined,
					returnFullResponse: true,
					// A 304 is the expected answer to an unchanged catalog, not an error.
					ignoreHttpStatusErrors: true,
				});
			if (response.statusCode === 304) {
				this.loadedAt = Date.now();
				return;
			}
			if (response.statusCode >= 300) {
				this.logger.warn('Could not refresh the LLM price catalog, keeping the last one', {
					statusCode: response.statusCode,
				});
				return;
			}
			const catalog = response.body;
			// A body without a model list is not a catalog: loading it would drop every price.
			if (typeof catalog !== 'object' || catalog === null || !Array.isArray(catalog.models)) {
				this.logger.warn('The LLM price catalog has no model list, keeping the last one');
				return;
			}
			const etag = response.headers.etag;
			this.etag = typeof etag === 'string' ? etag : undefined;
			this.loadedAt = Date.now();
			const version = typeof catalog.version === 'string' ? catalog.version : undefined;
			if (version !== undefined && version === this.version) return;
			this.load(catalog);
			this.version = version;
			for (const listener of this.changeListeners) listener();
		} catch (error) {
			this.logger.warn('Could not refresh the LLM price catalog, keeping the last one', { error });
		}
	}

	/** Calls `listener` each time a new catalog version loads. */
	onChange(listener: () => void) {
		this.changeListeners.push(listener);
	}

	lookup(provider: string, model: string, inputTokens: number): ModelPrices | undefined {
		const undated = model.replace(DATE_SUFFIX, '');
		const slash = model.indexOf('/');
		const vendorModel = slash > 0 ? model.slice(slash + 1) : undefined;
		const keys = [`${provider}/${model}`, `${provider}/${undated}`];
		// An OpenRouter-style `vendor/model` string names its own provider.
		if (vendorModel) keys.push(`${normalizeProvider(model.slice(0, slash))}/${vendorModel}`);
		// Nodes built on the OpenAI client report `openai` for other providers, so fall back to
		// a model name that only one provider has.
		for (const name of [model, undated, vendorModel]) {
			const key = name && this.keyByModel.get(name);
			if (key) keys.push(key);
		}

		for (const key of keys) {
			const prices = this.prices.get(key);
			if (!prices) continue;
			return this.tiers.get(key)?.find((tier) => inputTokens > tier.threshold)?.prices ?? prices;
		}
		return undefined;
	}

	private load(catalog: CatalogResponse) {
		const prices = new Map<string, ModelPrices>();
		const tiers = new Map<string, Tier[]>();
		const keyByModel = new Map<string, string | null>();

		for (const entry of Array.isArray(catalog.models) ? catalog.models : []) {
			if (!isCatalogEntry(entry)) continue;
			const modelPrices: ModelPrices = {
				input: priceOf(entry.prices, 'input'),
				output: priceOf(entry.prices, 'output'),
				cacheRead: priceOf(entry.prices, 'cacheRead'),
				cacheWrite: priceOf(entry.prices, 'cacheWrite'),
			};
			const provider = normalizeProvider(entry.provider);
			const tier = CONTEXT_TIER.exec(entry.model);
			if (tier) {
				const [, baseModel, thousands] = tier;
				const key = `${provider}/${baseModel}`;
				const list = [
					...(tiers.get(key) ?? []),
					{ threshold: Number(thousands) * 1000, prices: modelPrices },
				];
				tiers.set(
					key,
					list.sort((a, b) => b.threshold - a.threshold),
				);
				continue;
			}
			const key = `${provider}/${entry.model}`;
			prices.set(key, modelPrices);
			const known = keyByModel.get(entry.model);
			keyByModel.set(entry.model, known === undefined || known === key ? key : null);
		}

		this.prices = prices;
		this.tiers = tiers;
		this.keyByModel = keyByModel;
	}
}
