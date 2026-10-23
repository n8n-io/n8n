import { N8nIcon } from '@n8n/design-system';
import { render } from '@testing-library/vue';

/**
 * A build-config test, not a feature test. `@n8n/design-system` is consumed from source, so its
 * two icon mechanisms are this package's problem, and each package carries its own
 * `vite.config.ts`. Both cases fail loudly when a plugin goes missing from that file:
 *
 *   - `box` comes from `~icons/lucide/box`, which only `unplugin-icons` resolves.
 *   - `webhook` comes from `custom/webhook.svg`, which only `svgLoader` turns into a component.
 *     Without it the import is a data-URI string, which Vue renders as a tag name.
 *
 * Keep this test while the module renders any design-system component.
 */
describe('design-system icons', () => {
	it.each([
		['a lucide icon', 'box'],
		['a custom svg icon', 'webhook'],
	])('renders %s', (_case, icon) => {
		const { container } = render(N8nIcon, { props: { icon } });

		expect(container.querySelector('svg')).not.toBeNull();
	});
});
