import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { defineComponent, ref } from 'vue';

import {
	N8nAccordion,
	N8nAccordionContent,
	N8nAccordionHeader,
	N8nAccordionItem,
	N8nAccordionTrigger,
} from './index';

const AccordionFixture = defineComponent({
	components: {
		N8nAccordion,
		N8nAccordionItem,
		N8nAccordionHeader,
		N8nAccordionTrigger,
		N8nAccordionContent,
	},
	setup() {
		const expanded = ref<string | undefined>('one');
		return { expanded };
	},
	template: `
		<N8nAccordion v-model="expanded" type="single" collapsible unmount-on-hide>
			<N8nAccordionItem value="one">
				<N8nAccordionHeader>
					<N8nAccordionTrigger>First section</N8nAccordionTrigger>
				</N8nAccordionHeader>
				<N8nAccordionContent>First section content</N8nAccordionContent>
			</N8nAccordionItem>
			<N8nAccordionItem value="two">
				<N8nAccordionHeader>
					<N8nAccordionTrigger>Second section</N8nAccordionTrigger>
				</N8nAccordionHeader>
				<N8nAccordionContent>Second section content</N8nAccordionContent>
			</N8nAccordionItem>
		</N8nAccordion>
	`,
});

describe('N8nAccordion', () => {
	it('renders the open item content and toggles on trigger click', async () => {
		render(AccordionFixture);

		expect(screen.getByText('First section content')).toBeInTheDocument();
		expect(screen.queryByText('Second section content')).not.toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Second section' }));

		await waitFor(() => {
			expect(screen.getByText('Second section content')).toBeInTheDocument();
		});
		expect(screen.queryByText('First section content')).not.toBeInTheDocument();
	});

	it('closes the open item when the trigger is clicked again', async () => {
		render(AccordionFixture);

		const firstTrigger = screen.getByRole('button', { name: 'First section' });
		await fireEvent.click(firstTrigger);

		await waitFor(() => {
			expect(screen.queryByText('First section content')).not.toBeInTheDocument();
		});
	});
});
