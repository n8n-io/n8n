import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions, INodeProperties } from 'n8n-workflow';
/** The v2 list endpoints' documented max page size, and the max IDs per batched `/pages` request */
export declare const PAGE_LIMIT = 250;
/**
 * Top-level site selector carried by every operation (each resource spreads it
 * right after its Operation field). The stored From List value is the cloudId
 * itself — accessible-resources returns it, so list mode needs no resolution;
 * By URL is hostname-matched against the connection's sites at execute time.
 * Left empty, single-site connections auto-resolve at runtime.
 */
export declare const siteRLC: INodeProperties;
/**
 * Shared page-selection fields: operations spread `spaceRLC`/`pageRLC`/
 * `bodyFormatOption`, add their own displayOptions, and resolve the selection
 * with `resolvePageId`. An empty space leaves page lookups site-wide.
 */
export declare const pageRLC: INodeProperties;
export declare const labelRLC: INodeProperties;
export type ConfluenceBodyFormat = 'storage' | 'atlas_doc_format' | 'plainText';
export declare const bodyFormatOption: INodeProperties;
export declare const spaceRLC: INodeProperties;
export declare const spaceOptionsCollection: INodeProperties;
/** Companion to an endpoint-specific Sort By option; composed into `sort` by `sortQs`. */
export declare const sortDirectionOption: INodeProperties;
/** Builds the v2 `sort` query fragment from an operation's Sort By / Sort Direction
 * options. The API takes one enum encoding both field and direction, e.g. `name` / `-name`. */
export declare function sortQs(options: IDataObject): IDataObject;
/** Builds the `description-format` query fragment from an operation's Options collection. */
export declare function spaceDescriptionFormatQs(options: IDataObject): IDataObject;
/** `spaceRLC` for operations where the space is optional: the list gets an
 * "All Spaces" reset entry and By ID accepts an empty value. */
export declare const optionalSpaceRLC: INodeProperties;
export declare function clearSpaceKeyCache(): void;
export declare function resolveSpaceKey(this: IExecuteFunctions | ILoadOptionsFunctions, spaceId: string): Promise<string | undefined>;
/** Replaces a page's ADF body with plain text extracted from it. No server-side
 * plain-text format exists, so callers request `atlas_doc_format` and shape here. */
export declare function shapeBody(page: IDataObject, bodyFormat: ConfluenceBodyFormat): IDataObject;
export type NextPageParam = {
    key: 'cursor' | 'start';
    value: string;
};
export declare function extractNextPageParam(response: IDataObject): NextPageParam | undefined;
export declare function extractNextCursor(response: IDataObject): string | undefined;
/** `extractNextCursor` with a repeat guard: a cursor seen before ends the
 * pagination instead of looping forever on a server that echoes it back. */
export declare function nextUnseenCursor(response: IDataObject, seen: Set<string>): string | undefined;
/** Validates a count parameter that an expression may hand back as a numeric string. */
export declare function parsePositiveInt(this: IExecuteFunctions, raw: unknown, label: string, itemIndex: number): number;
/** Accumulates `results` across v2 cursor pages until `max` records are collected
 * (pass Infinity for Return All) or the server stops yielding new cursors. It
 * deliberately keeps going past an empty page that still carries `_links.next`
 * (observed from Atlassian; see methods/listSearch.ts) and breaks on any repeated
 * cursor, which would otherwise loop forever when `max` is Infinity. */
export declare function fetchPaginatedResults(this: IExecuteFunctions, endpoint: string, max: number, qs?: IDataObject): Promise<IDataObject[]>;
/** Resolves the shared Page parameter to a page ID, whatever the selected mode. */
export declare function resolvePageId(this: IExecuteFunctions, itemIndex: number): Promise<string>;
//# sourceMappingURL=common.d.ts.map