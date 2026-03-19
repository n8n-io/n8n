// Mock all heavy Mastra dependencies to avoid ESM issues in Jest
const mockMastra = jest.fn();
const mockLangSmithExporter = jest.fn();
const mockObservability = jest.fn();

jest.mock('@mastra/core/mastra', () => ({
	Mastra: mockMastra,
}));
jest.mock('@mastra/langsmith', () => ({
	LangSmithExporter: mockLangSmithExporter,
}));
jest.mock('@mastra/observability', () => ({
	Observability: mockObservability,
}));

const { registerWithMastra } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../register-with-mastra') as typeof import('../register-with-mastra');

describe('registerWithMastra', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should create LangSmithExporter with default config when no tracingConfig', () => {
		const mockAgent = {} as never;
		const mockStorage = {} as never;

		registerWithMastra('test-agent', mockAgent, mockStorage);

		expect(mockLangSmithExporter).toHaveBeenCalledWith({ projectName: 'instance-ai' });
		expect(mockMastra).toHaveBeenCalledTimes(1);
	});

	it('should create LangSmithExporter with proxy config when tracingConfig provided', () => {
		const mockAgent = {} as never;
		const mockStorage = {} as never;
		const tracingConfig = {
			apiUrl: 'https://proxy.example.com/langsmith',
			headers: { Authorization: 'Bearer test-token' },
		};

		registerWithMastra('test-agent', mockAgent, mockStorage, tracingConfig);

		expect(mockLangSmithExporter).toHaveBeenCalledWith({
			projectName: 'instance-ai',
			apiUrl: 'https://proxy.example.com/langsmith',
			apiKey: '-',
			autoBatchTracing: false,
			traceBatchConcurrency: 1,
			fetchOptions: { headers: { Authorization: 'Bearer test-token' } },
		});
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
});
