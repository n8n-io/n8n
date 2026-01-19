/**
 * Unleashed Software Node - Version 1
 * Consume Unleashed Software API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many sales orders */
export type UnleashedSoftwareV1SalesOrderGetAllConfig = {
	resource: 'salesOrder';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["salesOrder"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["salesOrder"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Get a stock on hand */
export type UnleashedSoftwareV1StockOnHandGetConfig = {
	resource: 'stockOnHand';
	operation: 'get';
	productId?: string | Expression<string>;
};

/** Get many sales orders */
export type UnleashedSoftwareV1StockOnHandGetAllConfig = {
	resource: 'stockOnHand';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["stockOnHand"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["stockOnHand"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

export type UnleashedSoftwareV1Params =
	| UnleashedSoftwareV1SalesOrderGetAllConfig
	| UnleashedSoftwareV1StockOnHandGetConfig
	| UnleashedSoftwareV1StockOnHandGetAllConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type UnleashedSoftwareV1SalesOrderGetAllOutput = {
	AllocateProduct?: boolean;
	CreatedBy?: string;
	CreatedOn?: string;
	Currency?: {
		CurrencyCode?: string;
		DefaultBuyRate?: null;
		DefaultSellRate?: null;
		Description?: string;
		Guid?: string;
		LastModifiedOn?: string;
	};
	Customer?: {
		CurrencyId?: number;
		CustomerCode?: string;
		CustomerName?: string;
		Guid?: string;
		LastModifiedOn?: string;
	};
	Guid?: string;
	LastModifiedBy?: string;
	LastModifiedOn?: string;
	OrderDate?: string;
	OrderNumber?: string;
	OrderStatus?: string;
	ReceivedDate?: null;
	SalesAccount?: null;
	SalesOrderLines?: Array<{
		BatchNumbers?: null;
		DueDate?: string;
		Guid?: string;
		LastModifiedOn?: string;
		LineNumber?: number;
		OrderQuantity?: number;
		Product?: {
			Guid?: string;
			ProductDescription?: string;
		};
		SerialNumbers?: null;
		XeroTaxCode?: string;
	}>;
	SalesPerson?: {
		Email?: string;
		FullName?: string;
		Guid?: string;
		LastModifiedOn?: string;
		Obsolete?: boolean;
	};
	SaveAddress?: boolean;
	SendAccountingJournalOnly?: boolean;
	SourceId?: null;
	Tax?: {
		CanApplyToExpenses?: boolean;
		CanApplyToRevenue?: boolean;
		Description?: string;
		Guid?: string;
		LastModifiedOn?: string;
		Obsolete?: boolean;
		TaxCode?: string;
	};
	Warehouse?: {
		FaxNumber?: null;
		Guid?: string;
		IsDefault?: boolean;
		LastModifiedOn?: string;
		Obsolete?: boolean;
		WarehouseCode?: string;
		WarehouseName?: string;
	};
	XeroTaxCode?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface UnleashedSoftwareV1Credentials {
	unleashedSoftwareApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface UnleashedSoftwareV1NodeBase {
	type: 'n8n-nodes-base.unleashedSoftware';
	version: 1;
	credentials?: UnleashedSoftwareV1Credentials;
}

export type UnleashedSoftwareV1SalesOrderGetAllNode = UnleashedSoftwareV1NodeBase & {
	config: NodeConfig<UnleashedSoftwareV1SalesOrderGetAllConfig>;
	output?: UnleashedSoftwareV1SalesOrderGetAllOutput;
};

export type UnleashedSoftwareV1StockOnHandGetNode = UnleashedSoftwareV1NodeBase & {
	config: NodeConfig<UnleashedSoftwareV1StockOnHandGetConfig>;
};

export type UnleashedSoftwareV1StockOnHandGetAllNode = UnleashedSoftwareV1NodeBase & {
	config: NodeConfig<UnleashedSoftwareV1StockOnHandGetAllConfig>;
};

export type UnleashedSoftwareV1Node =
	| UnleashedSoftwareV1SalesOrderGetAllNode
	| UnleashedSoftwareV1StockOnHandGetNode
	| UnleashedSoftwareV1StockOnHandGetAllNode
	;