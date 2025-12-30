import 'reflect-metadata';

import type { IExecuteFunctions } from 'n8n-workflow';

import type { Tracer } from '../../tracing/tracer';
import type { IContext } from '../../types/context-interface';
import { CoreError } from '../../types/core-error';
import { CONTEXT_PARAMETER, ContextFactory, mapTo } from '../context-factory';

/**
 * Tests for ContextFactory
 * @author Claude Sonnet 4.5
 * @date 2025-12-30
 */

// Type-safe mock creation helpers
function createMockFunctions(): IExecuteFunctions & { getNodeParameter: jest.Mock } {
	return {
		getNodeParameter: jest.fn(),
	} as IExecuteFunctions & { getNodeParameter: jest.Mock };
}

function createMockTracer(): Tracer & { debug: jest.Mock; errorAndThrow: jest.Mock } {
	const tracer = {
		debug: jest.fn(),
		errorAndThrow: jest.fn((msg: string) => {
			throw new CoreError(msg);
		}),
	} as unknown as Tracer & { debug: jest.Mock; errorAndThrow: jest.Mock };
	return tracer;
}

describe('ContextFactory', () => {
	let mockFunctions: IExecuteFunctions & { getNodeParameter: jest.Mock };
	let mockTracer: Tracer & { debug: jest.Mock; errorAndThrow: jest.Mock };

	beforeEach(() => {
		mockFunctions = createMockFunctions();
		mockTracer = createMockTracer();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('@mapTo decorator', () => {
		describe('business logic', () => {
			it('[BL-03] should handle nested parameters with collection', () => {
				// ARRANGE
				class NestedParamContext implements IContext {
					constructor(
						@mapTo('apiKey') public apiKey: string,
						@mapTo('timeout', 'options') public timeout: number,
					) {}
					throwIfInvalid() {}
					asLogMetadata() {
						return { apiKey: this.apiKey, timeout: this.timeout };
					}
				}

				// ACT
				const meta = Reflect.getMetadata(CONTEXT_PARAMETER, NestedParamContext) as string[];

				// ASSERT
				expect(meta).toEqual(['apiKey', 'options.timeout']);
			});

			it('[BL-04] should extract parameters in correct order', () => {
				// ARRANGE
				class MultiParamContext implements IContext {
					constructor(
						@mapTo('first') public first: string,
						@mapTo('second') public second: number,
						@mapTo('third') public third: boolean,
					) {}
					throwIfInvalid() {}
					asLogMetadata() {
						return { first: this.first, second: this.second, third: this.third };
					}
				}

				// ACT
				const meta = Reflect.getMetadata(CONTEXT_PARAMETER, MultiParamContext) as string[];

				// ASSERT
				// Metadata should preserve left-to-right parameter order
				expect(meta).toEqual(['first', 'second', 'third']);
			});
		});

		describe('error handling', () => {
			it('[EH-01] should throw if metadata is not an array', () => {
				// ARRANGE
				class CorruptedContext implements IContext {
					constructor(public apiKey: string) {}
					throwIfInvalid() {}
					asLogMetadata() {
						return {};
					}
				}

				// Simulate corrupted metadata
				Reflect.defineMetadata(CONTEXT_PARAMETER, 'not-an-array', CorruptedContext);

				// ACT & ASSERT
				expect(() => {
					// This will execute the decorator logic implicitly
					mapTo('apiKey')(CorruptedContext, undefined, 0);
				}).toThrow(CoreError);
			});
		});
	});

	describe('ContextFactory.read', () => {
		describe('business logic', () => {
			it('[BL-01] should create context with single parameter', () => {
				// ARRANGE
				class SingleParamContext implements IContext {
					constructor(@mapTo('apiKey') public apiKey: string) {}
					throwIfInvalid() {
						if (!this.apiKey) throw new Error('apiKey required');
					}
					asLogMetadata() {
						return { apiKey: this.apiKey };
					}
				}

				mockFunctions.getNodeParameter.mockReturnValue('test-api-key-123');

				// ACT
				const result = ContextFactory.read(SingleParamContext, mockFunctions, mockTracer);

				// ASSERT
				expect(result).toBeInstanceOf(SingleParamContext);
				expect(result.apiKey).toBe('test-api-key-123');
				expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('apiKey', 0, undefined, {
					extractValue: true,
				});
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining("Reading context 'SingleParamContext'"));
			});

			it('[BL-02] should create context with multiple parameters', () => {
				// ARRANGE
				class MultiParamContext implements IContext {
					constructor(
						@mapTo('apiKey') public apiKey: string,
						@mapTo('timeout') public timeout: number,
						@mapTo('retries') public retries: number,
					) {}
					throwIfInvalid() {}
					asLogMetadata() {
						return { apiKey: this.apiKey, timeout: this.timeout, retries: this.retries };
					}
				}

				mockFunctions.getNodeParameter.mockReturnValueOnce('test-api-key-123').mockReturnValueOnce(5000).mockReturnValueOnce(3);

				// ACT
				const result = ContextFactory.read(MultiParamContext, mockFunctions, mockTracer);

				// ASSERT
				expect(result).toBeInstanceOf(MultiParamContext);
				expect(result.apiKey).toBe('test-api-key-123');
				expect(result.timeout).toBe(5000);
				expect(result.retries).toBe(3);
				expect(mockFunctions.getNodeParameter).toHaveBeenCalledTimes(3);
			});

			it('[BL-05] should call context validation after construction', () => {
				// ARRANGE
				class ValidatingContext implements IContext {
					private validated = false;

					constructor(@mapTo('apiKey') public apiKey: string) {}

					throwIfInvalid() {
						this.validated = true;
						if (!this.apiKey) throw new Error('apiKey required');
					}

					asLogMetadata() {
						return { apiKey: this.apiKey, validated: this.validated };
					}
				}

				mockFunctions.getNodeParameter.mockReturnValue('test-api-key-123');

				// ACT
				const result = ContextFactory.read(ValidatingContext, mockFunctions, mockTracer);

				// ASSERT
				// @ts-expect-error - accessing private field for test verification
				expect(result.validated).toBe(true);
			});

			it('[BL-06] should log debug messages during execution', () => {
				// ARRANGE
				class TestContext implements IContext {
					constructor(@mapTo('apiKey') public apiKey: string) {}
					throwIfInvalid() {}
					asLogMetadata() {
						return { apiKey: this.apiKey };
					}
				}

				mockFunctions.getNodeParameter.mockReturnValue('test-api-key');

				// ACT
				ContextFactory.read(TestContext, mockFunctions, mockTracer);

				// ASSERT
				// Should log: start, param fetch, success
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining("Reading context 'TestContext'"));
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining("Fetching node parameter 'apiKey'"));
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining('Valid context TestContext created successfully'));
			});

			it('[BL-07] should resolve node parameters with extractValue', () => {
				// ARRANGE
				class TestContext implements IContext {
					constructor(@mapTo('apiKey') public apiKey: string) {}
					throwIfInvalid() {}
					asLogMetadata() {
						return { apiKey: this.apiKey };
					}
				}

				mockFunctions.getNodeParameter.mockReturnValue('resolved-value');

				// ACT
				ContextFactory.read(TestContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('apiKey', 0, undefined, {
					extractValue: true,
				});
			});
		});

		describe('edge cases', () => {
			it('[EC-01] should handle missing optional parameter', () => {
				// ARRANGE
				class OptionalParamContext implements IContext {
					constructor(@mapTo('apiKey') public apiKey?: string) {}
					throwIfInvalid() {
						// Optional parameter - no validation
					}
					asLogMetadata() {
						return { apiKey: this.apiKey };
					}
				}

				// getNodeParameter throws for missing param
				mockFunctions.getNodeParameter.mockImplementation(() => {
					throw new Error('Parameter not found');
				});

				// ACT
				const result = ContextFactory.read(OptionalParamContext, mockFunctions, mockTracer);

				// ASSERT
				expect(result.apiKey).toBeUndefined();
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining('has not been fetched'));
			});

			it('[EC-02] should handle parameter with dot notation', () => {
				// ARRANGE
				class DotNotationContext implements IContext {
					constructor(
						@mapTo('apiKey') public apiKey: string,
						@mapTo('timeout', 'options') public timeout: number,
					) {}
					throwIfInvalid() {}
					asLogMetadata() {
						return { apiKey: this.apiKey, timeout: this.timeout };
					}
				}

				mockFunctions.getNodeParameter.mockReturnValueOnce('test-api-key').mockReturnValueOnce(10000);

				// ACT
				const result = ContextFactory.read(DotNotationContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('options.timeout', 0, undefined, { extractValue: true });
				expect(result.timeout).toBe(10000);
			});

			it('[EC-03] should handle context with many parameters (5+)', () => {
				// ARRANGE
				class ManyParamsContext implements IContext {
					constructor(
						@mapTo('param1') public param1: string,
						@mapTo('param2') public param2: number,
						@mapTo('param3') public param3: boolean,
						@mapTo('param4') public param4: string,
						@mapTo('param5') public param5: number,
						@mapTo('param6') public param6: string,
					) {}
					throwIfInvalid() {}
					asLogMetadata() {
						return {
							param1: this.param1,
							param2: this.param2,
							param3: this.param3,
							param4: this.param4,
							param5: this.param5,
							param6: this.param6,
						};
					}
				}

				mockFunctions.getNodeParameter
					.mockReturnValueOnce('val1')
					.mockReturnValueOnce(2)
					.mockReturnValueOnce(true)
					.mockReturnValueOnce('val4')
					.mockReturnValueOnce(5)
					.mockReturnValueOnce('val6');

				// ACT
				const result = ContextFactory.read(ManyParamsContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockFunctions.getNodeParameter).toHaveBeenCalledTimes(6);
				expect(result.param1).toBe('val1');
				expect(result.param6).toBe('val6');
			});

			it('[EC-04] should preserve metadata across multiple decorators', () => {
				// ARRANGE
				class AccumulatingContext implements IContext {
					constructor(
						@mapTo('first') public first: string,
						@mapTo('second') public second: string,
						@mapTo('third') public third: string,
					) {}
					throwIfInvalid() {}
					asLogMetadata() {
						return { first: this.first, second: this.second, third: this.third };
					}
				}

				// ACT
				const meta = Reflect.getMetadata(CONTEXT_PARAMETER, AccumulatingContext) as string[];

				// ASSERT
				expect(meta).toHaveLength(3);
				expect(meta).toEqual(['first', 'second', 'third']);
			});

			it('[EC-05] should handle undefined node parameter value', () => {
				// ARRANGE
				class UndefinedValueContext implements IContext {
					constructor(@mapTo('optional') public optional?: string) {}
					throwIfInvalid() {}
					asLogMetadata() {
						return { optional: this.optional };
					}
				}

				mockFunctions.getNodeParameter.mockReturnValue(undefined);

				// ACT
				const result = ContextFactory.read(UndefinedValueContext, mockFunctions, mockTracer);

				// ASSERT
				expect(result.optional).toBeUndefined();
			});

			it('[EC-06] should call getNodeParameter with correct args', () => {
				// ARRANGE
				class TestContext implements IContext {
					constructor(@mapTo('apiKey') public apiKey: string) {}
					throwIfInvalid() {}
					asLogMetadata() {
						return { apiKey: this.apiKey };
					}
				}

				mockFunctions.getNodeParameter.mockReturnValue('test-value');

				// ACT
				ContextFactory.read(TestContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('apiKey', 0, undefined, {
					extractValue: true,
				});
			});
		});

		describe('error handling', () => {
			it('[EH-02] should throw if no metadata found', () => {
				// ARRANGE
				class NoMetadataContext implements IContext {
					// No @mapTo decorators
					constructor(public apiKey: string) {}
					throwIfInvalid() {}
					asLogMetadata() {
						return {};
					}
				}

				// ACT & ASSERT
				expect(() => {
					ContextFactory.read(NoMetadataContext, mockFunctions, mockTracer);
				}).toThrow(CoreError);
				expect(mockTracer.errorAndThrow).toHaveBeenCalledWith(expect.stringContaining('🐞 [BUG]'));
				expect(mockTracer.errorAndThrow).toHaveBeenCalledWith(expect.stringContaining('No mapping metadata'));
			});

			it('[EH-03] should throw if metadata array is empty', () => {
				// ARRANGE
				class EmptyMetadataContext implements IContext {
					constructor(public apiKey: string) {}
					throwIfInvalid() {}
					asLogMetadata() {
						return {};
					}
				}

				// Force empty array metadata
				Reflect.defineMetadata(CONTEXT_PARAMETER, [], EmptyMetadataContext);

				// ACT & ASSERT
				expect(() => {
					ContextFactory.read(EmptyMetadataContext, mockFunctions, mockTracer);
				}).toThrow(CoreError);
				expect(mockTracer.errorAndThrow).toHaveBeenCalledWith(expect.stringContaining('No mapping metadata'));
			});

			it('[EH-04] should throw if no type metadata found', () => {
				// ARRANGE
				class NoTypeMetadataContext implements IContext {
					constructor(@mapTo('apiKey') public apiKey: string) {}
					throwIfInvalid() {}
					asLogMetadata() {
						return {};
					}
				}

				// Force metadata but remove type metadata
				const originalGetMetadata = Reflect.getMetadata;
				jest.spyOn(Reflect, 'getMetadata').mockImplementation((key: unknown, target: unknown): unknown => {
					if (key === 'design:paramtypes') return undefined;
					return originalGetMetadata(key, target as object) as unknown;
				}); // ACT & ASSERT
				expect(() => {
					ContextFactory.read(NoTypeMetadataContext, mockFunctions, mockTracer);
				}).toThrow(CoreError);
				expect(mockTracer.errorAndThrow).toHaveBeenCalledWith(expect.stringContaining('No type metadata found'));

				// Cleanup
				jest.restoreAllMocks();
			});

			it('[EH-05] should throw if type metadata array is empty', () => {
				// ARRANGE
				class EmptyTypeMetadataContext implements IContext {
					constructor(@mapTo('apiKey') public apiKey: string) {}
					throwIfInvalid() {}
					asLogMetadata() {
						return {};
					}
				}

				// Mock to return empty array for type metadata
				const originalGetMetadata = Reflect.getMetadata;
				jest.spyOn(Reflect, 'getMetadata').mockImplementation((key: unknown, target: unknown): unknown => {
					if (key === 'design:paramtypes') return [];
					return originalGetMetadata(key, target as object) as unknown;
				}); // ACT & ASSERT
				expect(() => {
					ContextFactory.read(EmptyTypeMetadataContext, mockFunctions, mockTracer);
				}).toThrow(CoreError);

				// Cleanup
				jest.restoreAllMocks();
			});

			it('[EH-06] should throw if partial decorator coverage', () => {
				// ARRANGE
				class PartialDecoratorContext implements IContext {
					constructor(
						@mapTo('apiKey') public apiKey: string,
						// Second parameter missing @mapTo
						public timeout: number,
					) {}
					throwIfInvalid() {}
					asLogMetadata() {
						return {};
					}
				}

				// ACT & ASSERT
				expect(() => {
					ContextFactory.read(PartialDecoratorContext, mockFunctions, mockTracer);
				}).toThrow(CoreError);
				expect(mockTracer.errorAndThrow).toHaveBeenCalledWith(expect.stringContaining('Only 1 of 2 parameters mapped'));
			});

			it('[EH-07] should throw if context validation fails', () => {
				// ARRANGE
				class InvalidContext implements IContext {
					constructor(@mapTo('apiKey') public apiKey: string) {}
					throwIfInvalid() {
						throw new Error('Invalid configuration');
					}
					asLogMetadata() {
						return { apiKey: this.apiKey };
					}
				}

				mockFunctions.getNodeParameter.mockReturnValue('test-api-key');

				// ACT & ASSERT
				expect(() => {
					ContextFactory.read(InvalidContext, mockFunctions, mockTracer);
				}).toThrow(CoreError);
			});

			it('[EH-08] should enrich validation error with context metadata', () => {
				// ARRANGE
				class InvalidContext implements IContext {
					constructor(@mapTo('apiKey') public apiKey: string) {}
					throwIfInvalid() {
						throw new Error('Custom validation error');
					}
					asLogMetadata() {
						return { apiKey: this.apiKey, status: 'invalid' };
					}
				}

				mockFunctions.getNodeParameter.mockReturnValue('test-api-key');

				// ACT & ASSERT
				expect(() => {
					ContextFactory.read(InvalidContext, mockFunctions, mockTracer);
				}).toThrow(CoreError);

				// Verify error enrichment
				expect(mockTracer.errorAndThrow).toHaveBeenCalledWith(
					expect.stringContaining('Custom validation error') as string,
					expect.objectContaining({
						context: expect.objectContaining({
							name: 'InvalidContext',
							apiKey: 'test-api-key',
							status: 'invalid',
						}) as Record<string, unknown>,
					}) as Record<string, unknown>,
				);
			});
			it('[EH-09] should log error before throwing in throwIfInvalid', () => {
				// ARRANGE
				class FailingContext implements IContext {
					constructor(@mapTo('apiKey') public apiKey: string) {}
					throwIfInvalid() {
						throw new Error('Validation failed');
					}
					asLogMetadata() {
						return { apiKey: this.apiKey };
					}
				}

				mockFunctions.getNodeParameter.mockReturnValue('test-api-key');

				// ACT & ASSERT
				expect(() => {
					ContextFactory.read(FailingContext, mockFunctions, mockTracer);
				}).toThrow(CoreError);
				expect(mockTracer.errorAndThrow).toHaveBeenCalled();
			});

			it('[EH-10] should include childError in enriched metadata', () => {
				// ARRANGE
				const originalError = new Error('Original validation error');

				class ErrorContext implements IContext {
					constructor(@mapTo('apiKey') public apiKey: string) {}
					throwIfInvalid() {
						throw originalError;
					}
					asLogMetadata() {
						return { apiKey: this.apiKey };
					}
				}

				mockFunctions.getNodeParameter.mockReturnValue('test-api-key');

				// ACT & ASSERT
				expect(() => {
					ContextFactory.read(ErrorContext, mockFunctions, mockTracer);
				}).toThrow(CoreError);

				expect(mockTracer.errorAndThrow).toHaveBeenCalledWith(
					expect.any(String),
					expect.objectContaining({
						childError: originalError,
					}),
				);
			});
		});
	});
});
