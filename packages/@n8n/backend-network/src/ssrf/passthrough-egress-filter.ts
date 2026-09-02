import { createResultOk } from '@n8n/utils/result';
import type { NodeEgressFilter } from 'n8n-workflow';
import { lookup } from 'node:dns';
import type { LookupFunction } from 'node:net';

/**
 * Passthrough `NodeEgressFilter` used when no egress policy is configured.
 * `validateUrl` always resolves ok, and `createSecureLookup` returns the
 * plain system DNS lookup, so callers get an unfiltered transport without
 * having to special-case a missing filter.
 */
export const passthroughEgressFilter: NodeEgressFilter = {
	validateUrl: async () => await Promise.resolve(createResultOk(undefined)),
	// Same function reference every call, so callers can compare it by identity.
	createSecureLookup: (): LookupFunction => lookup,
};
