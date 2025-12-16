/* eslint-disable @typescript-eslint/naming-convention */
import type { INodeProperties } from 'n8n-workflow';

/**
 * TranslationFeatures
 *
 * Defines reusable feature configurations for translation nodes.
 * Provides configurations for mock translation behavior, latency simulation, and error retry handling.
 *
 * Features:
 * - DELAY: Simulates network/processing delays with fixed or random intervals
 * - MOCKED_TRANSLATION: Mocks translation responses for testing (pass/overwrite/fail scenarios)
 * - RETRY: Simulates retry behavior on failures (fails first N times, then succeeds)
 */
export const TranslationFeatures = {
	/**
	 * DELAY Configuration
	 *
	 * Simulates network latency or processing delays for translation requests.
	 * Useful for testing timeout handling and performance under various conditions.
	 *
	 * Properties:
	 * - delayEnabled (boolean): Master toggle to enable/disable delay simulation
	 * - delayType (fixed|random): Type of delay to apply
	 * - delayValue (ms): Amount of delay in milliseconds (0-60000)
	 */
	DELAY: [
		{
			displayName: 'Enable Response Delay',
			name: 'delayEnabled',
			type: 'boolean',
			default: false,
			description:
				'Add an artificial delay to simulate network latency or processing time before returning the translation response',
		},
		{
			displayName: 'Delay Pattern',
			name: 'delayType',
			type: 'options',
			options: [
				{
					name: 'Fixed - Same delay every time',
					value: 'fixed',
				},
				{
					name: 'Random - Varies between 0 and max delay',
					value: 'random',
				},
			],
			default: 'fixed',
			description: 'Choose whether the delay should be consistent or variable',
			displayOptions: {
				show: {
					delayEnabled: [true],
				},
			},
		},
		{
			displayName: 'Maximum Delay (Milliseconds)',
			name: 'delayValue',
			type: 'number',
			default: 1000,
			typeOptions: {
				minValue: 0,
				maxValue: 60000,
				numberStepSize: 100,
			},
			description:
				'Maximum delay in milliseconds (1000 ms = 1 second). For Fixed pattern, response is delayed by this amount. For Random pattern, delay varies from 0 up to this value.',
			displayOptions: {
				show: {
					delayEnabled: [true],
				},
			},
		},
	] as INodeProperties[],

	/**
	 * MOCKED_TRANSLATION Configuration
	 *
	 * Provides mock translation responses for testing and development.
	 * Allows simulating three translation scenarios: successful passthrough, successful with override, and error.
	 *
	 * Properties:
	 * - mockedTranslationResult (pass|overwrite|fail): Translation scenario to simulate
	 * - mockedTranslationText (string): Custom translation text when in overwrite mode
	 * - mockedTranslationStatusCode (100-599): HTTP error code for failed translations
	 * - mockedTranslationErrorMessage (string): Error message text for failed translations
	 *
	 * Conditional fields:
	 * - mockedTranslationText field only shows when mockedTranslationResult='overwrite'
	 * - mockedTranslationStatusCode and mockedTranslationErrorMessage fields only show when mockedTranslationResult='fail'
	 */
	MOCKED_TRANSLATION: [
		{
			displayName: 'Simulation Scenario',
			name: 'mockedTranslationResult',
			type: 'options',
			options: [
				{
					name: 'Pass - Return original text unchanged',
					value: 'pass',
				},
				{
					name: 'Overwrite - Return custom translation text',
					value: 'overwrite',
				},
				{
					name: 'Error - Return error with status code',
					value: 'fail',
				},
			],
			default: 'pass',
			description:
				'Select whether to return original text, override with custom translation, or simulate an error',
		},
		{
			displayName: 'Mock Translation Output',
			name: 'mockedTranslationText',
			type: 'string',
			default: '',
			description:
				'The custom translated text to return in the mock response. This text will replace the original input.',
			displayOptions: {
				show: {
					mockedTranslationResult: ['overwrite'],
				},
			},
		},
		{
			displayName: 'Error HTTP Status Code',
			name: 'mockedTranslationStatusCode',
			type: 'number',
			default: 500,
			typeOptions: {
				minValue: 100,
				maxValue: 599,
			},
			description:
				'HTTP status code for the simulated error (e.g., 500 for server error, 429 for rate limit, 400 for bad request)',
			displayOptions: {
				show: {
					mockedTranslationResult: ['fail'],
				},
			},
		},
		{
			displayName: 'Error Message Text',
			name: 'mockedTranslationErrorMessage',
			type: 'string',
			default: 'Translation failed',
			description:
				'The error message that will be returned with the simulated error response (e.g., "Service unavailable", "Invalid API key")',
			displayOptions: {
				show: {
					mockedTranslationResult: ['fail'],
				},
			},
		},
	] as INodeProperties[],

	/**
	 * RETRY Configuration
	 *
	 * Simulates transient failures that recover after delays and retries.
	 * Controls how many failed attempts occur before the request succeeds.
	 *
	 * Properties:
	 * - retryEnabled (boolean): Enable retry simulation
	 * - retryMaxAttempts (number): Number of failed attempts before success (1-10)
	 * - retryMaxDelay (ms): Maximum delay between retry attempts (0-60000)
	 */
	RETRY: [
		{
			displayName: 'Enable Retries',
			name: 'retryEnabled',
			type: 'boolean',
			default: false,
			description:
				'Enable retry simulation to test transient failure handling. Requests will fail N times before succeeding.',
		},
		{
			displayName: 'Maximum Retry Attempts',
			name: 'retryMaxAttempts',
			type: 'number',
			default: 1,
			typeOptions: {
				minValue: 1,
				maxValue: 10,
				numberStepSize: 1,
			},
			description:
				'Number of failed attempts before the request succeeds (1-10). Each request increments the counter until this threshold is reached.',
			displayOptions: {
				show: {
					retryEnabled: [true],
				},
			},
		},
		{
			displayName: 'Maximum Retry Delay (Milliseconds)',
			name: 'retryMaxDelay',
			type: 'number',
			default: 1000,
			typeOptions: {
				minValue: 0,
				maxValue: 60000,
				numberStepSize: 100,
			},
			description:
				'Maximum delay in milliseconds between retry attempts (0-60000). Delay is randomly selected between 0 and this value.',
			displayOptions: {
				show: {
					retryEnabled: [true],
				},
			},
		},
	] as INodeProperties[],
};
