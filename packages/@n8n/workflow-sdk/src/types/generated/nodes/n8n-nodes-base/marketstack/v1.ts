/**
 * Marketstack Node - Version 1
 * Consume Marketstack API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Stock market closing data */
export type MarketstackV1EndOfDayDataGetAllConfig = {
	resource: 'endOfDayData';
	operation: 'getAll';
/**
 * One or multiple comma-separated stock symbols (tickers) to retrieve, e.g. &lt;code&gt;AAPL&lt;/code&gt; or &lt;code&gt;AAPL,MSFT&lt;/code&gt;
 * @displayOptions.show { resource: ["endOfDayData"], operation: ["getAll"] }
 */
		symbols: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["endOfDayData"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["endOfDayData"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["exchange"], operation: ["get"] }
 */
		exchange: string | Expression<string>;
};

/** Stock market symbol */
export type MarketstackV1TickerGetConfig = {
	resource: 'ticker';
	operation: 'get';
/**
 * Stock symbol (ticker) to retrieve, e.g. &lt;code&gt;AAPL&lt;/code&gt;
 * @displayOptions.show { resource: ["ticker"], operation: ["get"] }
 */
		symbol: string | Expression<string>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type MarketstackV1EndOfDayDataGetAllOutput = {
	date?: string;
	exchange?: string;
	split_factor?: number;
	symbol?: string;
	volume?: number;
};

export type MarketstackV1TickerGetOutput = {
	country?: null;
	has_eod?: boolean;
	has_intraday?: boolean;
	name?: string;
	stock_exchange?: {
		acronym?: string;
		city?: string;
		country_code?: string;
		mic?: string;
		name?: string;
		website?: string;
	};
	symbol?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface MarketstackV1Credentials {
	marketstackApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MarketstackV1NodeBase {
	type: 'n8n-nodes-base.marketstack';
	version: 1;
	credentials?: MarketstackV1Credentials;
}

export type MarketstackV1EndOfDayDataGetAllNode = MarketstackV1NodeBase & {
	config: NodeConfig<MarketstackV1EndOfDayDataGetAllConfig>;
	output?: MarketstackV1EndOfDayDataGetAllOutput;
};

export type MarketstackV1ExchangeGetNode = MarketstackV1NodeBase & {
	config: NodeConfig<MarketstackV1ExchangeGetConfig>;
};

export type MarketstackV1TickerGetNode = MarketstackV1NodeBase & {
	config: NodeConfig<MarketstackV1TickerGetConfig>;
	output?: MarketstackV1TickerGetOutput;
};

export type MarketstackV1Node =
	| MarketstackV1EndOfDayDataGetAllNode
	| MarketstackV1ExchangeGetNode
	| MarketstackV1TickerGetNode
	;