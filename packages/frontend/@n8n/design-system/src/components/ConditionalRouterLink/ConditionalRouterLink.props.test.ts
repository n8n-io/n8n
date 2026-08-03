import { describe, expect, it } from 'vitest';
import { RouterLink } from 'vue-router';

import ConditionalRouterLink from './CondtionalRouterLink.vue';

/**
 * These props used to be spread from `RouterLink.props`, which kept them in sync
 * automatically. They are declared by hand now, so the mirror needs a guard:
 * both failure modes below are silent — typecheck, lint and the render tests all
 * stay green while prop validation quietly disappears.
 */
describe('ConditionalRouterLink prop declarations', () => {
	const props = (ConditionalRouterLink as unknown as { props: Record<string, unknown> }).props;
	// `RouterLink`'s public type does not expose `props`, hence the cast.
	const routerLinkProps = (
		RouterLink as unknown as { props: Record<string, { required?: boolean }> }
	).props;

	it('declares every prop RouterLink declares', () => {
		expect(Object.keys(props).sort()).toEqual(Object.keys(routerLinkProps).sort());
	});

	it('gives `to` a runtime type', () => {
		// `RouteLocationRaw` is a conditional type, which Vue's compile-time resolver
		// cannot evaluate — writing `to?: RouterLinkProps['to']` emits no type at all.
		expect((props.to as { type: unknown[] }).type).toEqual([String, Object]);
	});

	it('keeps `to` optional, unlike RouterLink', () => {
		expect((props.to as { required?: boolean }).required).not.toBe(true);
		expect(routerLinkProps.to.required).toBe(true);
	});
});
