import Module from 'node:module';
import { resourceFromAttributes } from '@opentelemetry/resources';

import { createAgent365TracerProvider } from '../agent-365-provider';

type ModuleLoader = { _load: (request: string, ...rest: unknown[]) => unknown };

describe('createAgent365TracerProvider', () => {
	const loader = Module as unknown as ModuleLoader;
	const originalLoad = loader._load;

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('reports a failed export when the Microsoft package cannot load', async () => {
		vi.spyOn(loader, '_load').mockImplementation((request, ...rest) => {
			if (request === '@microsoft/opentelemetry') throw new Error('package missing');
			return originalLoad.call(Module, request, ...rest);
		});
		const provider = createAgent365TracerProvider(
			resourceFromAttributes({ 'host.id': Promise.resolve('host-1') }),
			[],
		);

		provider.getTracer('Agent365Sdk').startSpan('invoke_agent').end();

		await expect(provider.forceFlush()).rejects.toEqual([new Error('package missing')]);
	});
});
