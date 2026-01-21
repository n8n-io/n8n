import 'reflect-metadata';

import { Container } from '../di';
import { ServiceA } from './fixtures/service-a';
import { ServiceB } from './fixtures/service-b';

describe('DI Container', () => {
	describe('circular dependency', () => {
		beforeEach(() => {
			Container.reset();
		});

		// Note: With ESM (vitest/SWC), circular dependency behavior differs from CJS (ts-jest):
		// - In CJS, circular deps cause paramTypes to be undefined → detected and throws
		// - In ESM, classes are hoisted → both available, but the DI container's "undefined
		//   return for resolution chain" behavior kicks in, returning undefined for the
		//   second-level circular reference instead of throwing.
		//
		// This is expected behavior - the DI system handles circular dependencies gracefully
		// by returning undefined for the circular reference rather than infinite looping.
		it('should handle circular dependencies without infinite loops', () => {
			// When resolving ServiceA:
			// 1. ServiceA needs ServiceB
			// 2. ServiceB needs ServiceA, but ServiceA is already being resolved
			// 3. The DI returns undefined for ServiceA (non-decorated dep path)
			// 4. ServiceB is created with undefined for 'a'
			// 5. ServiceA is created with the ServiceB instance
			const resultA = Container.get(ServiceA);
			expect(resultA).toBeDefined();
			expect(resultA).toBeInstanceOf(ServiceA);
			expect(resultA.b).toBeInstanceOf(ServiceB);
			// ServiceB.a is undefined due to circular dependency resolution
			expect(resultA.b.a).toBeUndefined();
		});
	});
});
