/**
 * Npm Node Types
 *
 * Consume NPM registry API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/npm/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Returns all the metadata for a package at a specific version */
export type NpmV1PackageGetMetadataConfig = {
	resource: 'package';
	operation: 'getMetadata';
	packageName: string | Expression<string>;
	packageVersion: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

/** Returns all the versions for a package */
export type NpmV1PackageGetVersionsConfig = {
	resource: 'package';
	operation: 'getVersions';
	packageName: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

/** Search for packages */
export type NpmV1PackageSearchConfig = {
	resource: 'package';
	operation: 'search';
	/**
	 * The query text used to search for packages
	 * @displayOptions.show { resource: ["package"], operation: ["search"] }
	 */
	query: string | Expression<string>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["package"], operation: ["search"] }
	 * @default 10
	 */
	limit?: number | Expression<number>;
	/**
	 * Offset to return results from
	 * @displayOptions.show { resource: ["package"], operation: ["search"] }
	 * @default 0
	 */
	offset?: number | Expression<number>;
	requestOptions?: Record<string, unknown>;
};

/** Returns all the dist-tags for a package */
export type NpmV1DistTagGetManyConfig = {
	resource: 'distTag';
	operation: 'getMany';
	packageName: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

/** Update a the dist-tags for a package */
export type NpmV1DistTagUpdateConfig = {
	resource: 'distTag';
	operation: 'update';
	packageName: string | Expression<string>;
	packageVersion: string | Expression<string>;
	distTagName: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type NpmV1Params =
	| NpmV1PackageGetMetadataConfig
	| NpmV1PackageGetVersionsConfig
	| NpmV1PackageSearchConfig
	| NpmV1DistTagGetManyConfig
	| NpmV1DistTagUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface NpmV1Credentials {
	npmApi?: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type NpmV1Node = {
	type: 'n8n-nodes-base.npm';
	version: 1;
	config: NodeConfig<NpmV1Params>;
	credentials?: NpmV1Credentials;
};

export type NpmNode = NpmV1Node;
