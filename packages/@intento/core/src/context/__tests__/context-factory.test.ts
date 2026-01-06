import 'reflect-metadata';

import { mock } from 'jest-mock-extended';

import type { Tracer } from '../../tracing/tracer';
import type { IContext } from '../../types/context-interface';
import type { IFunctions } from '../../types/functions-interface';
import { CONTEXT_PARAMETER, ContextFactory, mapTo } from '../context-factory';

/**
 * Tests for ContextFactory
 * @author Claude Sonnet 4.5
 * @date 2026-01-06
 */

// Test context implementations
class ValidContext implements IContext {
	constructor(
		@mapTo('param1') readonly param1: string,
		@mapTo('param2', 'collection') readonly param2: number,
	) {
		Object.freeze(this);
	}

	throwIfInvalid(): void {
		// Valid context - no errors
	}

	asLogMetadata(): Record<string, unknown> {
		return { param1: this.param1, param2: this.param2 };
	}
}

class SingleParamContext implements IContext {
	constructor(@mapTo('value') readonly value: string) {
		Object.freeze(this);
	}

	throwIfInvalid(): void {}

	asLogMetadata(): Record<string, unknown> {
		return { value: this.value };
	}
}

class ManyParamsContext implements IContext {
	constructor(
		@mapTo('p1') readonly p1: string,
		@mapTo('p2') readonly p2: string,
		@mapTo('p3') readonly p3: string,
		@mapTo('p4') readonly p4: string,
		@mapTo('p5') readonly p5: string,
		@mapTo('p6') readonly p6: string,
	) {
		Object.freeze(this);
	}

	throwIfInvalid(): void {}

	asLogMetadata(): Record<string, unknown> {
		return { p1: this.p1, p2: this.p2, p3: this.p3, p4: this.p4, p5: this.p5, p6: this.p6 };
	}
}

class InvalidContext implements IContext {
	constructor(@mapTo('value') readonly value: number) {
		Object.freeze(this);
	}

	throwIfInvalid(): void {
		throw new RangeError('Value out of range');
	}

	asLogMetadata(): Record<string, unknown> {
		return { value: this.value };
	}
}

class UndefinedParamContext implements IContext {
	constructor(@mapTo('missing') readonly missing: string | undefined) {
		Object.freeze(this);
	}

	throwIfInvalid(): void {}

	asLogMetadata(): Record<string, unknown> {
		return { missing: this.missing };
	}
}

// Contexts without proper decorators (for error testing)
class NoDecoratorContext implements IContext {
	constructor(readonly param: string) {
		Object.freeze(this);
	}

	throwIfInvalid(): void {}

	asLogMetadata(): Record<string, unknown> {
		return { param: this.param };
	}
}

class PartialDecoratorContext implements IContext {
	constructor(
		@mapTo('param1') readonly param1: string,
		readonly param2: string,
	) {
		Object.freeze(this);
	}

	throwIfInvalid(): void {}

	asLogMetadata(): Record<string, unknown> {
		return { param1: this.param1, param2: this.param2 };
	}
}

describe('ContextFactory', () => {
	let mockFunctions: IFunctions;
	let mockTracer: Tracer;

	beforeEach(() => {
		mockFunctions = mock<IFunctions>();
		mockTracer = mock<Tracer>();

		// Setup default mock implementations
		(mockFunctions.getNodeParameter as jest.Mock).mockImplementation(
			(key: string, _itemIndex: number, _fallback: unknown, options: unknown) => {
				const params: Record<string, unknown> = {
					param1: 'test-value',
					collection: { param2: 42 },
					value: 'single-value',
					p1: 'v1',
					p2: 'v2',
					p3: 'v3',
					p4: 'v4',
					p5: 'v5',
					p6: 'v6',
				};

				// Handle dotted path extraction (e.g., 'collection.param2')
				if (key.includes('.') && (options as { extractValue?: boolean })?.extractValue) {
					const parts = key.split('.');
					let value: unknown = params;
					for (const part of parts) {
						if (value && typeof value === 'object' && part in value) {
							value = (value as Record<string, unknown>)[part];
						} else {
							throw new Error(`Parameter ${key} not found`);
						}
					}
					return value as number | string | boolean | Record<string, unknown>;
				}
				if (key in params) {
					return params[key];
				}
				throw new Error(`Parameter ${key} not found`);
			},
		);

		(mockTracer.debug as jest.Mock).mockReturnValue(undefined);
		const bugDetectedMock = mockTracer.bugDetected as unknown as jest.Mock;
		bugDetectedMock.mockImplementation((where: string, error: Error | string) => {
			const message = typeof error === 'string' ? error : error.message;
			throw new Error(`Bug detected at ${where}: ${message}`);
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('mapTo decorator', () => {
		describe('business logic', () => {
			it('[BL-01] should store parameter key in metadata', () => {
				// ARRANGE
				class TestContext implements IContext {
					constructor(@mapTo('testKey') readonly param: string) {}
					throwIfInvalid(): void {}
					asLogMetadata(): Record<string, unknown> {
						return {};
					}
				}

				// ACT
				const metadata = Reflect.getMetadata(CONTEXT_PARAMETER, TestContext) as string[] | undefined;

				// ASSERT
				expect(metadata).toEqual(['testKey']);
			});

			it('[BL-02] should create dotted path when collection provided', () => {
				// ARRANGE
				class TestContext implements IContext {
					constructor(@mapTo('key', 'collection') readonly param: string) {}
					throwIfInvalid(): void {}
					asLogMetadata(): Record<string, unknown> {
						return {};
					}
				}

				// ACT
				const metadata = Reflect.getMetadata(CONTEXT_PARAMETER, TestContext) as string[] | undefined;

				// ASSERT
				expect(metadata).toEqual(['collection.key']);
			});

			it('[BL-03] should maintain parameter order for multiple decorators', () => {
				// ARRANGE
				class TestContext implements IContext {
					constructor(
						@mapTo('first') readonly p1: string,
						@mapTo('second') readonly p2: string,
						@mapTo('third') readonly p3: string,
					) {}
					throwIfInvalid(): void {}
					asLogMetadata(): Record<string, unknown> {
						return {};
					}
				}

				// ACT
				const metadata = Reflect.getMetadata(CONTEXT_PARAMETER, TestContext) as string[] | undefined;

				// ASSERT
				expect(metadata).toEqual(['first', 'second', 'third']);
			});
		});

		describe('edge cases', () => {
			it('[EC-01] should handle single parameter without collection', () => {
				// ARRANGE
				class TestContext implements IContext {
					constructor(@mapTo('simpleKey') readonly param: string) {}
					throwIfInvalid(): void {}
					asLogMetadata(): Record<string, unknown> {
						return {};
					}
				}

				// ACT
				const metadata = Reflect.getMetadata(CONTEXT_PARAMETER, TestContext) as string[] | undefined;

				// ASSERT
				expect(metadata).toEqual(['simpleKey']);
				expect(metadata?.[0]).not.toContain('.');
			});

			it('[EC-02] should preserve metadata across multiple class parameters', () => {
				// ARRANGE - ValidContext already has multiple decorated parameters
				// ACT
				const metadata = Reflect.getMetadata(CONTEXT_PARAMETER, ValidContext) as string[] | undefined;

				// ASSERT
				expect(metadata).toHaveLength(2);
				expect(metadata).toEqual(['param1', 'collection.param2']);
			});
		});
	});

	describe('ContextFactory.read()', () => {
		describe('business logic', () => {
			it('[BL-04] should create context with all mapped parameters', () => {
				// ARRANGE - mockFunctions already set up with correct return values

				// ACT
				const context = ContextFactory.read(ValidContext, mockFunctions, mockTracer);

				// ASSERT
				expect(context).toBeInstanceOf(ValidContext);
				expect(context.param1).toBe('test-value');
				expect(context.param2).toBe(42);
				expect(Object.isFrozen(context)).toBe(true);
			});

			it('[BL-05] should extract nested parameters with collection notation', () => {
				// ARRANGE - mockFunctions already handles 'collection.param2'

				// ACT
				const context = ContextFactory.read(ValidContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('collection.param2', 0, undefined, { extractValue: true });
				expect(context.param2).toBe(42);
			});

			it('[BL-06] should call throwIfInvalid after instantiation', () => {
				// ARRANGE
				const throwIfInvalidSpy = jest.spyOn(ValidContext.prototype, 'throwIfInvalid');

				// ACT
				ContextFactory.read(ValidContext, mockFunctions, mockTracer);

				// ASSERT
				expect(throwIfInvalidSpy).toHaveBeenCalledTimes(1);

				throwIfInvalidSpy.mockRestore();
			});

			it('[BL-07] should return frozen validated context instance', () => {
				// ARRANGE - default setup

				// ACT
				const context = ContextFactory.read(ValidContext, mockFunctions, mockTracer);

				// ASSERT
				expect(Object.isFrozen(context)).toBe(true);
				expect(context).toBeInstanceOf(ValidContext);
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining('Valid context ValidContext created successfully'));
			});

			it('[BL-08] should extract parameter with extractValue option', () => {
				// ARRANGE - default setup

				// ACT
				ContextFactory.read(SingleParamContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('value', 0, undefined, {
					extractValue: true,
				});
			});

			it('[BL-09] should pass itemIndex 0 to getNodeParameter', () => {
				// ARRANGE - default setup

				// ACT
				ContextFactory.read(ValidContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith(expect.any(String), 0, undefined, expect.any(Object));
			});

			it('[BL-10] should log debug messages during extraction', () => {
				// ARRANGE - default setup

				// ACT
				ContextFactory.read(SingleParamContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining("Reading context 'SingleParamContext'"));
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining("Fetching node parameter 'value'"));
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining("Node parameter 'value' has been fetched"));
			});
		});

		describe('edge cases', () => {
			it('[EC-03] should handle undefined parameter values gracefully', () => {
				// ARRANGE
				(mockFunctions.getNodeParameter as jest.Mock).mockImplementation((key: string) => {
					if (key === 'missing') {
						throw new Error('Parameter not found');
					}
					return undefined;
				});

				// ACT
				const context = ContextFactory.read(UndefinedParamContext, mockFunctions, mockTracer);

				// ASSERT
				expect(context.missing).toBeUndefined();
			});

			it('[EC-04] should pass undefined to constructor for missing params', () => {
				// ARRANGE
				(mockFunctions.getNodeParameter as jest.Mock).mockImplementation(() => {
					throw new Error('Not found');
				});

				// ACT
				const context = ContextFactory.read(UndefinedParamContext, mockFunctions, mockTracer);

				// ASSERT
				expect(context.missing).toBeUndefined();
			});

			it('[EC-05] should handle context with single parameter', () => {
				// ARRANGE - default setup includes 'value' parameter

				// ACT
				const context = ContextFactory.read(SingleParamContext, mockFunctions, mockTracer);

				// ASSERT
				expect(context).toBeInstanceOf(SingleParamContext);
				expect(context.value).toBe('single-value');
			});

			it('[EC-06] should handle context with many parameters (5+)', () => {
				// ARRANGE - default setup includes p1-p6 parameters

				// ACT
				const context = ContextFactory.read(ManyParamsContext, mockFunctions, mockTracer);

				// ASSERT
				expect(context).toBeInstanceOf(ManyParamsContext);
				expect(context.p1).toBe('v1');
				expect(context.p2).toBe('v2');
				expect(context.p3).toBe('v3');
				expect(context.p4).toBe('v4');
				expect(context.p5).toBe('v5');
				expect(context.p6).toBe('v6');
			});

			it('[EC-07] should return undefined for non-existent parameter', () => {
				// ARRANGE
				(mockFunctions.getNodeParameter as jest.Mock).mockImplementation((key: string) => {
					throw new Error(`Parameter ${key} does not exist`);
				});

				// ACT
				const context = ContextFactory.read(UndefinedParamContext, mockFunctions, mockTracer);

				// ASSERT
				expect(context.missing).toBeUndefined();
			});

			it('[EC-08] should log debug message when parameter not found', () => {
				// ARRANGE
				(mockFunctions.getNodeParameter as jest.Mock).mockImplementation(() => {
					throw new Error('Not found');
				});

				// ACT
				ContextFactory.read(UndefinedParamContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining("Node parameter 'missing' has not been fetched"));
			});
		});

		describe('error handling', () => {
			it('[EH-01] should throw if no metadata found (no decorators)', () => {
				// ARRANGE
				Reflect.deleteMetadata(CONTEXT_PARAMETER, NoDecoratorContext);

				// ACT & ASSERT
				expect(() => {
					ContextFactory.read(NoDecoratorContext, mockFunctions, mockTracer);
				}).toThrow('Bug detected');

				expect(mockTracer.bugDetected).toHaveBeenCalledWith(
					'NoDecoratorContext',
					'No mapping metadata. Apply @mapTo decorator to all constructor parameters.',
				);
			});

			it('[EH-02] should throw if metadata array is empty', () => {
				// ARRANGE
				class EmptyMetaContext implements IContext {
					constructor(readonly param: string) {}
					throwIfInvalid(): void {}
					asLogMetadata(): Record<string, unknown> {
						return {};
					}
				}
				Reflect.defineMetadata(CONTEXT_PARAMETER, [], EmptyMetaContext);

				// ACT & ASSERT
				expect(() => {
					ContextFactory.read(EmptyMetaContext, mockFunctions, mockTracer);
				}).toThrow('Bug detected');

				expect(mockTracer.bugDetected).toHaveBeenCalledWith(
					'EmptyMetaContext',
					'No mapping metadata. Apply @mapTo decorator to all constructor parameters.',
				);
			});

			it('[EH-03] should throw if no paramtypes metadata (tsconfig issue)', () => {
				// ARRANGE
				class NoParamTypesContext implements IContext {
					constructor(@mapTo('param') readonly param: string) {}
					throwIfInvalid(): void {}
					asLogMetadata(): Record<string, unknown> {
						return {};
					}
				}
				Reflect.deleteMetadata('design:paramtypes', NoParamTypesContext);

				// ACT & ASSERT
				expect(() => {
					ContextFactory.read(NoParamTypesContext, mockFunctions, mockTracer);
				}).toThrow('Bug detected');

				expect(mockTracer.bugDetected).toHaveBeenCalledWith(
					'NoParamTypesContext',
					"No type metadata found. Ensure 'emitDecoratorMetadata' is enabled in tsconfig.json.",
				);
			});

			it('[EH-04] should throw if paramtypes array is empty', () => {
				// ARRANGE
				class EmptyParamTypesContext implements IContext {
					constructor(@mapTo('param') readonly param: string) {}
					throwIfInvalid(): void {}
					asLogMetadata(): Record<string, unknown> {
						return {};
					}
				}
				Reflect.defineMetadata('design:paramtypes', [], EmptyParamTypesContext);

				// ACT & ASSERT
				expect(() => {
					ContextFactory.read(EmptyParamTypesContext, mockFunctions, mockTracer);
				}).toThrow('Bug detected');

				expect(mockTracer.bugDetected).toHaveBeenCalledWith(
					'EmptyParamTypesContext',
					"No type metadata found. Ensure 'emitDecoratorMetadata' is enabled in tsconfig.json.",
				);
			});

			it('[EH-05] should throw if metadata and paramtypes length mismatch', () => {
				// ARRANGE - PartialDecoratorContext has 2 params but only 1 decorated
				// We need to ensure the metadata has only 1 entry
				const existingMeta = Reflect.getMetadata(CONTEXT_PARAMETER, PartialDecoratorContext) as string[] | undefined;
				if (!existingMeta || existingMeta.length !== 1) {
					// Force the metadata to have only 1 entry
					Reflect.defineMetadata(CONTEXT_PARAMETER, ['param1'], PartialDecoratorContext);
				}

				// ACT & ASSERT
				expect(() => {
					ContextFactory.read(PartialDecoratorContext, mockFunctions, mockTracer);
				}).toThrow('Bug detected');

				expect(mockTracer.bugDetected).toHaveBeenCalledWith('PartialDecoratorContext', expect.stringContaining('Partial metadata mapping'));
			});

			it('[EH-06] should enrich validation errors with context metadata', () => {
				// ARRANGE
				(mockFunctions.getNodeParameter as jest.Mock).mockImplementation((key: string) => {
					if (key === 'value') return 999;
					throw new Error('Not found');
				});

				// ACT & ASSERT
				expect(() => {
					ContextFactory.read(InvalidContext, mockFunctions, mockTracer);
				}).toThrow('Bug detected');

				expect(mockTracer.bugDetected).toHaveBeenCalledWith('InvalidContext', expect.any(Error), expect.objectContaining({ value: 999 }));
			});

			it('[EH-07] should call tracer.bugDetected for metadata errors', () => {
				// ARRANGE
				Reflect.deleteMetadata('intento:context_parameter', NoDecoratorContext);

				// ACT & ASSERT
				expect(() => {
					ContextFactory.read(NoDecoratorContext, mockFunctions, mockTracer);
				}).toThrow();

				expect(mockTracer.bugDetected).toHaveBeenCalled();
			});

			it('[EH-08] should call tracer.bugDetected for validation failures', () => {
				// ARRANGE
				(mockFunctions.getNodeParameter as jest.Mock).mockImplementation((key: string) => {
					if (key === 'value') return 123;
					throw new Error('Not found');
				});

				// ACT & ASSERT
				expect(() => {
					ContextFactory.read(InvalidContext, mockFunctions, mockTracer);
				}).toThrow();

				expect(mockTracer.bugDetected).toHaveBeenCalledWith('InvalidContext', expect.any(Error), expect.any(Object));
			});

			it('[EH-09] should catch and handle getNodeParameter exceptions', () => {
				// ARRANGE
				(mockFunctions.getNodeParameter as jest.Mock).mockImplementation(() => {
					throw new Error('Network error');
				});

				// ACT
				const context = ContextFactory.read(UndefinedParamContext, mockFunctions, mockTracer);

				// ASSERT
				expect(context.missing).toBeUndefined();
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining('has not been fetched'));
			});
		});
	});
});
