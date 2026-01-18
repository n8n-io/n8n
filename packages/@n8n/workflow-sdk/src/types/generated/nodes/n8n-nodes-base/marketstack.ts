/**
 * Marketstack Node Types
 *
 * Consume Marketstack API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/marketstack/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Stock market closing data */
export type MarketstackV1EndOfDayDataGetAllConfig = {
	resource: 'endOfDayData';
	operation: 'getAll';
	/**
	 * One or multiple comma-separated stock symbols (tickers) to retrieve, e.g. &lt;code&gt;AAPL&lt;/code&gt; or &lt;code&gt;AAPL,MSFT&lt;/code&gt;
	 */
	symbols: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Stock market exchange */
export type MarketstackV1ExchangeGetConfig = {
	resource: 'exchange';
	operation: 'get';
	/**
	 * Stock exchange to retrieve, specified by &lt;a href="https://en.wikipedia.org/wiki/Market_Identifier_Code"&gt;Market Identifier Code&lt;/a&gt;, e.g. &lt;code&gt;XNAS&lt;/code&gt;
	 */
	exchange: string | Expression<string>;
};

/** Stock market symbol */
export type MarketstackV1TickerGetConfig = {
	resource: 'ticker';
	operation: 'get';
	/**
	 * Stock symbol (ticker) to retrieve, e.g. &lt;code&gt;AAPL&lt;/code&gt;
	 */
	symbol: string | Expression<string>;
};

export type MarketstackV1Params =
	| MarketstackV1EndOfDayDataGetAllConfig
	| MarketstackV1ExchangeGetConfig
	| MarketstackV1TickerGetConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MarketstackV1Credentials {
	marketstackApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MarketstackNode = {
	type: 'n8n-nodes-base.marketstack';
	version: 1;
	config: NodeConfig<MarketstackV1Params>;
	credentials?: MarketstackV1Credentials;
};
