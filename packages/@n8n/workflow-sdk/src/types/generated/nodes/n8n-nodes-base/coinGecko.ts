/**
 * CoinGecko Node Types
 *
 * Consume CoinGecko API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/coingecko/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get a candlestick open-high-low-close chart for the selected currency */
export type CoinGeckoV1CoinCandlestickConfig = {
	resource: 'coin';
	operation: 'candlestick';
	/**
	 * The first currency in the pair. For BTC:ETH this is BTC. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	baseCurrency: string | Expression<string>;
	/**
	 * The second currency in the pair. For BTC:ETH this is ETH. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	quoteCurrency: string | Expression<string>;
	/**
	 * Return data for this many days in the past from now
	 */
	days: '1' | '7' | '14' | '30' | '90' | '180' | '365' | 'max' | Expression<string>;
};

/** Get current data for a coin */
export type CoinGeckoV1CoinGetConfig = {
	resource: 'coin';
	operation: 'get';
	/**
	 * Search by coin ID or contract address
	 * @default coinId
	 */
	searchBy: 'coinId' | 'contractAddress' | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	coinId: string | Expression<string>;
	/**
	 * The ID of the platform issuing tokens
	 * @default ethereum
	 */
	platformId: 'ethereum' | Expression<string>;
	/**
	 * Token's contract address
	 */
	contractAddress: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many coins */
export type CoinGeckoV1CoinGetAllConfig = {
	resource: 'coin';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Get historical data (name, price, market, stats) at a given date for a coin */
export type CoinGeckoV1CoinHistoryConfig = {
	resource: 'coin';
	operation: 'history';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	coinId: string | Expression<string>;
	/**
	 * The date of data snapshot
	 */
	date: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get prices and market related data for all trading pairs that match the selected currency */
export type CoinGeckoV1CoinMarketConfig = {
	resource: 'coin';
	operation: 'market';
	/**
	 * The first currency in the pair. For BTC:ETH this is BTC. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	baseCurrency: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Get historical market data include price, market cap, and 24h volume (granularity auto) */
export type CoinGeckoV1CoinMarketChartConfig = {
	resource: 'coin';
	operation: 'marketChart';
	/**
	 * Search by coin ID or contract address
	 * @default coinId
	 */
	searchBy: 'coinId' | 'contractAddress' | Expression<string>;
	/**
	 * The ID of the platform issuing tokens
	 * @default ethereum
	 */
	platformId: 'ethereum' | Expression<string>;
	/**
	 * Token's contract address
	 */
	contractAddress: string | Expression<string>;
	/**
	 * The first currency in the pair. For BTC:ETH this is BTC. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	baseCurrency: string | Expression<string>;
	/**
	 * The second currency in the pair. For BTC:ETH this is ETH. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	quoteCurrency: string | Expression<string>;
	/**
	 * Return data for this many days in the past from now
	 */
	days: '1' | '7' | '14' | '30' | '90' | '180' | '365' | 'max' | Expression<string>;
};

/** Get the current price of any cryptocurrencies in any other supported currencies that you need */
export type CoinGeckoV1CoinPriceConfig = {
	resource: 'coin';
	operation: 'price';
	/**
	 * Search by coin ID or contract address
	 * @default coinId
	 */
	searchBy: 'coinId' | 'contractAddress' | Expression<string>;
	/**
	 * The first currency in the pair. For BTC:ETH this is BTC. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	baseCurrencies: string[];
	/**
	 * The ID of the platform issuing tokens
	 * @default ethereum
	 */
	platformId: 'ethereum' | Expression<string>;
	/**
	 * The contract address of tokens, comma-separated
	 */
	contractAddresses: string | Expression<string>;
	/**
	 * The second currency in the pair. For BTC:ETH this is ETH. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	quoteCurrencies: string[];
	options?: Record<string, unknown>;
};

/** Get coin tickers */
export type CoinGeckoV1CoinTickerConfig = {
	resource: 'coin';
	operation: 'ticker';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	coinId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Get many coins */
export type CoinGeckoV1EventGetAllConfig = {
	resource: 'event';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

export type CoinGeckoV1Params =
	| CoinGeckoV1CoinCandlestickConfig
	| CoinGeckoV1CoinGetConfig
	| CoinGeckoV1CoinGetAllConfig
	| CoinGeckoV1CoinHistoryConfig
	| CoinGeckoV1CoinMarketConfig
	| CoinGeckoV1CoinMarketChartConfig
	| CoinGeckoV1CoinPriceConfig
	| CoinGeckoV1CoinTickerConfig
	| CoinGeckoV1EventGetAllConfig;

// ===========================================================================
// Node Type
// ===========================================================================

export type CoinGeckoNode = {
	type: 'n8n-nodes-base.coinGecko';
	version: 1;
	config: NodeConfig<CoinGeckoV1Params>;
	credentials?: Record<string, never>;
};
