import { MAX_DIAGRAM_LENGTH, renderSkillMermaid } from './skillMermaidRenderer';

const CODE = 'flowchart LR\n  A --> B';

function sandboxOf(frame: HTMLIFrameElement | null) {
	const sandbox = new DOMParser().parseFromString(frame?.srcdoc ?? '', 'text/html');
	return {
		scriptNonces: [...sandbox.querySelectorAll<HTMLScriptElement>('script[src]')].map(
			(script) => script.nonce,
		),
		policy: sandbox.querySelector<HTMLMetaElement>('meta[http-equiv="Content-Security-Policy"]')
			?.content,
	};
}

/** Starts a render, and answers the request of the viewer with `reply`, as the sandbox does. */
async function renderWithReply(reply: unknown) {
	const render = renderSkillMermaid(CODE, 'dark', 800, new AbortController().signal);
	const frame = document.body.querySelector('iframe');
	if (!frame?.contentWindow) throw new Error('The render appended no frame');
	const postMessage = vi
		.spyOn(frame.contentWindow, 'postMessage')
		.mockImplementation((_message: unknown, _target: unknown, transfer?: Transferable[]) => {
			const [port] = transfer ?? [];
			if (port instanceof MessagePort) port.postMessage(reply);
		});
	// jsdom loads the frame and fires `load` after this function returns the spy.
	const result = await render;
	return { result, postMessage };
}

describe('renderSkillMermaid', () => {
	afterEach(() => {
		vi.useRealTimers();
		document.head.querySelector('meta[property="csp-nonce"]')?.remove();
	});

	it('appends no frame for a signal that is already aborted', async () => {
		const controller = new AbortController();
		controller.abort();

		await expect(renderSkillMermaid(CODE, 'default', 800, controller.signal)).resolves.toEqual({
			outcome: 'aborted',
		});
		expect(document.body.querySelector('iframe')).toBeNull();
	});

	it('sends the source to the loaded frame and returns the diagram of the reply', async () => {
		const { result, postMessage } = await renderWithReply('<svg/>');

		expect(postMessage).toHaveBeenCalledTimes(1);
		expect(postMessage).toHaveBeenCalledWith(
			{ code: CODE, theme: 'dark', maxTextSize: MAX_DIAGRAM_LENGTH },
			'*',
			[expect.any(MessagePort)],
		);
		expect(result).toEqual({ outcome: 'rendered', svg: '<svg/>' });
		expect(document.body.querySelector('iframe')).toBeNull();
	});

	it.each([
		{ reply: null, outcome: 'invalid' },
		{ reply: false, outcome: 'failed' },
		{ reply: { svg: '<svg/>' }, outcome: 'failed' },
	])('returns "$outcome" for the reply $reply', async ({ reply, outcome }) => {
		const { result } = await renderWithReply(reply);

		expect(result).toEqual({ outcome });
		expect(document.body.querySelector('iframe')).toBeNull();
	});

	it('stops a render with no reply after 10 seconds', async () => {
		vi.useFakeTimers();
		const settled = vi.fn();
		void renderSkillMermaid(CODE, 'default', 800, new AbortController().signal).then(settled);

		await vi.advanceTimersByTimeAsync(9_999);
		expect(settled).not.toHaveBeenCalled();
		expect(document.body.querySelector('iframe')).not.toBeNull();

		await vi.advanceTimersByTimeAsync(1);
		expect(settled).toHaveBeenCalledWith({ outcome: 'timeout' });
		expect(document.body.querySelector('iframe')).toBeNull();
	});

	it('generates one nonce for both scripts and the policy when the editor has none', async () => {
		const controller = new AbortController();
		const render = renderSkillMermaid(CODE, 'default', 800, controller.signal);

		try {
			const { scriptNonces, policy } = sandboxOf(document.body.querySelector('iframe'));
			expect(scriptNonces).toHaveLength(2);
			expect(scriptNonces[0]).toMatch(/^[A-Za-z0-9+/]{22}==$/);
			expect(scriptNonces[1]).toBe(scriptNonces[0]);
			expect(policy).toBe(
				`default-src 'none'; script-src 'nonce-${scriptNonces[0]}'; style-src 'unsafe-inline'; img-src data:`,
			);
		} finally {
			controller.abort();
			await render;
		}
	});

	it('does not use an editor nonce that has other characters than a nonce can have', async () => {
		const nonce = document.createElement('meta');
		nonce.setAttribute('property', 'csp-nonce');
		nonce.nonce = "x' 'unsafe-inline";
		document.head.append(nonce);
		const controller = new AbortController();
		const render = renderSkillMermaid(CODE, 'default', 800, controller.signal);

		try {
			const { scriptNonces, policy } = sandboxOf(document.body.querySelector('iframe'));
			expect(scriptNonces[0]).toMatch(/^[A-Za-z0-9+/]{22}==$/);
			expect(scriptNonces[1]).toBe(scriptNonces[0]);
			expect(policy).toBe(
				`default-src 'none'; script-src 'nonce-${scriptNonces[0]}'; style-src 'unsafe-inline'; img-src data:`,
			);
			expect(document.body.querySelector('iframe')?.srcdoc).not.toContain("x'");
		} finally {
			controller.abort();
			await render;
		}
	});

	it('loads both sandbox scripts as external assets with the editor response nonce', async () => {
		const nonce = document.createElement('meta');
		nonce.setAttribute('property', 'csp-nonce');
		nonce.nonce = 'editor-response-nonce';
		document.head.append(nonce);
		const controller = new AbortController();
		const render = renderSkillMermaid('flowchart LR\n  A --> B', 'default', 800, controller.signal);

		try {
			const frame = document.body.querySelector('iframe');
			const sandbox = new DOMParser().parseFromString(frame?.srcdoc ?? '', 'text/html');
			const scripts = [...sandbox.querySelectorAll<HTMLScriptElement>('script[src]')];
			expect(scripts).toHaveLength(2);
			expect(scripts.map((script) => script.nonce)).toEqual([nonce.nonce, nonce.nonce]);
			expect(sandbox.querySelector('script:not([src])')).toBeNull();
			expect(sandbox.querySelector('meta[http-equiv="Content-Security-Policy"]')).toHaveProperty(
				'content',
				`default-src 'none'; script-src 'nonce-${nonce.nonce}'; style-src 'unsafe-inline'; img-src data:`,
			);
		} finally {
			controller.abort();
			await render;
			nonce.remove();
		}
	});

	it('removes a cancelled render without interrupting another render', async () => {
		const first = new AbortController();
		const second = new AbortController();
		const firstRender = renderSkillMermaid('flowchart LR\n  A --> B', 'default', 800, first.signal);
		const secondRender = renderSkillMermaid('flowchart TD\n  C --> D', 'dark', 900, second.signal);
		const frames = () => [...document.body.querySelectorAll('iframe')];

		try {
			expect(frames().map((frame) => frame.width)).toEqual(['800', '900']);
			first.abort();
			await expect(firstRender).resolves.toEqual({ outcome: 'aborted' });
			expect(frames().map((frame) => frame.width)).toEqual(['900']);
		} finally {
			first.abort();
			second.abort();
			await Promise.all([firstRender, secondRender]);
		}
		expect(frames()).toHaveLength(0);
	});

	it('renders two diagrams at a time and starts the next one when a frame is done', async () => {
		const controllers = [new AbortController(), new AbortController(), new AbortController()];
		const renders = controllers.map(
			async ({ signal }, index) =>
				await renderSkillMermaid('flowchart LR\n  A --> B', 'default', 800 + index, signal),
		);
		const widths = () => [...document.body.querySelectorAll('iframe')].map(({ width }) => width);

		try {
			expect(widths()).toEqual(['800', '801']);
			controllers[0].abort();
			await renders[0];
			await vi.waitFor(() => expect(widths()).toEqual(['801', '802']));
		} finally {
			controllers.forEach((controller) => controller.abort());
			await Promise.all(renders);
		}
		expect(widths()).toHaveLength(0);
	});

	it('creates no frame for a queued render that is cancelled', async () => {
		const controllers = [new AbortController(), new AbortController(), new AbortController()];
		const renders = controllers.map(
			async ({ signal }, index) =>
				await renderSkillMermaid('flowchart LR\n  A --> B', 'default', 800 + index, signal),
		);
		const widths = () => [...document.body.querySelectorAll('iframe')].map(({ width }) => width);

		try {
			controllers[2].abort();
			await expect(renders[2]).resolves.toEqual({ outcome: 'aborted' });
			controllers[0].abort();
			await renders[0];
			// The slot is free again, and the cancelled render does not take it.
			expect(widths()).toEqual(['801']);
		} finally {
			controllers.forEach((controller) => controller.abort());
			await Promise.all(renders);
		}
	});
});
