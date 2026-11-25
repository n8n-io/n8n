import express from 'express';
import { parseHTML } from 'linkedom';
import request from 'supertest';

import { TEMPLATES_DIR } from '@/constants';
import { createHandlebarsEngine } from '@/utils/handlebars.util';

const REVOKE_URL = 'http://localhost:5678/rest/credentials/cred-1/revoke?resolverId=system-n8n';

const renderView = async (view: Record<string, unknown>) => {
	const app = express();
	app.engine('handlebars', createHandlebarsEngine());
	app.set('view engine', 'handlebars');
	app.set('views', TEMPLATES_DIR);
	app.get('/', (_req, res) => res.render('form-shell', view));

	const response = await request(app).get('/');
	return response.text;
};

type FetchResult = { status: number; body?: unknown } | Error;

/**
 * Renders the shell with one connected account and runs its inline script against
 * a real DOM. Each fetch the script makes waits until the test settles it, so a
 * test can look at the row while the request is still running.
 */
async function runShell() {
	const html = await renderView({
		formTitle: 'Test',
		iframeSrc: '/form/abc?n8nShellInner=1',
		useDialog: false,
		submitterEmail: 'visitor@example.com',
		credentials: [
			{
				id: 'cred-1',
				name: 'Gmail account',
				connected: true,
				initial: 'G',
				account: 'visitor@example.com',
				resolverId: 'system-n8n',
				revokeUrl: REVOKE_URL,
			},
		],
	});
	const source = html.slice(html.lastIndexOf('<script>') + '<script>'.length);
	const js = source.slice(0, source.indexOf('</script>'));
	const { window, document } = parseHTML(html);

	const requests: Array<{ url: string; method: string; settle: (r: FetchResult) => void }> = [];
	const fetch = async (url: string, init: { method: string }) =>
		await new Promise<Response>((resolve, reject) => {
			requests.push({
				url,
				method: init.method,
				settle: (result) => {
					if (result instanceof Error) reject(result);
					else {
						const body = result.status === 204 ? null : JSON.stringify(result.body ?? {});
						resolve(new Response(body, { status: result.status }));
					}
				},
			});
		});

	const popup = { closed: false, location: '', close: vi.fn() };
	window.open = vi.fn(() => popup) as unknown as typeof window.open;

	// The script names these as globals; passing them as parameters keeps the real
	// Node globals out of its reach.
	// eslint-disable-next-line @typescript-eslint/no-implied-eval
	new Function('window', 'document', 'fetch', 'localStorage', 'BroadcastChannel', js)(
		window,
		document,
		fetch,
		{ getItem: () => 'browser-1' },
		undefined,
	);

	const row = () => document.querySelector('.cred-row')!;
	const click = (selector: string) =>
		row()
			.querySelector(selector)!
			.dispatchEvent(new window.Event('click', { bubbles: true }));
	// Lets the script's promise chain run after a request settles.
	const flush = async () => await new Promise((resolve) => setImmediate(resolve));

	return {
		requests,
		popup,
		window,
		row,
		click,
		flush,
		status: () => row().querySelector('.cred-sub')!.textContent,
		error: () => row().querySelector('.cred-error'),
	};
}

describe('form-shell.handlebars', () => {
	describe('Disconnect', () => {
		it('shows a pending state and locks the row while the request runs', async () => {
			const shell = await runShell();

			shell.click('.btn-disconnect');

			expect(shell.requests).toHaveLength(1);
			expect(shell.requests[0]).toMatchObject({
				url: `${REVOKE_URL}&authSource=cookie`,
				method: 'DELETE',
			});
			expect(shell.status()).toBe('Disconnecting…');
			expect(shell.row().getAttribute('data-pending')).toBe('true');
			expect(shell.row().querySelector<HTMLButtonElement>('.btn-connected')!.disabled).toBe(true);
		});

		it('sends one request when clicked twice', async () => {
			const shell = await runShell();

			shell.click('.btn-disconnect');
			shell.click('.btn-disconnect');

			expect(shell.requests).toHaveLength(1);
		});

		it.each([204, 404])('marks the account as not connected on a %s', async (status) => {
			const shell = await runShell();

			shell.click('.btn-disconnect');
			shell.requests[0].settle({ status });
			await shell.flush();

			expect(shell.row().getAttribute('data-connected')).toBeNull();
			expect(shell.row().getAttribute('data-pending')).toBeNull();
			expect(shell.status()).toBe('Not connected · needed to submit this form');
			expect(shell.row().querySelector('.connect')).not.toBeNull();
			expect(shell.error()).toBeNull();
		});

		it.each([
			['a server error', { status: 500 }, "Couldn't disconnect. Try again."],
			['a network error', new Error('offline'), "Couldn't disconnect. Try again."],
			['a 401', { status: 401 }, 'Your session expired. Reload the page to try again.'],
			['a 403', { status: 403 }, 'Your session expired. Reload the page to try again.'],
		])('keeps the account connected and shows an error on %s', async (_label, result, message) => {
			const shell = await runShell();

			shell.click('.btn-disconnect');
			shell.requests[0].settle(result);
			await shell.flush();

			expect(shell.row().getAttribute('data-connected')).toBe('true');
			expect(shell.row().getAttribute('data-pending')).toBeNull();
			expect(shell.status()).toBe('Connected as visitor@example.com');
			expect(shell.error()?.textContent).toBe(message);
			expect(shell.error()?.getAttribute('role')).toBe('alert');
			expect(shell.row().querySelector<HTMLButtonElement>('.btn-connected')!.disabled).toBe(false);
		});

		it('clears the error when the next attempt starts', async () => {
			const shell = await runShell();
			shell.click('.btn-disconnect');
			shell.requests[0].settle({ status: 500 });
			await shell.flush();

			shell.click('.btn-disconnect');

			expect(shell.requests).toHaveLength(2);
			expect(shell.error()).toBeNull();
		});
	});

	describe('Connect after a disconnect', () => {
		async function disconnected() {
			const shell = await runShell();
			shell.click('.btn-disconnect');
			shell.requests[0].settle({ status: 204 });
			await shell.flush();
			shell.requests.length = 0;
			return shell;
		}

		it('sends one request when clicked twice', async () => {
			const shell = await disconnected();

			shell.click('.connect');
			shell.click('.connect');

			expect(shell.requests).toHaveLength(1);
			expect(shell.requests[0].method).toBe('POST');
			expect(shell.row().querySelector<HTMLButtonElement>('.connect')!.disabled).toBe(true);
		});

		it('sends the popup to the new authorize link', async () => {
			const shell = await disconnected();

			shell.click('.connect');
			shell.requests[0].settle({
				status: 200,
				body: { data: 'https://accounts.example.com/auth' },
			});
			await shell.flush();

			expect(shell.popup.location).toBe('https://accounts.example.com/auth');
			expect(shell.row().querySelector<HTMLButtonElement>('.connect')!.disabled).toBe(false);
			expect(shell.error()).toBeNull();
		});

		it('shows an error when the browser blocks the popup', async () => {
			const shell = await disconnected();
			shell.window.open = vi.fn(() => null);

			shell.click('.connect');
			shell.requests[0].settle({
				status: 200,
				body: { data: 'https://accounts.example.com/auth' },
			});
			await shell.flush();

			expect(shell.error()?.textContent).toBe("Couldn't connect. Try again.");
			expect(shell.row().querySelector<HTMLButtonElement>('.connect')!.disabled).toBe(false);
		});

		it.each([
			['a server error', { status: 500 }, "Couldn't connect. Try again."],
			['a network error', new Error('offline'), "Couldn't connect. Try again."],
			['a response without a link', { status: 200, body: {} }, "Couldn't connect. Try again."],
			['a 401', { status: 401 }, 'Your session expired. Reload the page to try again.'],
		])('closes the popup and shows an error on %s', async (_label, result, message) => {
			const shell = await disconnected();

			shell.click('.connect');
			shell.requests[0].settle(result);
			await shell.flush();

			expect(shell.popup.close).toHaveBeenCalled();
			expect(shell.row().getAttribute('data-connected')).toBeNull();
			expect(shell.error()?.textContent).toBe(message);
			expect(shell.row().querySelector<HTMLButtonElement>('.connect')!.disabled).toBe(false);
		});
	});
});
