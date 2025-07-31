import { Container } from '../di';
import { ServiceA } from './fixtures/service-a';
import { ServiceB } from './fixtures/service-b';

describe('DI Container', () => {
	describe('circular dependency', () => {
		it('should detect multilevel circular dependencies', () => {
			expect(() => Container.get(ServiceA)).toThrow(
				'[DI] Circular dependency detected in ServiceB at index 0.\nServiceA -> ServiceB',
			);

			expect(() => Container.get(ServiceB)).toThrow(
				'[DI] Circular dependency detected in ServiceB at index 0.\nServiceB',
			);
		});
	});
});
