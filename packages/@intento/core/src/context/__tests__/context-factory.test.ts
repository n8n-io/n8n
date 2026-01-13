import 'reflect-metadata';

import { mock } from 'jest-mock-extended';
import type { INode, LogMetadata } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { Tracer } from '../../tracing/tracer';
import type { IContext } from '../../types/i-context';
import type { IFunctions } from '../../types/i-functions';
import { CONTEXT_PARAMETER, ContextFactory, mapTo } from '../context-factory';

/**
 * Tests for ContextFactory
 * @author Claude Sonnet 4.5
 * @date 2026-01-13
 */

describe('ContextFactory', () => {
	let mockTracer: Tracer;
	let mockFunctions: IFunctions;
	let mockNode: INode;

	beforeEach(() => {
		mockNode = mock<INode>({ name: 'TestNode' });
		mockTracer = mock<Tracer>();
		mockFunctions = mock<IFunctions>();

		// Setup tracer mocks
		mockTracer.debug = jest.fn();
		mockTracer.info = jest.fn();
		mockTracer.bugDetected = jest.fn((where: string, error: string): never => {
			throw new NodeOperationError(mockNode, `Bug detected at '${where}': ${error}`);
		}) as jest.MockedFunction<(where: string, error: string, extension?: LogMetadata) => never>;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('mapTo() decorator', () => {
		describe('business logic', () => {
			it('[BL-01] should store parameter key in metadata', () => {
				// ARRANGE & ACT
				class TestContext {
					constructor(@mapTo('testKey') _param: string) {}
				}

				// ASSERT
				const metadata = Reflect.getMetadata(CONTEXT_PARAMETER, TestContext) as string[];
				expect(metadata).toEqual(['testKey']);
			});

			it('[BL-02] should accumulate metadata for multiple parameters', () => {
				// ARRANGE & ACT
				class TestContext {
					constructor(@mapTo('param1') _p1: string, @mapTo('param2') _p2: number, @mapTo('param3') _p3: boolean) {}
				}

				// ASSERT
				const metadata = Reflect.getMetadata(CONTEXT_PARAMETER, TestContext) as string[];
				expect(metadata).toHaveLength(3);
				expect(metadata).toEqual(['param1', 'param2', 'param3']);
			});

			it('[BL-03] should support nested collection parameters', () => {
				// ARRANGE & ACT
				class TestContext {
					constructor(@mapTo('nested_key', 'parent_collection') _param: string) {}
				}

				// ASSERT
				const metadata = Reflect.getMetadata(CONTEXT_PARAMETER, TestContext) as string[];
				expect(metadata).toEqual(['parent_collection.nested_key']);
			});

			it('[BL-04] should support flat parameters without collection', () => {
				// ARRANGE & ACT
				class TestContext {
					constructor(@mapTo('flat_key') _param: string) {}
				}

				// ASSERT
				const metadata = Reflect.getMetadata(CONTEXT_PARAMETER, TestContext) as string[];
				expect(metadata).toEqual(['flat_key']);
			});
		});

		describe('edge cases', () => {
			it('[EC-01] should handle first parameter (no existing metadata)', () => {
				// ARRANGE & ACT
				class TestContext {
					constructor(@mapTo('firstParam') _param: string) {}
				}

				// ASSERT
				const metadata = Reflect.getMetadata(CONTEXT_PARAMETER, TestContext) as string[];
				expect(metadata).toBeDefined();
				expect(metadata).toEqual(['firstParam']);
			});

			it('[EC-02] should maintain left-to-right parameter order', () => {
				// ARRANGE & ACT - Decorators execute bottom-to-top, prepend maintains order
				class TestContext {
					constructor(@mapTo('first') _p1: string, @mapTo('second') _p2: string, @mapTo('third') _p3: string) {}
				}

				// ASSERT - Order should match constructor parameter order
				const metadata = Reflect.getMetadata(CONTEXT_PARAMETER, TestContext) as string[];
				expect(metadata).toEqual(['first', 'second', 'third']);
			});
		});

		describe('error handling', () => {
			it('[EH-01] should handle undefined _propertyKey parameter', () => {
				// ARRANGE & ACT - Parameter decorators receive undefined for propertyKey
				const decorator = mapTo('testKey');
				const target = {};

				// ASSERT - Should not throw
				expect(() => {
					decorator(target, undefined, 0);
				}).not.toThrow();
			});
		});
	});

	describe('ContextFactory.read()', () => {
		describe('business logic', () => {
			it('[BL-05] should create valid context with all parameters', () => {
				// ARRANGE
				mockFunctions.getNodeParameter = jest.fn((key: string) => {
					if (key === 'param1') return 'value1';
					if (key === 'param2') return 42;
					return undefined;
				}) as unknown as IFunctions['getNodeParameter'];

				// ACT
				const context = ContextFactory.read(TestContextMultiParam, mockFunctions, mockTracer);

				// ASSERT
				expect(context.param1).toBe('value1');
				expect(context.param2).toBe(42);
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining('Reading context') as string);
				expect(mockTracer.info).toHaveBeenCalledWith(expect.stringContaining('created successfully') as string);
			});

			it('[BL-06] should extract parameters in correct order', () => {
				// ARRANGE
				const extractedKeys: string[] = [];
				mockFunctions.getNodeParameter = jest.fn((key: string) => {
					extractedKeys.push(key);
					return key === 'param1' ? 'value1' : 42;
				}) as unknown as IFunctions['getNodeParameter'];

				// ACT
				ContextFactory.read(TestContextMultiParam, mockFunctions, mockTracer);

				// ASSERT - Parameters extracted in constructor order
				expect(extractedKeys).toEqual(['param1', 'param2']);
			});

			it('[BL-07] should call throwIfInvalid after instantiation', () => {
				// ARRANGE
				mockFunctions.getNodeParameter = jest.fn(() => '') as unknown as IFunctions['getNodeParameter'];
				const throwIfInvalidSpy = jest.spyOn(TestContextValidation.prototype, 'throwIfInvalid');

				// ACT & ASSERT
				expect(() => {
					ContextFactory.read(TestContextValidation, mockFunctions, mockTracer);
				}).toThrow('Validation failed');

				expect(throwIfInvalidSpy).toHaveBeenCalled();
				throwIfInvalidSpy.mockRestore();
			});

			it('[BL-08] should log debug messages during extraction', () => {
				// ARRANGE
				mockFunctions.getNodeParameter = jest.fn(() => 'value') as unknown as IFunctions['getNodeParameter'];

				// ACT
				ContextFactory.read(TestContextSingleParam, mockFunctions, mockTracer);

				// ASSERT
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining('Reading context') as string);
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining('Fetching node parameter') as string);
			});

			it('[BL-09] should log info on successful creation', () => {
				// ARRANGE
				mockFunctions.getNodeParameter = jest.fn(() => 'value') as unknown as IFunctions['getNodeParameter'];

				// ACT
				ContextFactory.read(TestContextSingleParam, mockFunctions, mockTracer);

				// ASSERT
				expect(mockTracer.info).toHaveBeenCalledWith(expect.stringContaining('Valid context') as string);
				expect(mockTracer.info).toHaveBeenCalledWith(expect.stringContaining('created successfully') as string);
			});
		});

		describe('edge cases', () => {
			it('[EC-03] should handle context with optional parameters', () => {
				// ARRANGE
				mockFunctions.getNodeParameter = jest.fn((key: string) => {
					if (key === 'required') return 'value';
					throw new Error('Parameter not found');
				}) as unknown as IFunctions['getNodeParameter'];

				// ACT
				const context = ContextFactory.read(TestContextOptional, mockFunctions, mockTracer);

				// ASSERT
				expect(context.required).toBe('value');
				expect(context.optional).toBeUndefined();
			});

			it('[EC-04] should handle context with default parameter values', () => {
				// ARRANGE
				mockFunctions.getNodeParameter = jest.fn(() => {
					throw new Error('Parameter not found');
				});

				// ACT
				const context = ContextFactory.read(TestContextWithDefaults, mockFunctions, mockTracer);

				// ASSERT - Defaults should apply when undefined returned
				expect(context.paramWithDefault).toBe('default');
			});
		});

		describe('error handling', () => {
			it('[EH-02] should throw if no metadata found', () => {
				// ARRANGE
				class NoDecoratorContext implements IContext {
					constructor(_param: string) {}
					throwIfInvalid(): void {}
					asLogMetadata(): LogMetadata {
						return {};
					}
				}

				// ACT & ASSERT
				expect(() => {
					ContextFactory.read(NoDecoratorContext, mockFunctions, mockTracer);
				}).toThrow('Bug detected');
				expect(mockTracer.bugDetected).toHaveBeenCalledWith('NoDecoratorContext', expect.stringContaining('No mapping metadata') as string);
			});

			it('[EH-03] should throw if metadata array is empty', () => {
				// ARRANGE
				class EmptyMetadataContext implements IContext {
					constructor(_param: string) {}
					throwIfInvalid(): void {}
					asLogMetadata(): LogMetadata {
						return {};
					}
				}
				Reflect.defineMetadata(CONTEXT_PARAMETER, [], EmptyMetadataContext);

				// ACT & ASSERT
				expect(() => {
					ContextFactory.read(EmptyMetadataContext, mockFunctions, mockTracer);
				}).toThrow('Bug detected');
				expect(mockTracer.bugDetected).toHaveBeenCalledWith(
					'EmptyMetadataContext',
					expect.stringContaining('No mapping metadata') as string,
				);
			});

			it('[EH-04] should throw if paramTypes not found', () => {
				// ARRANGE
				class NoParamTypesContext implements IContext {
					constructor(@mapTo('param') _param: string) {}
					throwIfInvalid(): void {}
					asLogMetadata(): LogMetadata {
						return {};
					}
				}
				// Clear design:paramtypes metadata to simulate missing emitDecoratorMetadata
				Reflect.deleteMetadata('design:paramtypes', NoParamTypesContext);

				// ACT & ASSERT
				expect(() => {
					ContextFactory.read(NoParamTypesContext, mockFunctions, mockTracer);
				}).toThrow('Bug detected');
				expect(mockTracer.bugDetected).toHaveBeenCalledWith(
					'NoParamTypesContext',
					expect.stringContaining('No type metadata found') as string,
				);
			});

			it('[EH-05] should throw if paramTypes array is empty', () => {
				// ARRANGE
				class EmptyParamTypesContext implements IContext {
					constructor(@mapTo('param') _param: string) {}
					throwIfInvalid(): void {}
					asLogMetadata(): LogMetadata {
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
					expect.stringContaining('No type metadata found') as string,
				);
			});

			it('[EH-06] should throw if metadata count mismatches params', () => {
				// ARRANGE
				class MismatchContext implements IContext {
					constructor(@mapTo('param1') _p1: string, _p2: string) {}
					throwIfInvalid(): void {}
					asLogMetadata(): LogMetadata {
						return {};
					}
				}

				// ACT & ASSERT - One param has decorator, one doesn't
				expect(() => {
					ContextFactory.read(MismatchContext, mockFunctions, mockTracer);
				}).toThrow('Bug detected');
				expect(mockTracer.bugDetected).toHaveBeenCalledWith(
					'MismatchContext',
					expect.stringContaining('Partial metadata mapping') as string,
				);
			});

			it('[EH-07] should throw if context validation fails', () => {
				// ARRANGE
				mockFunctions.getNodeParameter = jest.fn(() => '') as unknown as IFunctions['getNodeParameter'];

				// ACT & ASSERT
				expect(() => {
					ContextFactory.read(TestContextValidation, mockFunctions, mockTracer);
				}).toThrow('Validation failed');
			});
		});
	});

	describe('ContextFactory.getNodeParameter()', () => {
		describe('business logic', () => {
			it('[BL-10] should extract parameter value with extractValue option', () => {
				// ARRANGE
				mockFunctions.getNodeParameter = jest.fn(() => 'extractedValue') as unknown as IFunctions['getNodeParameter'];

				// ACT
				ContextFactory.read(TestContextSingleParam, mockFunctions, mockTracer);

				// ASSERT
				expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('param1', 0, undefined, {
					extractValue: true,
				});
			});

			it('[BL-11] should log debug before and after extraction', () => {
				// ARRANGE
				mockFunctions.getNodeParameter = jest.fn(() => 'value') as unknown as IFunctions['getNodeParameter'];

				// ACT
				ContextFactory.read(TestContextSingleParam, mockFunctions, mockTracer);

				// ASSERT
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining('Fetching node parameter') as string);
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining('has been fetched') as string);
			});
		});

		describe('edge cases', () => {
			it('[EC-05] should return undefined for missing parameter', () => {
				// ARRANGE
				mockFunctions.getNodeParameter = jest.fn((key: string) => {
					if (key === 'required') return 'value';
					throw new Error('Parameter not found');
				}) as unknown as IFunctions['getNodeParameter'];

				// ACT
				const context = ContextFactory.read(TestContextOptional, mockFunctions, mockTracer);

				// ASSERT
				expect(context.optional).toBeUndefined();
			});

			it('[EC-06] should handle dot notation for nested parameters', () => {
				// ARRANGE
				mockFunctions.getNodeParameter = jest.fn(() => 'nestedValue') as unknown as IFunctions['getNodeParameter'];

				// ACT
				ContextFactory.read(TestContextWithCollection, mockFunctions, mockTracer);

				// ASSERT
				expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('collection.nestedParam', 0, undefined, { extractValue: true });
			});
		});

		describe('error handling', () => {
			it('[EH-08] should catch and log parameter extraction failure', () => {
				// ARRANGE
				const error = new Error('Extraction failed');
				mockFunctions.getNodeParameter = jest.fn(() => {
					throw error;
				});

				// ACT
				const context = ContextFactory.read(TestContextOptional, mockFunctions, mockTracer);

				// ASSERT - Should not throw, returns undefined instead
				expect(context.required).toBeUndefined();
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining('has not been fetched') as string);
			});
		});
	});
});

// Test Context Classes - Defined at module level so decorators execute once
class TestContextSingleParam implements IContext {
	constructor(@mapTo('param1') readonly param1: string) {
		Object.freeze(this);
	}
	throwIfInvalid(): void {}
	asLogMetadata(): LogMetadata {
		return { param1: this.param1 };
	}
}

class TestContextMultiParam implements IContext {
	constructor(
		@mapTo('param1') readonly param1: string,
		@mapTo('param2') readonly param2: number,
	) {
		Object.freeze(this);
	}
	throwIfInvalid(): void {}
	asLogMetadata(): LogMetadata {
		return { param1: this.param1, param2: this.param2 };
	}
}

class TestContextWithCollection implements IContext {
	constructor(@mapTo('nestedParam', 'collection') readonly nestedParam: string) {
		Object.freeze(this);
	}
	throwIfInvalid(): void {}
	asLogMetadata(): LogMetadata {
		return { nestedParam: this.nestedParam };
	}
}

class TestContextOptional implements IContext {
	constructor(
		@mapTo('required') readonly required: string,
		@mapTo('optional') readonly optional?: string,
	) {
		Object.freeze(this);
	}
	throwIfInvalid(): void {}
	asLogMetadata(): LogMetadata {
		return { required: this.required, optional: this.optional };
	}
}

class TestContextWithDefaults implements IContext {
	constructor(@mapTo('paramWithDefault') readonly paramWithDefault: string = 'default') {
		Object.freeze(this);
	}
	throwIfInvalid(): void {}
	asLogMetadata(): LogMetadata {
		return { paramWithDefault: this.paramWithDefault };
	}
}

class TestContextValidation implements IContext {
	constructor(@mapTo('param') readonly param: string) {
		Object.freeze(this);
	}
	throwIfInvalid(): void {
		if (!this.param) throw new Error('Validation failed');
	}
	asLogMetadata(): LogMetadata {
		return { param: this.param };
	}
}
