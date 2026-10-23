import { resolveBrowserUseState } from '../browser/browser-use-availability';

describe('resolveBrowserUseState', () => {
	it('reports unavailable when the client did not report the entry, so a silent client advertises nothing', () => {
		expect(
			resolveBrowserUseState({
				reportedByClient: false,
				browserUseEnabledGlobally: true,
				browserConnected: false,
			}),
		).toEqual({ status: 'unavailable' });
	});

	it('reports disconnected when the client reported the entry and nothing is paired', () => {
		expect(
			resolveBrowserUseState({
				reportedByClient: true,
				browserUseEnabledGlobally: true,
				browserConnected: false,
			}),
		).toEqual({ status: 'disconnected' });
	});

	it('keeps the browser unavailable when the admin disabled Browser Use, whatever the client reports', () => {
		expect(
			resolveBrowserUseState({
				reportedByClient: true,
				browserUseEnabledGlobally: false,
				browserConnected: false,
			}),
		).toEqual({ status: 'unavailable' });
	});

	it('reports connected when the session is live, even if the client rendered no entry', () => {
		// Tool registration follows the MCP server, so the prompt has to describe the
		// live tools whether or not the client renders the + menu entry.
		expect(
			resolveBrowserUseState({
				reportedByClient: false,
				browserUseEnabledGlobally: true,
				browserConnected: true,
			}),
		).toEqual({ status: 'connected' });
	});
});
