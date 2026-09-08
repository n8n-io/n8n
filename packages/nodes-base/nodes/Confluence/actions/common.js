import { jsonParse, NodeOperationError } from 'n8n-workflow';
import { confluenceApiRequest, getConfluenceCloudId, getConfluenceCredentialName, } from '../transport';
/** The v2 list endpoints' documented max page size, and the max IDs per batched `/pages` request */
export const PAGE_LIMIT = 250;
/**
 * Top-level site selector carried by every operation (each resource spreads it
 * right after its Operation field). The stored From List value is the cloudId
 * itself — accessible-resources returns it, so list mode needs no resolution;
 * By URL is hostname-matched against the connection's sites at execute time.
 * Left empty, single-site connections auto-resolve at runtime.
 */
export const siteRLC = {
    displayName: 'Site',
    name: 'site',
    type: 'resourceLocator',
    default: { mode: 'list', value: '' },
    description: 'The Confluence site to use. Can be left empty when the connection has access to exactly one site.',
    modes: [
        {
            displayName: 'From List',
            name: 'list',
            type: 'list',
            typeOptions: {
                searchListMethod: 'getSites',
                searchable: true,
            },
        },
        {
            displayName: 'By URL',
            name: 'url',
            type: 'string',
            placeholder: 'e.g. https://your-site.atlassian.net',
        },
    ],
};
/**
 * Shared page-selection fields: operations spread `spaceRLC`/`pageRLC`/
 * `bodyFormatOption`, add their own displayOptions, and resolve the selection
 * with `resolvePageId`. An empty space leaves page lookups site-wide.
 */
export const pageRLC = {
    displayName: 'Page',
    name: 'page',
    type: 'resourceLocator',
    default: { mode: 'list', value: '' },
    required: true,
    description: 'The page to operate on',
    typeOptions: {
        loadOptionsDependsOn: ['site.value', 'space.value'],
    },
    modes: [
        {
            displayName: 'From List',
            name: 'list',
            type: 'list',
            typeOptions: {
                searchListMethod: 'getPages',
                searchable: true,
            },
        },
        {
            displayName: 'By URL',
            name: 'url',
            type: 'string',
            placeholder: 'e.g. https://your-site.atlassian.net/wiki/spaces/DOCS/pages/123456/My+Page',
            validation: [
                {
                    type: 'regex',
                    properties: {
                        regex: '.*/pages/(?:edit-v2/)?[0-9]+.*',
                        errorMessage: 'The URL must contain /pages/<numeric page ID>',
                    },
                },
            ],
            extractValue: {
                type: 'regex',
                regex: '/pages/(?:edit-v2/)?([0-9]+)',
            },
        },
        {
            displayName: 'By ID',
            name: 'id',
            type: 'string',
            placeholder: 'e.g. 123456',
            validation: [
                {
                    type: 'regex',
                    properties: {
                        regex: '^[0-9]+$',
                        errorMessage: 'The page ID must be numeric',
                    },
                },
            ],
        },
        {
            displayName: 'By Title',
            name: 'title',
            type: 'string',
            placeholder: 'e.g. Project plan',
        },
    ],
};
export const labelRLC = {
    displayName: 'Label',
    name: 'label',
    type: 'resourceLocator',
    default: { mode: 'list', value: '' },
    required: true,
    description: 'The label to operate on',
    typeOptions: {
        loadOptionsDependsOn: ['site.value'],
    },
    modes: [
        {
            displayName: 'From List',
            name: 'list',
            type: 'list',
            typeOptions: {
                searchListMethod: 'getLabels',
                searchable: true,
            },
        },
        {
            displayName: 'By ID',
            name: 'id',
            type: 'string',
            placeholder: 'e.g. 123456',
            validation: [
                {
                    type: 'regex',
                    properties: {
                        regex: '^[0-9]+$',
                        errorMessage: 'The label ID must be numeric',
                    },
                },
            ],
        },
    ],
};
export const bodyFormatOption = {
    displayName: 'Body Format',
    name: 'bodyFormat',
    type: 'options',
    options: [
        {
            name: 'Atlas Doc Format',
            value: 'atlas_doc_format',
            description: 'The ADF JSON representation',
        },
        {
            name: 'Plain Text',
            value: 'plainText',
            description: 'Text extracted from the ADF body (dynamic macros carry no text)',
        },
        {
            name: 'Storage',
            value: 'storage',
            description: 'The raw storage-format XHTML',
        },
    ],
    default: 'storage',
};
export const spaceRLC = {
    displayName: 'Space',
    name: 'space',
    type: 'resourceLocator',
    default: { mode: 'list', value: '' },
    description: 'The Confluence space',
    typeOptions: {
        loadOptionsDependsOn: ['site.value'],
    },
    modes: [
        {
            displayName: 'From List',
            name: 'list',
            type: 'list',
            typeOptions: {
                searchListMethod: 'searchSpaces',
                searchable: true,
            },
        },
        {
            displayName: 'By ID',
            name: 'id',
            type: 'string',
            placeholder: 'e.g. 98432',
            validation: [
                {
                    type: 'regex',
                    properties: {
                        regex: '^[0-9]+$',
                        errorMessage: 'The space ID must be numeric',
                    },
                },
            ],
        },
    ],
};
export const spaceOptionsCollection = {
    displayName: 'Options',
    name: 'options',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    options: [
        {
            displayName: 'Description Format',
            name: 'descriptionFormat',
            type: 'options',
            options: [
                {
                    name: 'Plain',
                    value: 'plain',
                    description: 'The space description as plain text',
                },
                {
                    name: 'View',
                    value: 'view',
                    description: 'The space description in view (HTML) format',
                },
            ],
            default: 'plain',
            // The API only populates `description` when `description-format` is sent
            description: 'The format in which to return the space description. Without this option the description is not returned.',
        },
    ],
};
/** Companion to an endpoint-specific Sort By option; composed into `sort` by `sortQs`. */
export const sortDirectionOption = {
    displayName: 'Sort Direction',
    name: 'sortDirection',
    type: 'options',
    default: 'asc',
    description: 'The direction to order in. Only applies when Sort By is set.',
    options: [
        { name: 'ASC', value: 'asc' },
        { name: 'DESC', value: 'desc' },
    ],
};
/** Builds the v2 `sort` query fragment from an operation's Sort By / Sort Direction
 * options. The API takes one enum encoding both field and direction, e.g. `name` / `-name`. */
export function sortQs(options) {
    if (typeof options.sortBy !== 'string' || options.sortBy === '')
        return {};
    return { sort: options.sortDirection === 'desc' ? `-${options.sortBy}` : options.sortBy };
}
/** Builds the `description-format` query fragment from an operation's Options collection. */
export function spaceDescriptionFormatQs(options) {
    return typeof options.descriptionFormat === 'string' && options.descriptionFormat !== ''
        ? { 'description-format': options.descriptionFormat }
        : {};
}
/** `spaceRLC` for operations where the space is optional: the list gets an
 * "All Spaces" reset entry and By ID accepts an empty value. */
export const optionalSpaceRLC = {
    ...spaceRLC,
    description: 'Limits page selection and By Title lookups to one space. Leave empty or pick "All Spaces" to search across all spaces.',
    modes: (spaceRLC.modes ?? []).map((mode) => {
        if (mode.name === 'list') {
            return {
                ...mode,
                typeOptions: { ...mode.typeOptions, searchListMethod: 'searchSpacesWithAll' },
            };
        }
        if (mode.name === 'id') {
            return {
                ...mode,
                validation: [
                    {
                        type: 'regex',
                        properties: {
                            regex: '^[0-9]*$',
                            errorMessage: 'The space ID must be numeric (leave empty for all spaces)',
                        },
                    },
                ],
            };
        }
        return mode;
    }),
};
const spaceKeyCache = new Map();
export function clearSpaceKeyCache() {
    spaceKeyCache.clear();
}
export async function resolveSpaceKey(spaceId) {
    // Space IDs are only unique per site, and one credential can reach several
    const rawCredentialId = this.getNode().credentials?.[getConfluenceCredentialName(this)]?.id;
    const credentialId = typeof rawCredentialId === 'string' ? rawCredentialId : '';
    const cloudId = await getConfluenceCloudId.call(this);
    const cacheKey = `${credentialId}:${cloudId}:${spaceId}`;
    const cached = spaceKeyCache.get(cacheKey);
    if (cached !== undefined)
        return cached;
    const space = await confluenceApiRequest.call(this, 'GET', `/wiki/api/v2/spaces/${encodeURIComponent(spaceId)}`);
    if (typeof space.key !== 'string' || space.key === '')
        return undefined;
    spaceKeyCache.set(cacheKey, space.key);
    return space.key;
}
// Text extraction, not rendering: concatenate ADF text nodes, newline at block boundaries
const ADF_BLOCK_TYPES = new Set([
    'blockquote',
    'bulletList',
    'codeBlock',
    'heading',
    'listItem',
    'orderedList',
    'panel',
    'paragraph',
    'rule',
    'table',
    'tableRow',
    'taskItem',
    'taskList',
]);
// Inline leaves whose rendered text lives in `attrs.text` instead of a text node
const ADF_ATTRS_TEXT_TYPES = new Set(['mention', 'emoji', 'status']);
function adfToPlainText(node) {
    if (node.type === 'text')
        return typeof node.text === 'string' ? node.text : '';
    if (node.type === 'hardBreak')
        return '\n';
    if (ADF_ATTRS_TEXT_TYPES.has(node.type)) {
        const text = node.attrs?.text;
        return typeof text === 'string' ? text : '';
    }
    const content = Array.isArray(node.content) ? node.content : [];
    let inner = '';
    for (const child of content) {
        inner += adfToPlainText(child);
        if (node.type === 'tableRow')
            inner += ' ';
    }
    return ADF_BLOCK_TYPES.has(node.type) ? `${inner}\n` : inner;
}
/** Replaces a page's ADF body with plain text extracted from it. No server-side
 * plain-text format exists, so callers request `atlas_doc_format` and shape here. */
export function shapeBody(page, bodyFormat) {
    if (bodyFormat !== 'plainText')
        return page;
    const adf = page.body?.atlas_doc_format;
    let value = '';
    if (typeof adf?.value === 'string' && adf.value !== '') {
        const doc = jsonParse(adf.value, { fallbackValue: null }) ?? {};
        // The walk can still throw on valid-JSON shapes it can't take (e.g. null nodes);
        // a page with an unreadable body should yield an empty value, not fail the item
        try {
            value = adfToPlainText(doc)
                .replace(/[ \t]+\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
        }
        catch {
            value = '';
        }
    }
    return { ...page, body: { plainText: { representation: 'plain_text', value } } };
}
export function extractNextPageParam(response) {
    const next = response._links?.next;
    if (typeof next !== 'string' || next === '')
        return undefined;
    let params;
    try {
        params = new URL(next, 'https://api.atlassian.com').searchParams;
    }
    catch {
        return undefined;
    }
    const cursor = params.get('cursor');
    if (cursor !== null && cursor !== '')
        return { key: 'cursor', value: cursor };
    // Older responses page by start offset instead of cursor
    const start = params.get('start');
    return start === null || start === '' ? undefined : { key: 'start', value: start };
}
export function extractNextCursor(response) {
    const next = extractNextPageParam(response);
    return next?.key === 'cursor' ? next.value : undefined;
}
/** `extractNextCursor` with a repeat guard: a cursor seen before ends the
 * pagination instead of looping forever on a server that echoes it back. */
export function nextUnseenCursor(response, seen) {
    const cursor = extractNextCursor(response);
    if (cursor === undefined || seen.has(cursor))
        return undefined;
    seen.add(cursor);
    return cursor;
}
/** Validates a count parameter that an expression may hand back as a numeric string. */
export function parsePositiveInt(raw, label, itemIndex) {
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 1) {
        throw new NodeOperationError(this.getNode(), `${label} must be a finite number of at least 1`, {
            itemIndex,
        });
    }
    return Math.floor(value);
}
/** Accumulates `results` across v2 cursor pages until `max` records are collected
 * (pass Infinity for Return All) or the server stops yielding new cursors. It
 * deliberately keeps going past an empty page that still carries `_links.next`
 * (observed from Atlassian; see methods/listSearch.ts) and breaks on any repeated
 * cursor, which would otherwise loop forever when `max` is Infinity. */
export async function fetchPaginatedResults(endpoint, max, qs = {}) {
    const records = [];
    const seenCursors = new Set();
    let cursor;
    do {
        const pageQs = { ...qs, limit: Math.min(max - records.length, PAGE_LIMIT) };
        if (cursor !== undefined)
            pageQs.cursor = cursor;
        const response = await confluenceApiRequest.call(this, 'GET', endpoint, {}, pageQs);
        const results = Array.isArray(response.results) ? response.results : [];
        records.push.apply(records, results);
        cursor = nextUnseenCursor(response, seenCursors);
    } while (cursor !== undefined && records.length < max);
    return records.length > max ? records.slice(0, max) : records;
}
function asString(value) {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}
async function resolvePageIdByTitle(itemIndex, title, spaceId, spaceLabel) {
    const qs = { title, limit: PAGE_LIMIT };
    if (spaceId !== '')
        qs['space-id'] = spaceId;
    const response = await confluenceApiRequest.call(this, 'GET', '/wiki/api/v2/pages', {}, qs);
    const results = Array.isArray(response.results) ? response.results : [];
    if (results.length === 0) {
        throw new NodeOperationError(this.getNode(), `No page titled "${title}" found${spaceId === '' ? '' : ` in space "${spaceLabel}"`}`, { itemIndex });
    }
    if (results.length > 1) {
        const candidates = results
            .slice(0, 5)
            .map((page) => `"${asString(page.title)}" (space ${asString(page.spaceId)}, ID ${asString(page.id)})`)
            .join(', ');
        throw new NodeOperationError(this.getNode(), `Found ${results.length} pages titled "${title}": ${candidates}${results.length > 5 ? ', …' : ''}. Scope the lookup with the Space field, or use the page ID.`, { itemIndex });
    }
    return asString(results[0].id);
}
/** Resolves the shared Page parameter to a page ID, whatever the selected mode. */
export async function resolvePageId(itemIndex) {
    const pageRef = this.getNodeParameter('page', itemIndex);
    if (pageRef.mode === 'title') {
        const title = String(pageRef.value ?? '').trim();
        if (title === '') {
            throw new NodeOperationError(this.getNode(), 'The page title must not be empty', {
                itemIndex,
            });
        }
        const spaceRef = this.getNodeParameter('space', itemIndex, null);
        const spaceId = spaceRef ? String(spaceRef.value ?? '').trim() : '';
        const spaceLabel = typeof spaceRef?.cachedResultName === 'string' && spaceRef.cachedResultName !== ''
            ? spaceRef.cachedResultName
            : spaceId;
        return await resolvePageIdByTitle.call(this, itemIndex, title, spaceId, spaceLabel);
    }
    // From List / By ID pass the value through; By URL extracts the ID via the mode's regex
    const pageId = String(this.getNodeParameter('page', itemIndex, '', { extractValue: true })).trim();
    if (pageId === '') {
        throw new NodeOperationError(this.getNode(), "The 'Page' parameter is empty", { itemIndex });
    }
    return pageId;
}
//# sourceMappingURL=common.js.map