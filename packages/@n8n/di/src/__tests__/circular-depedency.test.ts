import 'reflect-metadata';
import { Container, Service } from '../di';

describe('DI Container', () => {
	beforeEach(() => {
		Container.reset();
	});

	describe('circular dependency', () => {
		it('should detect multilevel circular dependencies', () => {
			@Service()
			class CycleA {}

			@Service()
			class CycleB {}

			Reflect.defineMetadata('design:paramtypes', [CycleB], CycleA);
			Reflect.defineMetadata('design:paramtypes', [CycleA], CycleB);

			expect(() => Container.get(CycleA)).toThrow(
				'[DI] Circular dependency detected: CycleA -> CycleB -> CycleA',
			);
		});

		it('should detect a self-referential cycle', () => {
			@Service()
			class SelfCycle {}

			Reflect.defineMetadata('design:paramtypes', [SelfCycle], SelfCycle);

			expect(() => Container.get(SelfCycle)).toThrow(
				'[DI] Circular dependency detected: SelfCycle -> SelfCycle',
			);
		});
	});
});
