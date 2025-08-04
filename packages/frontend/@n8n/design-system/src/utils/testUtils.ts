const DYNAMIC_ATTRIBUTES = ['aria-controls'];

/**
 * Deletes dynamic attributes from the container children so snapshots can be tested.
 *
 * Background:
 * 	Vue test utils use server rendering to render components (https://v1.test-utils.vuejs.org/api/render.html#render).
 * 	Element UI in SSR mode adds dynamic attributes to the rendered HTML each time the test is run (https://element-plus.org/en-US/guide/ssr#provide-an-id).
 *
 * NOTE: Make sure to manually remove same attributes from the expected snapshot.
 */
// TODO: Find a way to inject static value for dynamic attributes in tests
export function removeDynamicAttributes(container: Element): void {
	DYNAMIC_ATTRIBUTES.forEach((attribute) => {
		const elements = container.querySelectorAll(`[${attribute}]`);
		elements.forEach((element) => element.removeAttribute(attribute));
	});
}
