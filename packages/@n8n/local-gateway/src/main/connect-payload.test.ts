import {
	DEEP_LINK_PROTOCOL,
	deepLinkProtocolsInArgv,
	parseConnectPayload,
	parseConnectPayloadFromArgv,
} from './connect-payload';

describe('parseConnectPayload', () => {
	it('returns null for non-URL strings', () => {
		expect(parseConnectPayload('not a url')).toBeNull();
	});

	it('returns null for wrong protocol', () => {
		expect(parseConnectPayload('https://connect/?url=https://n.example')).toBeNull();
	});

	it('returns null when hostname is not connect', () => {
		expect(
			parseConnectPayload(`${DEEP_LINK_PROTOCOL}://other/?url=https://n.example&token=t`),
		).toBeNull();
	});

	it('returns null when url param is missing', () => {
		expect(parseConnectPayload(`${DEEP_LINK_PROTOCOL}://connect?token=abc`)).toBeNull();
	});

	it('returns null when token param is missing', () => {
		expect(parseConnectPayload(`${DEEP_LINK_PROTOCOL}://connect?url=https://n.example`)).toBeNull();
	});

	it('returns null when token param is empty or whitespace-only', () => {
		expect(
			parseConnectPayload(`${DEEP_LINK_PROTOCOL}://connect?url=https://n.example&token=%20%20`),
		).toBeNull();

		expect(
			parseConnectPayload(`${DEEP_LINK_PROTOCOL}://connect?url=https://n.example&token=+%09`),
		).toBeNull();
	});

	it('returns null when url param is not a valid absolute URL', () => {
		expect(parseConnectPayload(`${DEEP_LINK_PROTOCOL}://connect?url=not-a-url&token=t`)).toBeNull();
	});

	it('parses url and token', () => {
		expect(
			parseConnectPayload(`${DEEP_LINK_PROTOCOL}://connect?url=https://n.example&token=gw_abc`),
		).toEqual({
			url: 'https://n.example',
			apiKey: 'gw_abc',
		});
	});

	it('trims token with surrounding whitespace', () => {
		expect(
			parseConnectPayload(`${DEEP_LINK_PROTOCOL}://connect?url=https://n.example&token=%20gw_x%20`),
		).toEqual({
			url: 'https://n.example',
			apiKey: 'gw_x',
		});
	});
});

describe('parseConnectPayloadFromArgv', () => {
	it('returns null when no argv entry matches', () => {
		expect(parseConnectPayloadFromArgv(['--foo', 'bar'])).toBeNull();
	});

	it('returns first matching payload', () => {
		const good = `${DEEP_LINK_PROTOCOL}://connect?url=https://a.example&token=1`;
		const also = `${DEEP_LINK_PROTOCOL}://connect?url=https://b.example&token=2`;
		expect(parseConnectPayloadFromArgv(['--x', good, also])).toEqual({
			url: 'https://a.example',
			apiKey: '1',
		});
	});
});

describe('deepLinkProtocolsInArgv', () => {
	it('returns false when argv has no deep-link string', () => {
		expect(deepLinkProtocolsInArgv(['electron', '/app/main.js'])).toBe(false);
	});

	it('returns true when argv includes our scheme even if parse fails', () => {
		expect(
			deepLinkProtocolsInArgv([
				'electron',
				`${DEEP_LINK_PROTOCOL}://connect?url=https://x.example`,
			]),
		).toBe(true);
	});
});
