import vm from 'vm';

import { loadClassInIsolation } from '../load-class-in-isolation';

vi.mock('@n8n/backend-common', async (importActual) => {
	return {
		...(await importActual<typeof import('@n8n/backend-common')>()),
		inTest: false,
	};
});

describe('loadClassInIsolation', () => {
	const filePath = '/path/to/TestClass.js';
	const className = 'TestClass';

	class TestClass {
		getValue(): string {
			return 'test value';
		}
	}

	vi.spyOn(vm, 'createContext').mockReturnValue({});

	const runInContext = vi.fn().mockImplementation(() => new TestClass());
	const scriptSpy = vi.spyOn(vm, 'Script').mockImplementation(function (this: vm.Script) {
		this.runInContext = runInContext;
		return this;
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should create script with correct require statement', () => {
		const instance = loadClassInIsolation<TestClass>(filePath, className);

		expect(scriptSpy).toHaveBeenCalledWith(`new (require('${filePath}').${className})()`);
		expect(instance.getValue()).toBe('test value');
	});

	it('should handle Windows-style paths', () => {
		const originalPlatform = process.platform;
		Object.defineProperty(process, 'platform', { value: 'win32' });

		loadClassInIsolation('/path\\to\\TestClass.js', 'TestClass');

		expect(scriptSpy).toHaveBeenCalledWith(`new (require('${filePath}').${className})()`);

		Object.defineProperty(process, 'platform', { value: originalPlatform });
	});

	it('should throw error when script execution fails', () => {
		runInContext.mockImplementationOnce(() => {
			throw new Error('Script execution failed');
		});

		expect(() => loadClassInIsolation(filePath, className)).toThrow('Script execution failed');
	});
});
