export {};

const mockMastraInstance = {};
const mockMastra = jest.fn().mockReturnValue(mockMastraInstance);

jest.mock('@mastra/core/mastra', () => ({
	Mastra: mockMastra,
}));

const { registerWithMastra } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../register-with-mastra') as typeof import('../register-with-mastra');

describe('registerWithMastra', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should create storage-only Mastra without agents', () => {
		const mockAgent = { id: 'my-agent', __registerMastra: jest.fn() } as never;
		const mockStorage = { id: 'my-storage' } as never;

		registerWithMastra('my-agent', mockAgent, mockStorage);

		expect(mockMastra).toHaveBeenCalledWith(expect.objectContaining({ storage: mockStorage }));
		// Must NOT pass agents to the constructor — avoids pinning per-request
		// agent closures in Mastra's #agents dict.
		const constructorArg = (mockMastra.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
		expect(constructorArg).not.toHaveProperty('agents');
	});

	it('should reuse cached Mastra for same storage key', () => {
		const mockAgent1 = { __registerMastra: jest.fn() } as never;
		const mockAgent2 = { __registerMastra: jest.fn() } as never;
		const mockStorage = { id: 'cached-test' } as never;

		registerWithMastra('agent-1', mockAgent1, mockStorage);
		registerWithMastra('agent-2', mockAgent2, mockStorage);

		expect(mockMastra).toHaveBeenCalledTimes(1);
		expect((mockAgent2 as { __registerMastra: jest.Mock }).__registerMastra).toHaveBeenCalledWith(
			mockMastraInstance,
		);
	});
});
