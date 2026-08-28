import {
	CLIENT_INFO_META_KEY,
	PROTOCOL_VERSION_META_KEY,
	UnsupportedProtocolVersionError,
} from '@modelcontextprotocol/server';

import { MCP_CLIENT_INFO_META_KEY, MCP_PROTOCOL_VERSION_META_KEY } from '../mcp.constants';

// The `_meta` envelope keys are mirrored locally so reading them off a request
// never eagerly loads the v2 SDK at boot (see mcp.constants.ts). These assertions
// pin the mirror to the SDK's exported constants so the two can't silently drift.
describe('MCP _meta key constants', () => {
	it('mirrors the SDK client-info key', () => {
		expect(MCP_CLIENT_INFO_META_KEY).toBe(CLIENT_INFO_META_KEY);
	});

	it('mirrors the SDK protocol-version key', () => {
		expect(MCP_PROTOCOL_VERSION_META_KEY).toBe(PROTOCOL_VERSION_META_KEY);
	});
});

// Version negotiation (server/discover, per-request version checks) is handled
// by the SDK handler. The 2026-07-28 revision renumbered the mismatch error to
// -32022; this pins the code the server returns so an SDK change can't silently
// break that compliance contract.
describe('protocol version mismatch error', () => {
	it('reports the renumbered -32022 code', () => {
		const error = new UnsupportedProtocolVersionError({
			supported: ['2026-07-28'],
			requested: '2020-01-01',
		});
		expect(error.code).toBe(-32022);
	});
});
