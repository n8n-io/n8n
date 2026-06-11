import { ContextModule, detectContextTool } from './context-tool';

vi.mock('get-windows', () => ({ activeWindow: vi.fn().mockResolvedValue(null) }));
vi.mock('node:child_process', () => ({ execFile: vi.fn() }));

describe('detectContextTool', () => {
	test('is a read-only tool named context_active', () => {
		expect(detectContextTool.name).toBe('context_active');
		expect(detectContextTool.annotations?.readOnlyHint).toBe(true);
	});

	test('is offered by the module', () => {
		expect(ContextModule.isSupported()).toBe(true);
		expect(ContextModule.definitions).toContain(detectContextTool);
	});

	test('execute returns the detected context as structured content', async () => {
		const result = await detectContextTool.execute({}, { dir: '/tmp' });
		expect(result.structuredContent).toEqual({ kind: 'other' });
	});

	test('reports a filesystemRead resource (not the default-deny computer group)', async () => {
		const resources = await detectContextTool.getAffectedResources({}, { dir: '/tmp' });
		expect(resources[0].toolGroup).toBe('filesystemRead');
	});
});
