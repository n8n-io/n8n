import { renderSkillMermaid } from './skillMermaidRenderer';

describe('renderSkillMermaid', () => {
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
