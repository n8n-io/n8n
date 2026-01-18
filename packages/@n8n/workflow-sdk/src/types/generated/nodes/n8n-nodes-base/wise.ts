/**
 * Wise Node Types
 *
 * Consume the Wise API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/wise/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Retrieve balances for all account currencies of this user */
export type WiseV1AccountGetBalancesConfig = {
	resource: 'account';
	operation: 'getBalances';
	/**
	 * ID of the user profile to retrieve the balance of. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
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
	 * @default []
	 */
	profileId?: string | Expression<string>;
	/**
	 * ID of the borderless account to retrieve the statement of. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	borderlessAccountId: string | Expression<string>;
	/**
	 * Code of the currency of the borderless account to retrieve the statement of
	 */
	currency?: string | Expression<string>;
	/**
	 * File format to retrieve the statement in
	 * @default json
	 */
	format?: 'json' | 'csv' | 'pdf' | 'xml' | Expression<string>;
	binaryProperty: string | Expression<string>;
	/**
	 * Name of the file that will be downloaded
	 */
	fileName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type WiseV1ExchangeRateGetConfig = {
	resource: 'exchangeRate';
	operation: 'get';
	/**
	 * Code of the source currency to retrieve the exchange rate for
	 */
	source?: string | Expression<string>;
	/**
	 * Code of the target currency to retrieve the exchange rate for
	 */
	target?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type WiseV1ProfileGetConfig = {
	resource: 'profile';
	operation: 'get';
	/**
	 * ID of the user profile to retrieve. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
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
	 * @default []
	 */
	profileId: string | Expression<string>;
	/**
	 * ID of the account that will receive the funds. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	targetAccountId: string | Expression<string>;
	/**
	 * Whether the amount is to be sent or received
	 * @default source
	 */
	amountType?: 'source' | 'target' | Expression<string>;
	/**
	 * Amount of funds for the quote to create
	 * @default 1
	 */
	amount?: number | Expression<number>;
	/**
	 * Code of the currency to send for the quote to create
	 */
	sourceCurrency?: string | Expression<string>;
	/**
	 * Code of the currency to receive for the quote to create
	 */
	targetCurrency?: string | Expression<string>;
};

export type WiseV1QuoteGetConfig = {
	resource: 'quote';
	operation: 'get';
	/**
	 * ID of the quote to retrieve
	 */
	quoteId: string | Expression<string>;
};

export type WiseV1RecipientGetAllConfig = {
	resource: 'recipient';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 5
	 */
	limit?: number | Expression<number>;
};

export type WiseV1TransferCreateConfig = {
	resource: 'transfer';
	operation: 'create';
	/**
	 * ID of the user profile to retrieve the balance of. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	profileId: string | Expression<string>;
	/**
	 * ID of the quote based on which to create the transfer
	 */
	quoteId: string | Expression<string>;
	/**
	 * ID of the account that will receive the funds. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
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
	 */
	transferId: string | Expression<string>;
};

export type WiseV1TransferExecuteConfig = {
	resource: 'transfer';
	operation: 'execute';
	/**
	 * ID of the user profile to execute the transfer under. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	profileId: string | Expression<string>;
	/**
	 * ID of the transfer to execute
	 */
	transferId: string | Expression<string>;
};

export type WiseV1TransferGetConfig = {
	resource: 'transfer';
	operation: 'get';
	/**
	 * ID of the transfer to retrieve
	 */
	transferId: string | Expression<string>;
	/**
	 * Whether to download the transfer receipt as a PDF file. Only for executed transfers, having status 'Outgoing Payment Sent'.
	 * @default false
	 */
	downloadReceipt: boolean | Expression<boolean>;
	binaryProperty: string | Expression<string>;
	/**
	 * Name of the file that will be downloaded
	 */
	fileName: string | Expression<string>;
};

export type WiseV1TransferGetAllConfig = {
	resource: 'transfer';
	operation: 'getAll';
	/**
	 * ID of the user profile to retrieve. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	profileId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 5
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type WiseV1Params =
	| WiseV1AccountGetBalancesConfig
	| WiseV1AccountGetCurrenciesConfig
	| WiseV1AccountGetStatementConfig
	| WiseV1ExchangeRateGetConfig
	| WiseV1ProfileGetConfig
	| WiseV1ProfileGetAllConfig
	| WiseV1QuoteCreateConfig
	| WiseV1QuoteGetConfig
	| WiseV1RecipientGetAllConfig
	| WiseV1TransferCreateConfig
	| WiseV1TransferDeleteConfig
	| WiseV1TransferExecuteConfig
	| WiseV1TransferGetConfig
	| WiseV1TransferGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface WiseV1Credentials {
	wiseApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type WiseNode = {
	type: 'n8n-nodes-base.wise';
	version: 1;
	config: NodeConfig<WiseV1Params>;
	credentials?: WiseV1Credentials;
};
