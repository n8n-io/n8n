const REQUEST = { code: 'flowchart LR\n  A --> B', theme: 'dark', maxTextSize: 50_000 };

function mermaidStub() {
	return {
		initialize: vi.fn(),
		parse: vi.fn().mockResolvedValue({ diagramType: 'flowchart-v2' }),
		render: vi.fn().mockResolvedValue({ svg: '<svg/>' }),
	};
}

/** Sends a message to the sandbox window. The viewer is the parent of the real sandbox. */
function send(source: unknown, data: unknown = REQUEST) {
	const port = { postMessage: vi.fn() };
	window.dispatchEvent(Object.assign(new Event('message'), { source, data, ports: [port] }));
	return port;
}

describe('skillMermaidSandbox', () => {
	beforeEach(async () => {
		vi.resetModules();
		// @ts-expect-error The sandbox script is a classic script, so TypeScript sees no module.
		await import('./skillMermaidSandbox.js');
	});

	afterEach(() => {
		// Use up the listener of a test that sent no request from the parent.
		send(window.parent);
		vi.unstubAllGlobals();
	});

	it('renders the source with the strict Mermaid options and replies with the diagram', async () => {
		const mermaid = mermaidStub();
		vi.stubGlobal('mermaid', mermaid);

		const port = send(window.parent);

		await vi.waitFor(() => expect(port.postMessage).toHaveBeenCalledWith('<svg/>'));
		expect(mermaid.initialize).toHaveBeenCalledWith({
			startOnLoad: false,
			securityLevel: 'strict',
			suppressErrorRendering: true,
			maxTextSize: REQUEST.maxTextSize,
			htmlLabels: false,
			theme: 'dark',
		});
		expect(mermaid.parse).toHaveBeenCalledWith(REQUEST.code, { suppressErrors: true });
		expect(mermaid.render).toHaveBeenCalledWith('skill-diagram', REQUEST.code, document.body);
	});

	it.each([
		{ name: 'no result', parsed: false },
		{ name: 'the error diagram', parsed: { diagramType: 'error' } },
	])('replies with null when the parse gives $name', async ({ parsed }) => {
		const mermaid = mermaidStub();
		mermaid.parse.mockResolvedValue(parsed);
		vi.stubGlobal('mermaid', mermaid);

		const port = send(window.parent);

		await vi.waitFor(() => expect(port.postMessage).toHaveBeenCalledWith(null));
		expect(mermaid.render).not.toHaveBeenCalled();
	});

	it('replies with false when the Mermaid file did not load', async () => {
		const port = send(window.parent);

		await vi.waitFor(() => expect(port.postMessage).toHaveBeenCalledWith(false));
	});

	it('replies with false when the render fails after the parse passes', async () => {
		const mermaid = mermaidStub();
		mermaid.render.mockRejectedValue(new Error('Render failed'));
		vi.stubGlobal('mermaid', mermaid);

		const port = send(window.parent);

		await vi.waitFor(() => expect(port.postMessage).toHaveBeenCalledWith(false));
	});

	it('ignores a message that is not from the parent and still answers the parent', async () => {
		const mermaid = mermaidStub();
		vi.stubGlobal('mermaid', mermaid);

		const otherPort = send({});
		const port = send(window.parent);

		await vi.waitFor(() => expect(port.postMessage).toHaveBeenCalledWith('<svg/>'));
		expect(otherPort.postMessage).not.toHaveBeenCalled();
		expect(mermaid.render).toHaveBeenCalledTimes(1);
	});

	it('answers one request only', async () => {
		const mermaid = mermaidStub();
		vi.stubGlobal('mermaid', mermaid);

		const port = send(window.parent);
		const secondPort = send(window.parent);

		await vi.waitFor(() => expect(port.postMessage).toHaveBeenCalledWith('<svg/>'));
		expect(secondPort.postMessage).not.toHaveBeenCalled();
	});
});
