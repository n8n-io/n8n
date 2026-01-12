import 'reflect-metadata';

import { mock } from 'jest-mock-extended';

import type { IFunctions } from 'types/*';

import type { Tracer } from '../../tracing/tracer';
import type { IContext } from '../../types/i-context';
import { ContextFactory, CONTEXT_PARAMETER, mapTo } from '../context-factory';

/**
 * Tests for ContextFactory
 * @author Claude Sonnet 4.5
 * @date 2026-01-11
 */

// Test context implementations
class SimpleContext implements IContext {
	constructor(
		public value1: string,
		public value2: number,
	) {}

	throwIfInvalid(): void {}

	asLogMetadata(): Record<string, unknown> {
		return { value1: this.value1, value2: this.value2 };
	}
}

class InvalidContext implements IContext {
	constructor(public value: string) {}

	throwIfInvalid(): void {
		throw new Error('Validation failed');
	}

	asLogMetadata(): Record<string, unknown> {
		return { value: this.value };
	}
}

class ThreeParamContext implements IContext {
	constructor(
		public param1: string,
		public param2: number,
		public param3: boolean,
	) {}

	throwIfInvalid(): void {}

	asLogMetadata(): Record<string, unknown> {
		return { param1: this.param1, param2: this.param2, param3: this.param3 };
	}
}

describe('CONTEXT_PARAMETER', () => {
	describe('business logic', () => {
		it('[BL-01] should export unique Symbol', () => {
			// ASSERT
			expect(typeof CONTEXT_PARAMETER).toBe('symbol');
			expect(CONTEXT_PARAMETER).toBe(CONTEXT_PARAMETER);
			expect(CONTEXT_PARAMETER).not.toBe(Symbol('intento:context_parameter'));
		});
	});
});

describe('mapTo', () => {
	let getMetadataSpy: jest.SpyInstance;
	let defineMetadataSpy: jest.SpyInstance;

	beforeEach(() => {
		getMetadataSpy = jest.spyOn(Reflect, 'getMetadata');
		defineMetadataSpy = jest.spyOn(Reflect, 'defineMetadata');
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('business logic', () => {
		it('[BL-02] should store flat parameter mapping', () => {
			// ARRANGE
			getMetadataSpy.mockReturnValue(undefined);
			const decorator = mapTo('test_key');
			const target = {};

			// ACT
			decorator(target, undefined, 0);

			// ASSERT
			expect(defineMetadataSpy).toHaveBeenCalledWith(CONTEXT_PARAMETER, ['test_key'], target);
		});

		it('[BL-03] should store collection parameter mapping', () => {
			// ARRANGE
			getMetadataSpy.mockReturnValue(undefined);
			const decorator = mapTo('nested_key', 'collection_name');
			const target = {};

			// ACT
			decorator(target, undefined, 0);

			// ASSERT
			expect(defineMetadataSpy).toHaveBeenCalledWith(CONTEXT_PARAMETER, ['collection_name.nested_key'], target);
		});

		it('[BL-04] should accumulate metadata for multiple parameters', () => {
			// ARRANGE
			getMetadataSpy.mockReturnValue(['existing_key']);
			const decorator = mapTo('new_key');
			const target = {};

			// ACT
			decorator(target, undefined, 0);

			// ASSERT
			expect(defineMetadataSpy).toHaveBeenCalledWith(CONTEXT_PARAMETER, ['new_key', 'existing_key'], target);
		});

		it('[BL-05] should preserve parameter order (left-to-right)', () => {
			// ARRANGE
			getMetadataSpy.mockReturnValueOnce(undefined).mockReturnValueOnce(['key1']);

			const decorator1 = mapTo('key1');
			const decorator2 = mapTo('key2');
			const target = {};

			// ACT - Decorators execute bottom-to-top
			decorator1(target, undefined, 0);
			decorator2(target, undefined, 1);

			// ASSERT
			expect(defineMetadataSpy).toHaveBeenNthCalledWith(1, CONTEXT_PARAMETER, ['key1'], target);
			expect(defineMetadataSpy).toHaveBeenNthCalledWith(2, CONTEXT_PARAMETER, ['key2', 'key1'], target);
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle missing existing metadata (first param)', () => {
			// ARRANGE
			getMetadataSpy.mockReturnValue(null);
			const decorator = mapTo('first_key');
			const target = {};

			// ACT
			decorator(target, undefined, 0);

			// ASSERT
			expect(defineMetadataSpy).toHaveBeenCalledWith(CONTEXT_PARAMETER, ['first_key'], target);
		});
	});
});

describe('ContextFactory', () => {
	let mockFunctions: ReturnType<typeof mock<IFunctions>>;
	let mockTracer: ReturnType<typeof mock<Tracer>>;
	let getMetadataSpy: jest.SpyInstance;

	beforeEach(() => {
		mockFunctions = mock<IFunctions>();
		mockTracer = mock<Tracer>();
		getMetadataSpy = jest.spyOn(Reflect, 'getMetadata');
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('read', () => {
		describe('business logic', () => {
			it('[BL-06] should create valid context from node parameters', () => {
				// ARRANGE
				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return ['key1', 'key2'];
					if (key === 'design:paramtypes') return [String, Number];
					return undefined;
				});

				(mockFunctions.getNodeParameter as jest.Mock).mockImplementation((key: string) => {
					if (key === 'key1') return 'test_value';
					if (key === 'key2') return 42;
					throw new Error('Parameter not found');
				});

				// ACT
				const result = ContextFactory.read(SimpleContext, mockFunctions, mockTracer);

				// ASSERT
				expect(result).toBeInstanceOf(SimpleContext);
				expect(result.value1).toBe('test_value');
				expect(result.value2).toBe(42);
			});

			it('[BL-07] should extract flat parameters correctly', () => {
				// ARRANGE
				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return ['flat_key'];
					if (key === 'design:paramtypes') return [String];
					return undefined;
				});

				(mockFunctions.getNodeParameter as jest.Mock).mockReturnValue('flat_value');

				// ACT
				ContextFactory.read(SimpleContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('flat_key', 0, undefined, { extractValue: true });
			});

			it('[BL-08] should extract collection parameters correctly', () => {
				// ARRANGE
				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return ['collection.nested_key'];
					if (key === 'design:paramtypes') return [String];
					return undefined;
				});

				(mockFunctions.getNodeParameter as jest.Mock).mockReturnValue('nested_value');

				// ACT
				ContextFactory.read(SimpleContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('collection.nested_key', 0, undefined, { extractValue: true });
			});

			it('[BL-09] should call throwIfInvalid on created instance', () => {
				// ARRANGE
				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return ['key'];
					if (key === 'design:paramtypes') return [String];
					return undefined;
				});

				(mockFunctions.getNodeParameter as jest.Mock).mockReturnValue('value');

				const throwIfInvalidSpy = jest.spyOn(SimpleContext.prototype, 'throwIfInvalid');

				// ACT
				ContextFactory.read(SimpleContext, mockFunctions, mockTracer);

				// ASSERT
				expect(throwIfInvalidSpy).toHaveBeenCalled();
			});

			it('[BL-10] should return validated context instance', () => {
				// ARRANGE
				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return ['key1', 'key2'];
					if (key === 'design:paramtypes') return [String, Number];
					return undefined;
				});

				(mockFunctions.getNodeParameter as jest.Mock).mockImplementation((key: string) => {
					if (key === 'key1') return 'value1';
					if (key === 'key2') return 123;
					throw new Error('Not found');
				});

				// ACT
				const result = ContextFactory.read(SimpleContext, mockFunctions, mockTracer);

				// ASSERT
				expect(result).toBeDefined();
				expect(result).toBeInstanceOf(SimpleContext);
				expect(result.value1).toBe('value1');
				expect(result.value2).toBe(123);
			});

			it('[BL-11] should log debug messages during creation', () => {
				// ARRANGE
				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return ['key'];
					if (key === 'design:paramtypes') return [String];
					return undefined;
				});

				(mockFunctions.getNodeParameter as jest.Mock).mockReturnValue('value');

				// ACT
				ContextFactory.read(SimpleContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining('Reading context'));
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining('created successfully'));
			});
		});

		describe('edge cases', () => {
			it('[EC-02] should use undefined for missing node parameters', () => {
				// ARRANGE
				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return ['missing_key'];
					if (key === 'design:paramtypes') return [String];
					return undefined;
				});

				(mockFunctions.getNodeParameter as jest.Mock).mockImplementation(() => {
					throw new Error('Parameter not found');
				});

				// ACT
				const result = ContextFactory.read(SimpleContext, mockFunctions, mockTracer);

				// ASSERT
				expect(result.value1).toBeUndefined();
			});

			it('[EC-03] should trigger default parameter values', () => {
				// ARRANGE
				class ContextWithDefaults implements IContext {
					constructor(public value: string = 'default_value') {}
					throwIfInvalid(): void {}
					asLogMetadata() {
						return { value: this.value };
					}
				}

				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return ['key'];
					if (key === 'design:paramtypes') return [String];
					return undefined;
				});

				(mockFunctions.getNodeParameter as jest.Mock).mockImplementation(() => {
					throw new Error('Not found');
				});

				// ACT
				const result = ContextFactory.read(ContextWithDefaults, mockFunctions, mockTracer);

				// ASSERT
				expect(result.value).toBe('default_value');
			});

			it('[EC-04] should handle 3+ parameters in correct order', () => {
				// ARRANGE
				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return ['key1', 'key2', 'key3'];
					if (key === 'design:paramtypes') return [String, Number, Boolean];
					return undefined;
				});

				(mockFunctions.getNodeParameter as jest.Mock).mockImplementation((key: string) => {
					if (key === 'key1') return 'first';
					if (key === 'key2') return 42;
					if (key === 'key3') return true;
					throw new Error('Not found');
				});

				// ACT
				const result = ContextFactory.read(ThreeParamContext, mockFunctions, mockTracer);

				// ASSERT
				expect(result.param1).toBe('first');
				expect(result.param2).toBe(42);
				expect(result.param3).toBe(true);
			});
		});

		describe('error handling', () => {
			it('[EH-01] should call bugDetected if no metadata found', () => {
				// ARRANGE
				getMetadataSpy.mockReturnValue(undefined);

				// ACT
				ContextFactory.read(SimpleContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockTracer.bugDetected).toHaveBeenCalledWith('SimpleContext', expect.stringContaining('No mapping metadata'));
			});

			it('[EH-02] should call bugDetected if metadata not array', () => {
				// ARRANGE
				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return 'not_an_array';
					if (key === 'design:paramtypes') return [String];
					return undefined;
				});

				// ACT & ASSERT
				expect(() => ContextFactory.read(SimpleContext, mockFunctions, mockTracer)).toThrow();
				expect(mockTracer.bugDetected).toHaveBeenCalledWith('SimpleContext', expect.stringContaining('No mapping metadata'));
			});

			it('[EH-03] should call bugDetected if metadata length zero', () => {
				// ARRANGE
				getMetadataSpy.mockReturnValue([]);

				// ACT
				ContextFactory.read(SimpleContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockTracer.bugDetected).toHaveBeenCalledWith('SimpleContext', expect.stringContaining('No mapping metadata'));
			});

			it('[EH-04] should call bugDetected if no type metadata', () => {
				// ARRANGE
				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return ['key'];
					if (key === 'design:paramtypes') return undefined;
					return undefined;
				});

				// ACT
				ContextFactory.read(SimpleContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockTracer.bugDetected).toHaveBeenCalledWith('SimpleContext', expect.stringContaining('No type metadata found'));
			});

			it('[EH-05] should call bugDetected if type metadata not array', () => {
				// ARRANGE
				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return ['key'];
					if (key === 'design:paramtypes') return 'not_an_array';
					return undefined;
				});

				// ACT
				ContextFactory.read(SimpleContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockTracer.bugDetected).toHaveBeenCalledWith('SimpleContext', expect.stringContaining('No type metadata found'));
			});

			it('[EH-06] should call bugDetected if paramTypes length zero', () => {
				// ARRANGE
				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return ['key'];
					if (key === 'design:paramtypes') return [];
					return undefined;
				});

				// ACT
				ContextFactory.read(SimpleContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockTracer.bugDetected).toHaveBeenCalledWith('SimpleContext', expect.stringContaining('No type metadata found'));
			});

			it('[EH-07] should call bugDetected if metadata/paramTypes mismatch', () => {
				// ARRANGE
				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return ['key1', 'key2'];
					if (key === 'design:paramtypes') return [String];
					return undefined;
				});

				// ACT
				ContextFactory.read(SimpleContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockTracer.bugDetected).toHaveBeenCalledWith('SimpleContext', expect.stringContaining('Partial metadata mapping'));
			});

			it('[EH-08] should call bugDetected on context validation failure', () => {
				// ARRANGE
				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return ['key'];
					if (key === 'design:paramtypes') return [String];
					return undefined;
				});

				(mockFunctions.getNodeParameter as jest.Mock).mockReturnValue('value');

				// ACT
				ContextFactory.read(InvalidContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockTracer.bugDetected).toHaveBeenCalledWith('InvalidContext', expect.any(Error), expect.any(Object));
			});

			it('[EH-09] should include context metadata in bugDetected call', () => {
				// ARRANGE
				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return ['key'];
					if (key === 'design:paramtypes') return [String];
					return undefined;
				});

				(mockFunctions.getNodeParameter as jest.Mock).mockReturnValue('test_value');

				// ACT
				ContextFactory.read(InvalidContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockTracer.bugDetected).toHaveBeenCalledWith('InvalidContext', expect.any(Error), { value: 'test_value' });
			});
		});
	});

	describe('getNodeParameter', () => {
		describe('business logic', () => {
			it('[BL-12] should extract parameter with extractValue option', () => {
				// ARRANGE
				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return ['test_key'];
					if (key === 'design:paramtypes') return [String];
					return undefined;
				});

				(mockFunctions.getNodeParameter as jest.Mock).mockReturnValue('test_value');

				// ACT
				ContextFactory.read(SimpleContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('test_key', 0, undefined, { extractValue: true });
			});

			it('[BL-13] should return parameter value on success', () => {
				// ARRANGE
				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return ['key'];
					if (key === 'design:paramtypes') return [String];
					return undefined;
				});

				(mockFunctions.getNodeParameter as jest.Mock).mockReturnValue('expected_value');

				// ACT
				const result = ContextFactory.read(SimpleContext, mockFunctions, mockTracer);

				// ASSERT
				expect(result.value1).toBe('expected_value');
			});

			it('[BL-14] should log debug on successful fetch', () => {
				// ARRANGE
				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return ['key'];
					if (key === 'design:paramtypes') return [String];
					return undefined;
				});

				(mockFunctions.getNodeParameter as jest.Mock).mockReturnValue('value');

				// ACT
				ContextFactory.read(SimpleContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining('Fetching node parameter'));
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining('has been fetched'));
			});
		});

		describe('edge cases', () => {
			it('[EC-05] should return undefined when parameter missing', () => {
				// ARRANGE
				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return ['missing_key'];
					if (key === 'design:paramtypes') return [String];
					return undefined;
				});

				(mockFunctions.getNodeParameter as jest.Mock).mockImplementation(() => {
					throw new Error('Parameter not found');
				});

				// ACT
				const result = ContextFactory.read(SimpleContext, mockFunctions, mockTracer);

				// ASSERT
				expect(result.value1).toBeUndefined();
			});

			it('[EC-06] should log debug on fetch failure', () => {
				// ARRANGE
				getMetadataSpy.mockImplementation((key) => {
					if (key === CONTEXT_PARAMETER) return ['missing_key'];
					if (key === 'design:paramtypes') return [String];
					return undefined;
				});

				(mockFunctions.getNodeParameter as jest.Mock).mockImplementation(() => {
					throw new Error('Parameter not found');
				});

				// ACT
				ContextFactory.read(SimpleContext, mockFunctions, mockTracer);

				// ASSERT
				expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining('has not been fetched'));
			});
		});
	});
});
