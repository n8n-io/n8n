import { createComponentRenderer } from '@/__tests__/render';
import { fireEvent } from '@testing-library/vue';
import { ref } from 'vue';

import CredentialUsabilityFilter from './CredentialUsabilityFilter.vue';
import type { CredentialTypeUsabilityReason } from '../composables/useCredentialTypeUsability';

const renderComponent = createComponentRenderer(CredentialUsabilityFilter);

function render(initial: CredentialTypeUsabilityReason[] = []) {
	const selected = ref(initial);
	const result = renderComponent({
		props: {
			modelValue: selected.value,
			'onUpdate:modelValue': (value: CredentialTypeUsabilityReason[]) => {
				selected.value = value;
				void result.rerender({ modelValue: value });
			},
		},
	});
	return { ...result, selected };
}

describe('CredentialUsabilityFilter', () => {
	it('selects every reason from the parent checkbox', async () => {
		const { getByTestId, selected } = render();

		await fireEvent.click(getByTestId('credential-filter-cannot-be-used-all'));

		expect(selected.value).toEqual(['typeRestricted', 'nodesRestricted']);
	});

	it('clears every reason from the parent checkbox when all are selected', async () => {
		const { getByTestId, selected } = render(['typeRestricted', 'nodesRestricted']);

		await fireEvent.click(getByTestId('credential-filter-cannot-be-used-all'));

		expect(selected.value).toEqual([]);
	});

	it('toggles one reason and keeps the canonical order', async () => {
		const { getByTestId, selected } = render(['nodesRestricted']);

		await fireEvent.click(getByTestId('credential-filter-cannot-be-used-typeRestricted'));

		expect(selected.value).toEqual(['typeRestricted', 'nodesRestricted']);
	});
});
