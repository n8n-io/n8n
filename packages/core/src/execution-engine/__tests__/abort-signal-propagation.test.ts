/**
 * Reproduction test for GHC-7327: Stop execution does not abort in-flight LLM API calls
 *
 * This test demonstrates that when an execution is stopped via stopExecution(),
 * the AbortController signal is not properly propagated to HTTP requests made
 * by LLM nodes, causing API calls to continue running and burning credits.
 */

import axios, { type AxiosRequestConfig } from 'axios';
import { mock } from 'jest-mock-extended';
import type {
	IExecuteFunctions,
	INode,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import nock from 'nock';

import { parseRequestObject } from '../node-execution-context/utils/request-helper-functions';

jest.mock('axios');
const mockedAxios = jest.mocked(axios);

describe('GHC-7327: AbortSignal propagation to HTTP requests', () => {
	let abortController: AbortController;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		jest.clearAllMocks();
		abortController = new AbortController();

		mockExecuteFunctions = mock<IExecuteFunctions>({
			getExecutionCancelSignal: () => abortController.signal,
			getNode: () => mock<INode>(),
		});
	});

	afterEach(() => {
		nock.cleanAll();
	});

	it('should demonstrate that AbortSignal is not propagated to axios requests', async () => {
		// Set up a mock HTTP request that will be aborted
		const requestConfig: AxiosRequestConfig = {
			method: 'POST',
			url: 'https://api.openai.com/v1/chat/completions',
			data: {
				model: 'gpt-4',
				messages: [{ role: 'user', content: 'Test prompt' }],
			},
			headers: {
				'Content-Type': 'application/json',
			},
		};

		// Mock axios to track if signal is passed
		let axiosCalledWithSignal = false;
		mockedAxios.mockImplementation(async (config: AxiosRequestConfig) => {
			if (config.signal) {
				axiosCalledWithSignal = true;
			}

			// Simulate a slow request
			return new Promise((resolve) => {
				setTimeout(() => {
					resolve({
						data: { choices: [{ message: { content: 'Response' } }] },
						status: 200,
						statusText: 'OK',
						headers: {},
						config,
					});
				}, 1000);
			});
		});

		// Create a request with abort signal
		const requestWithAbort = {
			...requestConfig,
			abortSignal: abortController.signal,
		};

		// Parse the request (this is what n8n does internally)
		const parsedConfig = await parseRequestObject(requestWithAbort as any);

		// Execute the request
		const requestPromise = mockedAxios(parsedConfig);

		// Abort the request after 100ms
		setTimeout(() => {
			abortController.abort();
		}, 100);

		try {
			await requestPromise;
		} catch (error) {
			// Expected to be aborted
		}

		// BUG: The signal should be passed to axios, but it's not consistently done
		// This test will FAIL because the AbortSignal is not properly propagated
		expect(parsedConfig.signal).toBe(abortController.signal);
		expect(axiosCalledWithSignal).toBe(true);
	});

	it('should demonstrate abort signal not canceling long-running LLM requests', async () => {
		// Mock a slow LLM API endpoint
		const apiMock = nock('https://api.openai.com')
			.post('/v1/chat/completions')
			.delayConnection(2000) // Simulate slow connection
			.reply(200, {
				id: 'chatcmpl-test',
				choices: [{ message: { role: 'assistant', content: 'Response' } }],
			});

		let requestAborted = false;
		let requestCompleted = false;

		// Mock axios to track abort behavior
		mockedAxios.mockImplementation(async (config: AxiosRequestConfig) => {
			// Check if signal is provided
			if (config.signal) {
				config.signal.addEventListener('abort', () => {
					requestAborted = true;
				});
			}

			try {
				await new Promise((resolve, reject) => {
					setTimeout(() => {
						if (config.signal?.aborted) {
							reject(new Error('Request aborted'));
						} else {
							requestCompleted = true;
							resolve({ data: { choices: [] }, status: 200 });
						}
					}, 1000);
				});
			} catch (error) {
				throw error;
			}

			return {
				data: { choices: [{ message: { content: 'Response' } }] },
				status: 200,
				statusText: 'OK',
				headers: {},
				config,
			};
		});

		const requestConfig = {
			method: 'POST',
			url: 'https://api.openai.com/v1/chat/completions',
			data: { model: 'gpt-4', messages: [] },
			abortSignal: abortController.signal,
		};

		const parsedConfig = await parseRequestObject(requestConfig as any);
		const requestPromise = mockedAxios(parsedConfig);

		// Abort after 200ms (before request would complete)
		setTimeout(() => {
			abortController.abort();
		}, 200);

		try {
			await requestPromise;
		} catch (error) {
			// Expected abort error
		}

		// Wait a bit to ensure any async operations complete
		await new Promise((resolve) => setTimeout(resolve, 100));

		// BUG: Request should be aborted, not completed
		// This assertion will FAIL because the signal is not properly handled
		expect(requestAborted).toBe(true);
		expect(requestCompleted).toBe(false);
	});

	it('should show that multiple concurrent requests are not aborted', async () => {
		const requests: Array<{ aborted: boolean; completed: boolean }> = [
			{ aborted: false, completed: false },
			{ aborted: false, completed: false },
			{ aborted: false, completed: false },
		];

		// Mock multiple axios calls
		mockedAxios.mockImplementation(async (config: AxiosRequestConfig) => {
			const requestIndex = parseInt((config.data as any)?.requestId || '0');
			const request = requests[requestIndex];

			if (config.signal) {
				config.signal.addEventListener('abort', () => {
					request.aborted = true;
				});
			}

			await new Promise((resolve) =>
				setTimeout(() => {
					if (!config.signal?.aborted) {
						request.completed = true;
					}
					resolve(undefined);
				}, 1000),
			);

			return {
				data: { choices: [] },
				status: 200,
				statusText: 'OK',
				headers: {},
				config,
			};
		});

		// Start 3 concurrent requests
		const promises = [0, 1, 2].map(async (i) => {
			const config = {
				method: 'POST',
				url: 'https://api.openai.com/v1/chat/completions',
				data: { requestId: i.toString() },
				abortSignal: abortController.signal,
			};
			const parsed = await parseRequestObject(config as any);
			return mockedAxios(parsed);
		});

		// Abort all requests after 200ms
		setTimeout(() => {
			abortController.abort();
		}, 200);

		await Promise.allSettled(promises);

		// Wait for any async cleanup
		await new Promise((resolve) => setTimeout(resolve, 100));

		// BUG: All requests should be aborted, but they're not
		// These assertions will FAIL
		requests.forEach((request, i) => {
			expect(request.aborted).toBe(true); // FAILS - requests not aborted
			expect(request.completed).toBe(false); // FAILS - requests complete anyway
		});
	});
});
