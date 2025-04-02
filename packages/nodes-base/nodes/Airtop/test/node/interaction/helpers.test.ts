import { constructInteractionRequest } from '../../../actions/interaction/helpers';
import { createMockExecuteFunction } from '../helpers';

describe('Test Airtop interaction helpers', () => {
	describe('constructInteractionRequest', () => {
		it('should construct basic request with default values', () => {
			const mockExecute = createMockExecuteFunction({
				additionalFields: {},
			});

			const request = constructInteractionRequest.call(mockExecute, 0);

			expect(request).toEqual({
				configuration: {},
			});
		});

		it("should include 'visualScope' parameter when specified", () => {
			const mockExecute = createMockExecuteFunction({
				additionalFields: {
					visualScope: 'viewport',
				},
			});

			const request = constructInteractionRequest.call(mockExecute, 0);

			expect(request).toEqual({
				configuration: {
					visualAnalysis: {
						scope: 'viewport',
					},
				},
			});
		});

		it("should include 'waitForNavigation' parameter when specified", () => {
			const mockExecute = createMockExecuteFunction({
				additionalFields: {
					waitForNavigation: 'load',
				},
			});

			const request = constructInteractionRequest.call(mockExecute, 0);

			expect(request).toEqual({
				configuration: {
					waitForNavigationConfig: {
						waitUntil: 'load',
					},
				},
				waitForNavigation: true,
			});
		});

		it('should merge additional parameters', () => {
			const mockExecute = createMockExecuteFunction({
				additionalFields: {
					waitForNavigation: 'load',
				},
			});

			const request = constructInteractionRequest.call(mockExecute, 0, {
				elementDescription: 'test element',
			});

			expect(request).toEqual({
				configuration: {
					waitForNavigationConfig: {
						waitUntil: 'load',
					},
				},
				waitForNavigation: true,
				elementDescription: 'test element',
			});
		});
	});
});
