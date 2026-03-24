/* eslint-disable @typescript-eslint/no-unsafe-return */
import { createStateTools } from './state';
import { createMockConnection, findTool, structuredOf, TOOL_CONTEXT } from './test-helpers';

describe('createStateTools', () => {
	let mockConnection: ReturnType<typeof createMockConnection>;
	let tools: ReturnType<typeof createStateTools>;

	beforeEach(() => {
		mockConnection = createMockConnection();
		tools = createStateTools(mockConnection.connection);
	});

	// -----------------------------------------------------------------------
	// browser_cookies
	// -----------------------------------------------------------------------

	describe('browser_cookies', () => {
		const getTool = () => findTool(tools, 'browser_cookies');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_cookies');
			});

			it('has a non-empty description', () => {
				expect(getTool().description.length).toBeGreaterThan(0);
			});
		});

		describe('inputSchema validation', () => {
			it('accepts action get', () => {
				expect(() => getTool().inputSchema.parse({ action: 'get' })).not.toThrow();
			});

			it('accepts action get with url filter', () => {
				expect(() =>
					getTool().inputSchema.parse({ action: 'get', url: 'http://example.com' }),
				).not.toThrow();
			});

			it('accepts action set with cookies', () => {
				expect(() =>
					getTool().inputSchema.parse({
						action: 'set',
						cookies: [{ name: 'session', value: 'abc' }],
					}),
				).not.toThrow();
			});

			it('accepts action set with full cookie fields', () => {
				expect(() =>
					getTool().inputSchema.parse({
						action: 'set',
						cookies: [
							{
								name: 'session',
								value: 'abc',
								domain: '.example.com',
								path: '/',
								httpOnly: true,
								secure: true,
								sameSite: 'Strict',
							},
						],
					}),
				).not.toThrow();
			});

			it('accepts action clear', () => {
				expect(() => getTool().inputSchema.parse({ action: 'clear' })).not.toThrow();
			});

			it('rejects invalid action', () => {
				expect(() => getTool().inputSchema.parse({ action: 'delete' })).toThrow();
			});

			it('rejects set without cookies', () => {
				expect(() => getTool().inputSchema.parse({ action: 'set' })).toThrow();
			});

			it('rejects invalid sameSite', () => {
				expect(() =>
					getTool().inputSchema.parse({
						action: 'set',
						cookies: [{ name: 'a', value: 'b', sameSite: 'Invalid' }],
					}),
				).toThrow();
			});
		});

		describe('execute', () => {
			it('gets cookies', async () => {
				mockConnection.adapter.getCookies.mockResolvedValue([{ name: 'session', value: 'abc' }]);

				const result = await getTool().execute({ action: 'get' }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.getCookies).toHaveBeenCalledWith('page1', undefined);
				expect(data.cookies).toEqual([{ name: 'session', value: 'abc' }]);
			});

			it('gets cookies with url filter', async () => {
				await getTool().execute({ action: 'get', url: 'http://example.com' }, TOOL_CONTEXT);

				expect(mockConnection.adapter.getCookies).toHaveBeenCalledWith(
					'page1',
					'http://example.com',
				);
			});

			it('sets cookies', async () => {
				const cookies = [{ name: 'session', value: 'xyz' }];
				const result = await getTool().execute({ action: 'set', cookies }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.setCookies).toHaveBeenCalledWith('page1', cookies);
				expect(data.set).toBe(true);
				expect(data.count).toBe(1);
			});

			it('clears cookies', async () => {
				const result = await getTool().execute({ action: 'clear' }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.clearCookies).toHaveBeenCalledWith('page1');
				expect(data.cleared).toBe(true);
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_storage
	// -----------------------------------------------------------------------

	describe('browser_storage', () => {
		const getTool = () => findTool(tools, 'browser_storage');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_storage');
			});
		});

		describe('inputSchema validation', () => {
			it('accepts get with local kind', () => {
				expect(() => getTool().inputSchema.parse({ kind: 'local', action: 'get' })).not.toThrow();
			});

			it('accepts get with session kind', () => {
				expect(() => getTool().inputSchema.parse({ kind: 'session', action: 'get' })).not.toThrow();
			});

			it('accepts set with data', () => {
				expect(() =>
					getTool().inputSchema.parse({
						kind: 'local',
						action: 'set',
						data: { key: 'value' },
					}),
				).not.toThrow();
			});

			it('accepts clear', () => {
				expect(() =>
					getTool().inputSchema.parse({ kind: 'session', action: 'clear' }),
				).not.toThrow();
			});

			it('rejects invalid kind', () => {
				expect(() => getTool().inputSchema.parse({ kind: 'cookie', action: 'get' })).toThrow();
			});

			it('rejects set without data', () => {
				expect(() => getTool().inputSchema.parse({ kind: 'local', action: 'set' })).toThrow();
			});
		});

		describe('execute', () => {
			it('gets local storage', async () => {
				mockConnection.adapter.getStorage.mockResolvedValue({ theme: 'dark' });

				const result = await getTool().execute({ kind: 'local', action: 'get' }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.getStorage).toHaveBeenCalledWith('page1', 'local');
				expect(data.data).toEqual({ theme: 'dark' });
			});

			it('sets session storage', async () => {
				const result = await getTool().execute(
					{ kind: 'session', action: 'set', data: { token: 'abc' } },
					TOOL_CONTEXT,
				);
				const data = structuredOf(result);

				expect(mockConnection.adapter.setStorage).toHaveBeenCalledWith('page1', 'session', {
					token: 'abc',
				});
				expect(data.set).toBe(true);
			});

			it('clears storage', async () => {
				const result = await getTool().execute({ kind: 'local', action: 'clear' }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.clearStorage).toHaveBeenCalledWith('page1', 'local');
				expect(data.cleared).toBe(true);
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_set_offline
	// -----------------------------------------------------------------------

	describe('browser_set_offline', () => {
		const getTool = () => findTool(tools, 'browser_set_offline');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_set_offline');
			});
		});

		describe('inputSchema validation', () => {
			it('requires offline boolean', () => {
				expect(() => getTool().inputSchema.parse({ offline: true })).not.toThrow();
			});

			it('rejects missing offline', () => {
				expect(() => getTool().inputSchema.parse({})).toThrow();
			});

			it('rejects non-boolean', () => {
				expect(() => getTool().inputSchema.parse({ offline: 'yes' })).toThrow();
			});
		});

		describe('execute', () => {
			it('sets offline mode', async () => {
				const result = await getTool().execute({ offline: true }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.setOffline).toHaveBeenCalledWith('page1', true);
				expect(data.offline).toBe(true);
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_set_headers
	// -----------------------------------------------------------------------

	describe('browser_set_headers', () => {
		const getTool = () => findTool(tools, 'browser_set_headers');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_set_headers');
			});
		});

		describe('inputSchema validation', () => {
			it('requires headers', () => {
				expect(() =>
					getTool().inputSchema.parse({ headers: { authorization: 'Bearer token' } }),
				).not.toThrow();
			});

			it('rejects missing headers', () => {
				expect(() => getTool().inputSchema.parse({})).toThrow();
			});
		});

		describe('execute', () => {
			it('sets headers', async () => {
				const headers = { custom_header: 'value' };
				const result = await getTool().execute({ headers }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.setHeaders).toHaveBeenCalledWith('page1', headers);
				expect(data.headers).toEqual(headers);
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_set_geolocation
	// -----------------------------------------------------------------------

	describe('browser_set_geolocation', () => {
		const getTool = () => findTool(tools, 'browser_set_geolocation');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_set_geolocation');
			});
		});

		describe('inputSchema validation', () => {
			it('accepts set action with coordinates', () => {
				expect(() =>
					getTool().inputSchema.parse({ action: 'set', latitude: 40.7, longitude: -74.0 }),
				).not.toThrow();
			});

			it('accepts set with accuracy', () => {
				expect(() =>
					getTool().inputSchema.parse({ action: 'set', latitude: 0, longitude: 0, accuracy: 100 }),
				).not.toThrow();
			});

			it('accepts clear action', () => {
				expect(() => getTool().inputSchema.parse({ action: 'clear' })).not.toThrow();
			});

			it('rejects set without latitude', () => {
				expect(() => getTool().inputSchema.parse({ action: 'set', longitude: -74.0 })).toThrow();
			});

			it('rejects set without longitude', () => {
				expect(() => getTool().inputSchema.parse({ action: 'set', latitude: 40.7 })).toThrow();
			});
		});

		describe('execute', () => {
			it('sets geolocation', async () => {
				const result = await getTool().execute(
					{ action: 'set', latitude: 40.7, longitude: -74.0, accuracy: 10 },
					TOOL_CONTEXT,
				);
				const data = structuredOf(result);

				expect(mockConnection.adapter.setGeolocation).toHaveBeenCalledWith('page1', {
					latitude: 40.7,
					longitude: -74.0,
					accuracy: 10,
				});
				expect(data.geolocation).toEqual({ latitude: 40.7, longitude: -74.0, accuracy: 10 });
			});

			it('clears geolocation', async () => {
				const result = await getTool().execute({ action: 'clear' }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.setGeolocation).toHaveBeenCalledWith('page1', null);
				expect(data.geolocation).toBeNull();
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_set_timezone
	// -----------------------------------------------------------------------

	describe('browser_set_timezone', () => {
		const getTool = () => findTool(tools, 'browser_set_timezone');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_set_timezone');
			});
		});

		describe('inputSchema validation', () => {
			it('requires timezone string', () => {
				expect(() => getTool().inputSchema.parse({ timezone: 'America/New_York' })).not.toThrow();
			});

			it('rejects missing timezone', () => {
				expect(() => getTool().inputSchema.parse({})).toThrow();
			});
		});

		describe('execute', () => {
			it('sets timezone', async () => {
				const result = await getTool().execute({ timezone: 'Europe/Berlin' }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.setTimezone).toHaveBeenCalledWith('page1', 'Europe/Berlin');
				expect(data.timezone).toBe('Europe/Berlin');
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_set_locale
	// -----------------------------------------------------------------------

	describe('browser_set_locale', () => {
		const getTool = () => findTool(tools, 'browser_set_locale');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_set_locale');
			});
		});

		describe('inputSchema validation', () => {
			it('requires locale string', () => {
				expect(() => getTool().inputSchema.parse({ locale: 'en-US' })).not.toThrow();
			});

			it('rejects missing locale', () => {
				expect(() => getTool().inputSchema.parse({})).toThrow();
			});
		});

		describe('execute', () => {
			it('sets locale', async () => {
				const result = await getTool().execute({ locale: 'de-DE' }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.setLocale).toHaveBeenCalledWith('page1', 'de-DE');
				expect(data.locale).toBe('de-DE');
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_set_device
	// -----------------------------------------------------------------------

	describe('browser_set_device', () => {
		const getTool = () => findTool(tools, 'browser_set_device');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_set_device');
			});
		});

		describe('inputSchema validation', () => {
			it('requires device string', () => {
				expect(() => getTool().inputSchema.parse({ device: 'iPhone 14' })).not.toThrow();
			});

			it('rejects missing device', () => {
				expect(() => getTool().inputSchema.parse({})).toThrow();
			});
		});

		describe('execute', () => {
			it('sets device emulation', async () => {
				const result = await getTool().execute({ device: 'Pixel 7' }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.setDevice).toHaveBeenCalledWith('page1', { name: 'Pixel 7' });
				expect(data.device).toBe('Pixel 7');
			});
		});
	});
});
