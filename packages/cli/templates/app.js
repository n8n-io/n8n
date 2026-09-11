// ponytail: whole-shell swap, no per-block diffing
(function () {
	'use strict';

	const meta = (name) => {
		const element = document.querySelector(`meta[name="${name}"]`);
		return element ? element.getAttribute('content') || '' : '';
	};

	const appBase = meta('n8n-app-base');
	const tokenUrl = appBase + '/_auth/token';

	let access = null;
	let refresh = null;
	let markReady;
	const ready = new Promise((resolve) => {
		markReady = resolve;
	});

	const isAppUrl = (url) => {
		const path = url.split(/[?#]/)[0];
		return path === appBase || path.startsWith(appBase + '/');
	};

	const grant = async (body) => {
		const response = await fetch(tokenUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});
		if (!response.ok) return false;
		const pair = await response.json();
		access = pair.accessToken;
		refresh = pair.refreshToken;
		return true;
	};

	const request = async (url, init) => {
		const send = () =>
			fetch(url, {
				...init,
				headers: {
					Accept: 'text/html',
					...(init && init.headers),
					Authorization: 'Bearer ' + access,
				},
			});
		const response = await send();
		if (response.status !== 401 || !refresh) return response;
		const refreshToken = refresh;
		refresh = null;
		return (await grant({ grant: 'refresh', refreshToken })) ? await send() : response;
	};

	const notice = (response) => {
		const card = document.createElement('div');
		card.className = 'app-notice';
		if (response.status === 401) {
			const link = document.createElement('a');
			link.href = location.href;
			link.className = 'app-link';
			link.textContent = 'Sign in again';
			card.append('Your session has ended. ', link);
		} else {
			card.textContent = response.status === 404 ? 'Page not found' : 'Something went wrong';
		}
		return card;
	};

	const runScripts = (shell) => {
		for (const script of shell.querySelectorAll('script')) {
			const fresh = document.createElement('script');
			for (const attribute of script.attributes) {
				fresh.setAttribute(attribute.name, attribute.value);
			}
			fresh.textContent = script.textContent;
			script.replaceWith(fresh);
		}
	};

	const render = async (response, push) => {
		const doc = response.ok
			? new DOMParser().parseFromString(await response.text(), 'text/html')
			: null;
		const shell = doc && doc.querySelector('[data-app-root]');
		const current = document.querySelector('[data-app-root]');
		if (!shell || !current) {
			if (response.status === 401) access = refresh = null;
			const main = document.querySelector('.app-main');
			if (main) main.replaceChildren(notice(response));
			return;
		}
		document.title = doc.title;
		current.replaceWith(shell);
		runScripts(shell);
		if (push) {
			try {
				history.pushState({}, '', response.url);
			} catch {}
		}
	};

	const navigate = async (url, push) => {
		await render(await request(url), push);
	};

	document.addEventListener('click', (event) => {
		const anchor = event.target.closest('a[href]');
		if (
			!access ||
			!anchor ||
			event.defaultPrevented ||
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey ||
			anchor.target ||
			anchor.hasAttribute('download') ||
			!isAppUrl(anchor.href)
		) {
			return;
		}
		event.preventDefault();
		void navigate(anchor.href, true);
	});

	document.addEventListener('submit', (event) => {
		const form = event.target;
		if (!access || event.defaultPrevented || !isAppUrl(form.action)) return;
		event.preventDefault();
		void request(form.action, { method: form.method || 'POST', body: new FormData(form) }).then(
			(response) => render(response, true),
		);
	});

	window.addEventListener('popstate', () => {
		if (access) void navigate(location.href, false);
	});

	// The editor's preview iframe has no URL to carry a code, so its parent posts it.
	window.addEventListener('message', (event) => {
		const data = event.data;
		if (
			window.parent === window ||
			event.source !== window.parent ||
			!data ||
			data.type !== 'n8n-app-code' ||
			typeof data.code !== 'string'
		) {
			return;
		}
		void grant({ grant: 'code', code: data.code }).then(markReady);
	});

	const init = async () => {
		const params = new URLSearchParams(location.search);
		const code = params.get('_code');
		if (!code) {
			// Framed, the parent posts a code after load; give it a moment before giving up.
			if (window.parent === window) markReady(false);
			else setTimeout(() => markReady(false), 5000);
			return;
		}
		const granted = await grant({ grant: 'code', code });
		if (granted) {
			params.delete('_code');
			const search = params.toString();
			try {
				history.replaceState(
					{},
					'',
					location.pathname + (search ? '?' + search : '') + location.hash,
				);
			} catch {}
		}
		markReady(granted);
	};

	// Block scripts (app-chat.js) call back through here, so the token has one
	// home: `ready` resolves to whether a token was obtained, by either path.
	window.n8nApp = { fetch: request, ready };
	void init();
})();
