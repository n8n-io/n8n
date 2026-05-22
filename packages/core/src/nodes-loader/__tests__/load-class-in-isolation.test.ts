import { loadClassInIsolation } from '../load-class-in-isolation';

class TestClass {
	getValue(): string {
		return 'test value';
	}
}

const { runInContext, ScriptCtor } = vi.hoisted(() => ({
	runInContext: vi.fn(),
	ScriptCtor: vi.fn(),
}));

vi.mock('vm', () => ({
	createContext: vi.fn().mockReturnValue({}),
	Script: ScriptCtor,
}));

vi.mock('@n8n/backend-common', async (importActual) => {
	return {
		...(await importActual<typeof import('@n8n/backend-common')>()),
		inTest: false,
	};
});

describe('loadClassInIsolation', () => {
	const filePath = '/path/to/TestClass.js';
	const className = 'TestClass';

	beforeEach(() => {
		vi.clearAllMocks();
		runInContext.mockImplementation(() => new TestClass());
		ScriptCtor.mockImplementation(function (this: { runInContext: typeof runInContext }) {
			this.runInContext = runInContext;
		});
	});

	it('should create script with correct require statement', () => {
		const instance = loadClassInIsolation<TestClass>(filePath, className);

		expect(ScriptCtor).toHaveBeenCalledWith(`new (require('${filePath}').${className})()`);
		expect(instance.getValue()).toBe('test value');
	});

	it('should handle Windows-style paths', () => {
		const originalPlatform = process.platform;
		Object.defineProperty(process, 'platform', { value: 'win32' });

		loadClassInIsolation('/path\\to\\TestClass.js', 'TestClass');

		expect(ScriptCtor).toHaveBeenCalledWith(`new (require('${filePath}').${className})()`);

		Object.defineProperty(process, 'platform', { value: originalPlatform });
	});

	it('should throw error when script execution fails', () => {
		runInContext.mockImplementationOnce(() => {
			throw new Error('Script execution failed');
		});

		expect(() => loadClassInIsolation(filePath, className)).toThrow('Script execution failed');
	});
});
