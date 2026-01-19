/**
 * Wise Node - Version 1
 * Consume the Wise API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Retrieve balances for all account currencies of this user */
export type WiseV1AccountGetBalancesConfig = {
	resource: 'account';
	operation: 'getBalances';
/**
 * ID of the user profile to retrieve the balance of. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["account"], operation: ["getBalances"] }
 * @default []
 */
		profileId: string | Expression<string>;
};

/** Retrieve currencies in the borderless account of this user */
export type WiseV1AccountGetCurrenciesConfig = {
	resource: 'account';
	operation: 'getCurrencies';
};

/** Retrieve the statement for the borderless account of this user */
export type WiseV1AccountGetStatementConfig = {
	resource: 'account';
	operation: 'getStatement';
/**
 * ID of the user profile whose account to retrieve the statement of. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["account"], operation: ["getStatement"] }
 * @default []
 */
		profileId?: string | Expression<string>;
/**
 * ID of the borderless account to retrieve the statement of. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["account"], operation: ["getStatement"] }
 * @default []
 */
		borderlessAccountId: string | Expression<string>;
/**
 * Code of the currency of the borderless account to retrieve the statement of
 * @displayOptions.show { resource: ["account"], operation: ["getStatement"] }
 */
		currency?: string | Expression<string>;
/**
 * File format to retrieve the statement in
 * @displayOptions.show { resource: ["account"], operation: ["getStatement"] }
 * @default json
 */
		format?: 'json' | 'csv' | 'pdf' | 'xml' | Expression<string>;
	binaryProperty: string | Expression<string>;
/**
 * Name of the file that will be downloaded
 * @displayOptions.show { resource: ["account"], operation: ["getStatement"], format: ["csv", "pdf", "xml"] }
 */
		fileName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type WiseV1ExchangeRateGetConfig = {
	resource: 'exchangeRate';
	operation: 'get';
/**
 * Code of the source currency to retrieve the exchange rate for
 * @displayOptions.show { resource: ["exchangeRate"], operation: ["get"] }
 */
		source?: string | Expression<string>;
/**
 * Code of the target currency to retrieve the exchange rate for
 * @displayOptions.show { resource: ["exchangeRate"], operation: ["get"] }
 */
		target?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type WiseV1ProfileGetConfig = {
	resource: 'profile';
	operation: 'get';
/**
 * ID of the user profile to retrieve. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["profile"], operation: ["get"] }
 * @default []
 */
		profileId: string | Expression<string>;
};

export type WiseV1ProfileGetAllConfig = {
	resource: 'profile';
	operation: 'getAll';
};

export type WiseV1QuoteCreateConfig = {
	resource: 'quote';
	operation: 'create';
/**
 * ID of the user profile to create the quote under. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["quote"], operation: ["create"] }
 * @default []
 */
		profileId: string | Expression<string>;
/**
 * ID of the account that will receive the funds. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["quote"], operation: ["create"] }
 * @default []
 */
		targetAccountId: string | Expression<string>;
/**
 * Whether the amount is to be sent or received
 * @displayOptions.show { resource: ["quote"], operation: ["create"] }
 * @default source
 */
		amountType?: 'source' | 'target' | Expression<string>;
/**
 * Amount of funds for the quote to create
 * @displayOptions.show { resource: ["quote"], operation: ["create"] }
 * @default 1
 */
		amount?: number | Expression<number>;
/**
 * Code of the currency to send for the quote to create
 * @displayOptions.show { resource: ["quote"], operation: ["create"] }
 */
		sourceCurrency?: string | Expression<string>;
/**
 * Code of the currency to receive for the quote to create
 * @displayOptions.show { resource: ["quote"], operation: ["create"] }
 */
		targetCurrency?: string | Expression<string>;
};

export type WiseV1QuoteGetConfig = {
	resource: 'quote';
	operation: 'get';
/**
 * ID of the quote to retrieve
 * @displayOptions.show { resource: ["quote"], operation: ["get"] }
 */
		quoteId: string | Expression<string>;
};

export type WiseV1RecipientGetAllConfig = {
	resource: 'recipient';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["recipient"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["recipient"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
};

export type WiseV1TransferCreateConfig = {
	resource: 'transfer';
	operation: 'create';
/**
 * ID of the user profile to retrieve the balance of. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["transfer"], operation: ["create"] }
 * @default []
 */
		profileId: string | Expression<string>;
/**
 * ID of the quote based on which to create the transfer
 * @displayOptions.show { resource: ["transfer"], operation: ["create"] }
 */
		quoteId: string | Expression<string>;
/**
 * ID of the account that will receive the funds. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["transfer"], operation: ["create"] }
 * @default []
 */
		targetAccountId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type WiseV1TransferDeleteConfig = {
	resource: 'transfer';
	operation: 'delete';
/**
 * ID of the transfer to delete
 * @displayOptions.show { resource: ["transfer"], operation: ["delete"] }
 */
		transferId: string | Expression<string>;
};

export type WiseV1TransferExecuteConfig = {
	resource: 'transfer';
	operation: 'execute';
/**
 * ID of the user profile to execute the transfer under. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["transfer"], operation: ["execute"] }
 * @default []
 */
		profileId: string | Expression<string>;
/**
 * ID of the transfer to execute
 * @displayOptions.show { resource: ["transfer"], operation: ["execute"] }
 */
		transferId: string | Expression<string>;
};

export type WiseV1TransferGetConfig = {
	resource: 'transfer';
	operation: 'get';
/**
 * ID of the transfer to retrieve
 * @displayOptions.show { resource: ["transfer"], operation: ["get"] }
 */
		transferId: string | Expression<string>;
/**
 * Whether to download the transfer receipt as a PDF file. Only for executed transfers, having status 'Outgoing Payment Sent'.
 * @displayOptions.show { resource: ["transfer"], operation: ["get"] }
 * @default false
 */
		downloadReceipt: boolean | Expression<boolean>;
	binaryProperty: string | Expression<string>;
/**
 * Name of the file that will be downloaded
 * @displayOptions.show { resource: ["transfer"], operation: ["get"], downloadReceipt: [true] }
 */
		fileName: string | Expression<string>;
};

export type WiseV1TransferGetAllConfig = {
	resource: 'transfer';
	operation: 'getAll';
/**
 * ID of the user profile to retrieve. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["transfer"], operation: ["getAll"] }
 * @default []
 */
		profileId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["transfer"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["transfer"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type WiseV1AccountGetBalancesOutput = {
	active?: boolean;
	balances?: Array<{
		amount?: {
			currency?: string;
		};
		balanceType?: string;
		currency?: string;
		id?: number;
		reservedAmount?: {
			currency?: string;
		};
	}>;
	creationTime?: string;
	eligible?: boolean;
	id?: number;
	modificationTime?: string;
	profileId?: number;
	recipientId?: number;
};

export type WiseV1ExchangeRateGetOutput = {
	rate?: number;
	source?: string;
	target?: string;
	time?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface WiseV1Credentials {
	wiseApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface WiseV1NodeBase {
	type: 'n8n-nodes-base.wise';
	version: 1;
	credentials?: WiseV1Credentials;
}

export type WiseV1AccountGetBalancesNode = WiseV1NodeBase & {
	config: NodeConfig<WiseV1AccountGetBalancesConfig>;
	output?: WiseV1AccountGetBalancesOutput;
};

export type WiseV1AccountGetCurrenciesNode = WiseV1NodeBase & {
	config: NodeConfig<WiseV1AccountGetCurrenciesConfig>;
};

export type WiseV1AccountGetStatementNode = WiseV1NodeBase & {
	config: NodeConfig<WiseV1AccountGetStatementConfig>;
};

export type WiseV1ExchangeRateGetNode = WiseV1NodeBase & {
	config: NodeConfig<WiseV1ExchangeRateGetConfig>;
	output?: WiseV1ExchangeRateGetOutput;
};

export type WiseV1ProfileGetNode = WiseV1NodeBase & {
	config: NodeConfig<WiseV1ProfileGetConfig>;
};

export type WiseV1ProfileGetAllNode = WiseV1NodeBase & {
	config: NodeConfig<WiseV1ProfileGetAllConfig>;
};

export type WiseV1QuoteCreateNode = WiseV1NodeBase & {
	config: NodeConfig<WiseV1QuoteCreateConfig>;
};

export type WiseV1QuoteGetNode = WiseV1NodeBase & {
	config: NodeConfig<WiseV1QuoteGetConfig>;
};

export type WiseV1RecipientGetAllNode = WiseV1NodeBase & {
	config: NodeConfig<WiseV1RecipientGetAllConfig>;
};

export type WiseV1TransferCreateNode = WiseV1NodeBase & {
	config: NodeConfig<WiseV1TransferCreateConfig>;
};

export type WiseV1TransferDeleteNode = WiseV1NodeBase & {
	config: NodeConfig<WiseV1TransferDeleteConfig>;
};

export type WiseV1TransferExecuteNode = WiseV1NodeBase & {
	config: NodeConfig<WiseV1TransferExecuteConfig>;
};

export type WiseV1TransferGetNode = WiseV1NodeBase & {
	config: NodeConfig<WiseV1TransferGetConfig>;
};

export type WiseV1TransferGetAllNode = WiseV1NodeBase & {
	config: NodeConfig<WiseV1TransferGetAllConfig>;
};

export type WiseV1Node =
	| WiseV1AccountGetBalancesNode
	| WiseV1AccountGetCurrenciesNode
	| WiseV1AccountGetStatementNode
	| WiseV1ExchangeRateGetNode
	| WiseV1ProfileGetNode
	| WiseV1ProfileGetAllNode
	| WiseV1QuoteCreateNode
	| WiseV1QuoteGetNode
	| WiseV1RecipientGetAllNode
	| WiseV1TransferCreateNode
	| WiseV1TransferDeleteNode
	| WiseV1TransferExecuteNode
	| WiseV1TransferGetNode
	| WiseV1TransferGetAllNode
	;