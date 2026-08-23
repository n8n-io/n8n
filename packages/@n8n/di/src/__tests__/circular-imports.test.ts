import { Container } from '../di';
import { ServiceA } from './fixtures/service-a';
import { ServiceB } from './fixtures/service-b';

describe('DI Container - circular imports between @Service files', () => {
	beforeEach(() => {
		Container.reset();
	});

	// Smoke test for two `@Service`-decorated files that import each other.
	// At decoration time, one side's constructor paramtype is unresolved and the
	// compiler emits `Object` as a fallback. The container must not crash, loop,
	// or surface a confusing error — it should degrade gracefully by passing
	// `undefined` for the forward-referenced dependency.
	it('should resolve without throwing, leaving the forward-ref undefined', () => {
		const a = Container.get(ServiceA);

		expect(a).toBeInstanceOf(ServiceA);
		expect(a.b).toBeInstanceOf(ServiceB);
		expect(a.b.a).toBeUndefined();
	});

	it('should resolve the forward-referenced service directly with an undefined dependency', () => {
		const b = Container.get(ServiceB);

		expect(b).toBeInstanceOf(ServiceB);
		expect(b.a).toBeUndefined();
	});
});
