import { render } from '@testing-library/vue';

import N8nTableBase from './TableBase.vue';

describe('N8nTableBase', () => {
	it('applies no height cap by default', () => {
		const { getByTestId } = render(N8nTableBase, {
			slots: { default: '<tbody><tr><td>row</td></tr></tbody>' },
		});
		expect(getByTestId('table-base-scroll').style.maxHeight).toBe('');
	});

	it('caps the scroll viewport to maxDisplayedRows rows', () => {
		const { getByTestId } = render(N8nTableBase, {
			props: { maxDisplayedRows: 10 },
			slots: { default: '<tbody><tr><td>row</td></tr></tbody>' },
		});
		expect(getByTestId('table-base-scroll').style.maxHeight).toBe('490px');
	});

	it('adds the header height on top when a thead is present', () => {
		const { getByTestId } = render(N8nTableBase, {
			props: { maxDisplayedRows: 10 },
			slots: {
				default: '<thead><tr><th>Col</th></tr></thead><tbody><tr><td>row</td></tr></tbody>',
			},
		});
		expect(getByTestId('table-base-scroll').style.maxHeight).toBe('527px');
	});
});
