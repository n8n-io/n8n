import { render, fireEvent } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';

import ActionPill from './ActionPill.vue';

describe('N8nActionPill', () => {
	describe('text rendering', () => {
		it('renders text prop', () => {
			const { getByText } = render(ActionPill, { props: { text: 'Hello' } });
			expect(getByText('Hello')).toBeInTheDocument();
		});

		it('renders slot content', () => {
			const { getByText } = render(ActionPill, { slots: { default: 'Slot content' } });
			expect(getByText('Slot content')).toBeInTheDocument();
		});

		it('renders hoverText alongside text', () => {
			const { getByText } = render(ActionPill, {
				props: { text: 'Label', hoverText: 'Action' },
			});
			expect(getByText('Label')).toBeInTheDocument();
			expect(getByText('Action')).toBeInTheDocument();
		});
	});

	describe('click event', () => {
		it('emits click when clicked', async () => {
			const { getByText, emitted } = render(ActionPill, { props: { text: 'Click me' } });
			await fireEvent.click(getByText('Click me'));
			expect(emitted('click')).toHaveLength(1);
		});
	});

	describe('snapshots', () => {
		it('renders default type correctly', () => {
			const { container } = render(ActionPill, { props: { text: '$5.00 remaining' } });
			expect(container).toMatchSnapshot();
		});

		it('renders danger type correctly', () => {
			const { container } = render(ActionPill, {
				props: { text: 'No credits', type: 'danger' },
			});
			expect(container).toMatchSnapshot();
		});

		it('renders small size correctly', () => {
			const { container } = render(ActionPill, {
				props: { text: 'Label', size: 'small' },
			});
			expect(container).toMatchSnapshot();
		});

		it('renders clickable correctly', () => {
			const { container } = render(ActionPill, {
				props: { text: 'Label', clickable: true },
			});
			expect(container).toMatchSnapshot();
		});

		it('renders danger + clickable + hoverText correctly', () => {
			const { container } = render(ActionPill, {
				props: { text: 'No credits', type: 'danger', clickable: true, hoverText: 'Top up' },
			});
			expect(container).toMatchSnapshot();
		});
	});
});
