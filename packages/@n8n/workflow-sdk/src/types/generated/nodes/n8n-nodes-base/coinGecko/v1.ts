/**
 * CoinGecko Node - Version 1
 * Consume CoinGecko API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get a candlestick open-high-low-close chart for the selected currency */
export type CoinGeckoV1CoinCandlestickConfig = {
	resource: 'coin';
	operation: 'candlestick';
/**
 * The first currency in the pair. For BTC:ETH this is BTC. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["candlestick"], resource: ["coin"] }
 */
		baseCurrency: string | Expression<string>;
/**
 * The second currency in the pair. For BTC:ETH this is ETH. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["candlestick", "marketChart"], resource: ["coin"] }
 */
		quoteCurrency: string | Expression<string>;
/**
 * Return data for this many days in the past from now
 * @displayOptions.show { operation: ["marketChart", "candlestick"], resource: ["coin"] }
 */
		days: '1' | '7' | '14' | '30' | '90' | '180' | '365' | 'max' | Expression<string>;
};

/** Get current data for a coin */
export type CoinGeckoV1CoinGetConfig = {
	resource: 'coin';
	operation: 'get';
/**
 * Search by coin ID or contract address
 * @displayOptions.show { operation: ["get", "marketChart", "price"], resource: ["coin"] }
 * @default coinId
 */
		searchBy: 'coinId' | 'contractAddress' | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["get"], resource: ["coin"] }
 */
		coinId: string | Expression<string>;
/**
 * The ID of the platform issuing tokens
 * @displayOptions.show { operation: ["get", "marketChart", "price"], resource: ["coin"], searchBy: ["contractAddress"] }
 * @default ethereum
 */
		platformId: 'ethereum' | Expression<string>;
/**
 * Token's contract address
 * @displayOptions.show { operation: ["get", "marketChart"], resource: ["coin"], searchBy: ["contractAddress"] }
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
 * @displayOptions.show { operation: ["getAll", "market", "ticker"], resource: ["coin"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll", "market", "ticker"], resource: ["coin"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["ticker", "history"], resource: ["coin"] }
 */
		coinId: string | Expression<string>;
/**
 * The date of data snapshot
 * @displayOptions.show { operation: ["history"], resource: ["coin"] }
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
 * @displayOptions.show { operation: ["market"], resource: ["coin"] }
 */
		baseCurrency: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll", "market", "ticker"], resource: ["coin"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll", "market", "ticker"], resource: ["coin"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["get", "marketChart", "price"], resource: ["coin"] }
 * @default coinId
 */
		searchBy: 'coinId' | 'contractAddress' | Expression<string>;
/**
 * The ID of the platform issuing tokens
 * @displayOptions.show { operation: ["get", "marketChart", "price"], resource: ["coin"], searchBy: ["contractAddress"] }
 * @default ethereum
 */
		platformId: 'ethereum' | Expression<string>;
/**
 * Token's contract address
 * @displayOptions.show { operation: ["get", "marketChart"], resource: ["coin"], searchBy: ["contractAddress"] }
 */
		contractAddress: string | Expression<string>;
/**
 * The first currency in the pair. For BTC:ETH this is BTC. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["marketChart"], resource: ["coin"], searchBy: ["coinId"] }
 * @displayOptions.hide { searchBy: ["contractAddress"] }
 */
		baseCurrency: string | Expression<string>;
/**
 * The second currency in the pair. For BTC:ETH this is ETH. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["candlestick", "marketChart"], resource: ["coin"] }
 */
		quoteCurrency: string | Expression<string>;
/**
 * Return data for this many days in the past from now
 * @displayOptions.show { operation: ["marketChart", "candlestick"], resource: ["coin"] }
 */
		days: '1' | '7' | '14' | '30' | '90' | '180' | '365' | 'max' | Expression<string>;
};

/** Get the current price of any cryptocurrencies in any other supported currencies that you need */
export type CoinGeckoV1CoinPriceConfig = {
	resource: 'coin';
	operation: 'price';
/**
 * Search by coin ID or contract address
 * @displayOptions.show { operation: ["get", "marketChart", "price"], resource: ["coin"] }
 * @default coinId
 */
		searchBy: 'coinId' | 'contractAddress' | Expression<string>;
/**
 * The first currency in the pair. For BTC:ETH this is BTC. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["price"], resource: ["coin"], searchBy: ["coinId"] }
 * @default []
 */
		baseCurrencies: string[];
/**
 * The ID of the platform issuing tokens
 * @displayOptions.show { operation: ["get", "marketChart", "price"], resource: ["coin"], searchBy: ["contractAddress"] }
 * @default ethereum
 */
		platformId: 'ethereum' | Expression<string>;
/**
 * The contract address of tokens, comma-separated
 * @displayOptions.show { operation: ["price"], resource: ["coin"], searchBy: ["contractAddress"] }
 */
		contractAddresses: string | Expression<string>;
/**
 * The second currency in the pair. For BTC:ETH this is ETH. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["price"], resource: ["coin"] }
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
 * @displayOptions.show { operation: ["ticker", "history"], resource: ["coin"] }
 */
		coinId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll", "market", "ticker"], resource: ["coin"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll", "market", "ticker"], resource: ["coin"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["getAll"], resource: ["event"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["event"], returnAll: [false] }
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
	| CoinGeckoV1EventGetAllConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type CoinGeckoV1CoinCandlestickOutput = {
	time?: string;
};

export type CoinGeckoV1CoinGetOutput = {
	additional_notices?: Array<string>;
	block_time_in_minutes?: number;
	categories?: Array<string>;
	description?: {
		en?: string;
	};
	id?: string;
	image?: {
		large?: string;
		small?: string;
		thumb?: string;
	};
	links?: {
		chat_url?: Array<string>;
		homepage?: Array<string>;
		official_forum_url?: Array<string>;
		repos_url?: {
			github?: Array<string>;
		};
		twitter_screen_name?: string;
		whitepaper?: string;
	};
	name?: string;
	preview_listing?: boolean;
	symbol?: string;
	watchlist_portfolio_users?: number;
	web_slug?: string;
};

export type CoinGeckoV1CoinGetAllOutput = {
	id?: string;
	name?: string;
	symbol?: string;
};

export type CoinGeckoV1CoinHistoryOutput = {
	community_data?: {
		facebook_likes?: null;
		reddit_average_comments_48h?: number;
		reddit_average_posts_48h?: number;
		reddit_subscribers?: null;
	};
	developer_data?: {
		closed_issues?: null;
		code_additions_deletions_4_weeks?: {
			additions?: null;
			deletions?: null;
		};
		commit_count_4_weeks?: null;
		forks?: null;
		pull_request_contributors?: null;
		pull_requests_merged?: null;
		stars?: null;
		subscribers?: null;
		total_issues?: null;
	};
	id?: string;
	image?: {
		small?: string;
		thumb?: string;
	};
	localization?: {
		ar?: string;
		bg?: string;
		cs?: string;
		da?: string;
		de?: string;
		el?: string;
		en?: string;
		es?: string;
		fi?: string;
		fr?: string;
		he?: string;
		hi?: string;
		hr?: string;
		hu?: string;
		id?: string;
		it?: string;
		ja?: string;
		ko?: string;
		lt?: string;
		nl?: string;
		no?: string;
		pl?: string;
		pt?: string;
		ro?: string;
		ru?: string;
		sk?: string;
		sl?: string;
		sv?: string;
		th?: string;
		tr?: string;
		uk?: string;
		vi?: string;
		zh?: string;
		'zh-tw'?: string;
	};
	market_data?: {
		current_price?: {
			aed?: number;
			ars?: number;
			aud?: number;
			bch?: number;
			bdt?: number;
			bhd?: number;
			bits?: number;
			bmd?: number;
			bnb?: number;
			brl?: number;
			cad?: number;
			chf?: number;
			clp?: number;
			cny?: number;
			czk?: number;
			dkk?: number;
			dot?: number;
			eos?: number;
			eth?: number;
			eur?: number;
			gbp?: number;
			gel?: number;
			hkd?: number;
			huf?: number;
			idr?: number;
			ils?: number;
			inr?: number;
			jpy?: number;
			krw?: number;
			kwd?: number;
			link?: number;
			lkr?: number;
			ltc?: number;
			mmk?: number;
			mxn?: number;
			myr?: number;
			ngn?: number;
			nok?: number;
			nzd?: number;
			php?: number;
			pkr?: number;
			pln?: number;
			rub?: number;
			sar?: number;
			sats?: number;
			sek?: number;
			sgd?: number;
			thb?: number;
			'try'?: number;
			twd?: number;
			uah?: number;
			usd?: number;
			vef?: number;
			vnd?: number;
			xag?: number;
			xau?: number;
			xdr?: number;
			xlm?: number;
			xrp?: number;
			yfi?: number;
			zar?: number;
		};
		total_volume?: {
			aed?: number;
			aud?: number;
			bch?: number;
			bdt?: number;
			bhd?: number;
			bits?: number;
			bmd?: number;
			bnb?: number;
			brl?: number;
			btc?: number;
			cad?: number;
			chf?: number;
			clp?: number;
			cny?: number;
			czk?: number;
			dkk?: number;
			dot?: number;
			eos?: number;
			eth?: number;
			eur?: number;
			gbp?: number;
			gel?: number;
			hkd?: number;
			huf?: number;
			ils?: number;
			inr?: number;
			jpy?: number;
			krw?: number;
			kwd?: number;
			link?: number;
			lkr?: number;
			ltc?: number;
			mmk?: number;
			mxn?: number;
			myr?: number;
			ngn?: number;
			nok?: number;
			nzd?: number;
			php?: number;
			pkr?: number;
			pln?: number;
			rub?: number;
			sar?: number;
			sats?: number;
			sek?: number;
			sgd?: number;
			thb?: number;
			'try'?: number;
			twd?: number;
			uah?: number;
			usd?: number;
			vef?: number;
			xag?: number;
			xau?: number;
			xdr?: number;
			xlm?: number;
			xrp?: number;
			yfi?: number;
			zar?: number;
		};
	};
	name?: string;
	public_interest_stats?: {
		alexa_rank?: null;
		bing_matches?: null;
	};
	symbol?: string;
};

export type CoinGeckoV1CoinMarketOutput = {
	ath_date?: string;
	atl_change_percentage?: number;
	atl_date?: string;
	id?: string;
	image?: string;
	last_updated?: string;
	market_cap?: number;
	name?: string;
	symbol?: string;
};

export type CoinGeckoV1CoinMarketChartOutput = {
	time?: string;
};

export type CoinGeckoV1CoinPriceOutput = {
	'nacho-the-kat'?: {
		usd: number;
	};
};

export type CoinGeckoV1CoinTickerOutput = {
	base?: string;
	coin_id?: string;
	converted_last?: {
		btc?: number;
		eth?: number;
	};
	is_anomaly?: boolean;
	is_stale?: boolean;
	last?: number;
	last_fetch_at?: string;
	last_traded_at?: string;
	market?: {
		has_trading_incentive?: boolean;
		identifier?: string;
		name?: string;
	};
	target?: string;
	target_coin_id?: string;
	timestamp?: string;
	token_info_url?: null;
	trade_url?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface CoinGeckoV1NodeBase {
	type: 'n8n-nodes-base.coinGecko';
	version: 1;
}

export type CoinGeckoV1CoinCandlestickNode = CoinGeckoV1NodeBase & {
	config: NodeConfig<CoinGeckoV1CoinCandlestickConfig>;
	output?: CoinGeckoV1CoinCandlestickOutput;
};

export type CoinGeckoV1CoinGetNode = CoinGeckoV1NodeBase & {
	config: NodeConfig<CoinGeckoV1CoinGetConfig>;
	output?: CoinGeckoV1CoinGetOutput;
};

export type CoinGeckoV1CoinGetAllNode = CoinGeckoV1NodeBase & {
	config: NodeConfig<CoinGeckoV1CoinGetAllConfig>;
	output?: CoinGeckoV1CoinGetAllOutput;
};

export type CoinGeckoV1CoinHistoryNode = CoinGeckoV1NodeBase & {
	config: NodeConfig<CoinGeckoV1CoinHistoryConfig>;
	output?: CoinGeckoV1CoinHistoryOutput;
};

export type CoinGeckoV1CoinMarketNode = CoinGeckoV1NodeBase & {
	config: NodeConfig<CoinGeckoV1CoinMarketConfig>;
	output?: CoinGeckoV1CoinMarketOutput;
};

export type CoinGeckoV1CoinMarketChartNode = CoinGeckoV1NodeBase & {
	config: NodeConfig<CoinGeckoV1CoinMarketChartConfig>;
	output?: CoinGeckoV1CoinMarketChartOutput;
};

export type CoinGeckoV1CoinPriceNode = CoinGeckoV1NodeBase & {
	config: NodeConfig<CoinGeckoV1CoinPriceConfig>;
	output?: CoinGeckoV1CoinPriceOutput;
};

export type CoinGeckoV1CoinTickerNode = CoinGeckoV1NodeBase & {
	config: NodeConfig<CoinGeckoV1CoinTickerConfig>;
	output?: CoinGeckoV1CoinTickerOutput;
};

export type CoinGeckoV1EventGetAllNode = CoinGeckoV1NodeBase & {
	config: NodeConfig<CoinGeckoV1EventGetAllConfig>;
};

export type CoinGeckoV1Node =
	| CoinGeckoV1CoinCandlestickNode
	| CoinGeckoV1CoinGetNode
	| CoinGeckoV1CoinGetAllNode
	| CoinGeckoV1CoinHistoryNode
	| CoinGeckoV1CoinMarketNode
	| CoinGeckoV1CoinMarketChartNode
	| CoinGeckoV1CoinPriceNode
	| CoinGeckoV1CoinTickerNode
	| CoinGeckoV1EventGetAllNode
	;