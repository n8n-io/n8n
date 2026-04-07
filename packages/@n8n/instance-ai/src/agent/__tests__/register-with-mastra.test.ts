const mockMastra = jest.fn();

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

	it('should pass agent and storage to Mastra constructor', () => {
		const mockAgent = { id: 'my-agent' } as never;
		const mockStorage = { id: 'my-storage' } as never;

		registerWithMastra('my-agent', mockAgent, mockStorage);

		expect(mockMastra).toHaveBeenCalledWith(
			expect.objectContaining({
				agents: { 'my-agent': mockAgent },
				storage: mockStorage,
			}),
		);
	});

	it('should reuse cached Mastra for same storage key', () => {
		const mockAgent1 = { __registerMastra: jest.fn() } as never;
		const mockAgent2 = { __registerMastra: jest.fn() } as never;
		const mockStorage = { id: 'cached-test' } as never;

		registerWithMastra('agent-1', mockAgent1, mockStorage);
		registerWithMastra('agent-2', mockAgent2, mockStorage);

		expect(mockMastra).toHaveBeenCalledTimes(1);
		expect((mockAgent2 as { __registerMastra: jest.Mock }).__registerMastra).toHaveBeenCalled();
	});
});
