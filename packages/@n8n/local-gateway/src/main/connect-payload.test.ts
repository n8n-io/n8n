import {
	DEEP_LINK_PROTOCOL,
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

	it('returns null when url param is not a valid absolute URL', () => {
		expect(parseConnectPayload(`${DEEP_LINK_PROTOCOL}://connect?url=not-a-url&token=t`)).toBeNull();
	});

	it('parses url and optional token', () => {
		expect(
			parseConnectPayload(`${DEEP_LINK_PROTOCOL}://connect?url=https://n.example&token=gw_abc`),
		).toEqual({
			url: 'https://n.example',
			apiKey: 'gw_abc',
		});
	});

	it('trims token and treats whitespace-only token as absent', () => {
		expect(
			parseConnectPayload(`${DEEP_LINK_PROTOCOL}://connect?url=https://n.example&token=%20%20`),
		).toEqual({
			url: 'https://n.example',
			apiKey: undefined,
		});

		expect(
			parseConnectPayload(`${DEEP_LINK_PROTOCOL}://connect?url=https://n.example&token=+%09`),
		).toEqual({
			url: 'https://n.example',
			apiKey: undefined,
		});
	});

	it('parses token with surrounding whitespace', () => {
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
