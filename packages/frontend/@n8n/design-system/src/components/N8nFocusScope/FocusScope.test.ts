import { render, waitFor } from '@testing-library/vue';
import { nextTick } from 'vue';

import N8nFocusScope from './FocusScope.vue';

describe('N8nFocusScope', () => {
	it('renders slot content', () => {
		const { getByText } = render(N8nFocusScope, {
			slots: {
				default: '<button type="button">Inside scope</button>',
			},
		});

		expect(getByText('Inside scope')).toBeInTheDocument();
	});

	it('forwards mountAutoFocus from the reka primitive', async () => {
		const onMountAutoFocus = vi.fn((event: Event) => event.preventDefault());
		render(N8nFocusScope, {
			props: {
				onMountAutoFocus,
			},
			slots: {
				default: '<button type="button">Focus target</button>',
			},
		});

		await waitFor(() => {
			expect(onMountAutoFocus).toHaveBeenCalled();
		});
	});

	it('keeps focus inside the scope when trapped', async () => {
		const { getByRole } = render({
			components: { N8nFocusScope },
			template: `
				<div>
					<button type="button">Outside</button>
					<N8nFocusScope trapped>
						<button type="button">Inside</button>
					</N8nFocusScope>
				</div>
			`,
		});

		const inside = getByRole('button', { name: 'Inside' });
		const outside = getByRole('button', { name: 'Outside' });

		inside.focus();
		await nextTick();
		expect(document.activeElement).toBe(inside);

		outside.focus();
		await nextTick();
		expect(document.activeElement).toBe(inside);
	});
});
