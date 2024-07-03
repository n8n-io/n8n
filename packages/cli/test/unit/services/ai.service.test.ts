import { ApplicationError, jsonParse } from 'n8n-workflow';
import { AIService } from '@/services/ai.service';
import config from '@/config';
import {
	generateCurlCommandFallbackPromptTemplate,
	generateCurlCommandPromptTemplate,
} from '@/services/ai/prompts/generateCurl';
import { PineconeStore } from '@langchain/pinecone';

jest.mock('@/config', () => {
	return {
		getEnv: jest.fn().mockReturnValue('openai'),
	};
});

jest.mock('langchain/output_parsers', () => {
	return {
		JsonOutputFunctionsParser: jest.fn().mockImplementation(() => {
			return {
				parse: jest.fn(),
			};
		}),
	};
});

jest.mock('@langchain/pinecone', () => {
	const similaritySearch = jest.fn().mockImplementation(async () => []);

	return {
		PineconeStore: {
			similaritySearch,
			fromExistingIndex: jest.fn().mockImplementation(async () => ({
				similaritySearch,
			})),
		},
	};
});

jest.mock('@pinecone-database/pinecone', () => ({
	Pinecone: jest.fn().mockImplementation(() => ({
		Index: jest.fn().mockImplementation(() => ({})),
	})),
}));

jest.mock('@/services/ai/providers/openai', () => {
	const modelInvoke = jest.fn().mockImplementation(() => ({ curl: 'curl -X GET https://n8n.io' }));

	return {
		AIProviderOpenAI: jest.fn().mockImplementation(() => {
			return {
				mapResponse: jest.fn((v) => v),
				invoke: modelInvoke,
				model: {
					invoke: modelInvoke,
				},
				modelWithOutputParser: () => ({
					invoke: modelInvoke,
				}),
			};
		}),
	};
});

afterEach(() => {
	jest.clearAllMocks();
});

describe('AIService', () => {
	describe('constructor', () => {
		test('should not assign provider with unknown provider type', async () => {
			jest.mocked(config).getEnv.mockReturnValue('unknown');
			const aiService = new AIService();

			expect(aiService.provider).not.toBeDefined();
		});
	});

	describe('prompt', () => {
		test('should throw if prompting with unknown provider type', async () => {
			jest.mocked(config).getEnv.mockReturnValue('unknown');

			const aiService = new AIService();

			await expect(async () => await aiService.prompt([])).rejects.toThrow(ApplicationError);
		});

		test('should call provider.invoke', async () => {
			jest.mocked(config).getEnv.mockReturnValue('openai');

			const service = new AIService();
			await service.prompt(['message']);

			expect(service.provider.invoke).toHaveBeenCalled();
		});
	});

	describe('generateCurl', () => {
		test('should call generateCurl fallback if pinecone key is not defined', async () => {
			jest.mocked(config).getEnv.mockImplementation((key: string) => {
				if (key === 'ai.pinecone.apiKey') {
					return undefined;
				}

				return 'openai';
			});

			const service = new AIService();
			const generateCurlGenericSpy = jest.spyOn(service, 'generateCurlGeneric');
			service.validateCurl = (v) => v;

			const serviceName = 'Service Name';
			const serviceRequest = 'Please make a request';

			await service.generateCurl(serviceName, serviceRequest);

			expect(generateCurlGenericSpy).toHaveBeenCalled();
		});

		test('should call generateCurl fallback if no matched service', async () => {
			jest.mocked(config).getEnv.mockReturnValue('openai');

			const service = new AIService();
			const generateCurlGenericSpy = jest.spyOn(service, 'generateCurlGeneric');
			service.validateCurl = (v) => v;

			const serviceName = 'NoMatchedServiceName';
			const serviceRequest = 'Please make a request';

			await service.generateCurl(serviceName, serviceRequest);

			expect(generateCurlGenericSpy).toHaveBeenCalled();
		});

		test('should call generateCurl fallback command if no matched vector store documents', async () => {
			jest.mocked(config).getEnv.mockReturnValue('openai');

			const service = new AIService();
			const generateCurlGenericSpy = jest.spyOn(service, 'generateCurlGeneric');
			service.validateCurl = (v) => v;

			const serviceName = 'OpenAI';
			const serviceRequest = 'Please make a request';

			await service.generateCurl(serviceName, serviceRequest);

			expect(generateCurlGenericSpy).toHaveBeenCalled();
		});

		test('should call generateCurl command with documents from vectorStore', async () => {
			const endpoints = [
				{
					id: '1',
					title: 'OpenAI',
					pageContent: '{ "example": "value" }',
				},
			];
			const serviceName = 'OpenAI';
			const serviceRequest = 'Please make a request';

			jest.mocked(config).getEnv.mockReturnValue('openai');
			jest
				.mocked((PineconeStore as unknown as { similaritySearch: () => {} }).similaritySearch)
				.mockImplementation(async () => endpoints);

			const service = new AIService();
			service.validateCurl = (v) => v;

			await service.generateCurl(serviceName, serviceRequest);

			const messages = await generateCurlCommandPromptTemplate.formatMessages({
				serviceName,
				serviceRequest,
				endpoints: JSON.stringify(endpoints.map((document) => jsonParse(document.pageContent))),
			});

			expect(service.provider.model.invoke).toHaveBeenCalled();
			expect(service.provider.model.invoke.mock.calls[0][0].messages).toEqual(messages);
		});
	});

	describe('generateCurlGeneric', () => {
		test('should call prompt with serviceName and serviceRequest', async () => {
			const serviceName = 'Service Name';
			const serviceRequest = 'Please make a request';

			const service = new AIService();
			service.validateCurl = (v) => v;

			await service.generateCurlGeneric(serviceName, serviceRequest);

			const messages = await generateCurlCommandFallbackPromptTemplate.formatMessages({
				serviceName,
				serviceRequest,
			});

			expect(service.provider.model.invoke).toHaveBeenCalled();
			expect(jest.mocked(service.provider.model.invoke).mock.calls[0][0].messages).toEqual(
				messages,
			);
		});
	});

	describe('validateCurl', () => {
		it('should return the result if curl command starts with "curl"', () => {
			const aiService = new AIService();
			const result = { curl: 'curl -X GET https://n8n.io' };
			const validatedResult = aiService.validateCurl(result);
			expect(validatedResult).toEqual(result);
		});

		it('should replace boolean and number placeholders in the curl command', () => {
			const aiService = new AIService();
			const result = { curl: 'curl -X GET https://n8n.io -d "{ "key": {{value}} }"' };
			const expected = { curl: 'curl -X GET https://n8n.io -d "{ "key": "{{value}}" }"' };
			const validatedResult = aiService.validateCurl(result);
			expect(validatedResult).toEqual(expected);
		});

		it('should throw an error if curl command does not start with "curl"', () => {
			const aiService = new AIService();
			const result = { curl: 'wget -O - https://n8n.io' };
			expect(() => aiService.validateCurl(result)).toThrow(ApplicationError);
		});
	});
});
