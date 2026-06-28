import { render, screen } from '@testing-library/vue';

import Stepper from './Stepper.vue';

const steps = [
	{
		id: 'first',
		title: 'First step',
		description: 'Configure the basics',
	},
	{
		id: 'second',
		title: 'Second step',
		description: 'Review the details',
	},
	{
		id: 'third',
		title: 'Third step',
	},
];

const renderStepper = (props: Partial<InstanceType<typeof Stepper>['$props']> = {}) =>
	render(Stepper, {
		props: {
			steps,
			...props,
		},
	});

describe('N8nStepper', () => {
	it('renders step titles and descriptions', () => {
		renderStepper();

		expect(screen.getByText('First step')).toBeVisible();
		expect(screen.getByText('Configure the basics')).toBeVisible();
		expect(screen.getByText('Second step')).toBeVisible();
		expect(screen.getByText('Review the details')).toBeVisible();
		expect(screen.getByText('Third step')).toBeVisible();
	});

	it('renders sequential numbers in index when showIndex is true', () => {
		renderStepper({ showIndex: true });

		expect(screen.getByText('1')).toBeVisible();
		expect(screen.getByText('2')).toBeVisible();
		expect(screen.getByText('3')).toBeVisible();
	});

	it('renders dots when showIndex is false', () => {
		const { container } = renderStepper({ showIndex: false });

		expect(screen.queryByText('1')).not.toBeInTheDocument();
		expect(screen.queryByText('2')).not.toBeInTheDocument();
		expect(screen.queryByText('3')).not.toBeInTheDocument();
		expect(container.querySelectorAll('[class*="dot"]').length).toBe(steps.length);
	});

	it('renders as an ordered list', () => {
		const { container } = renderStepper();

		expect(container.querySelector('ol')).toBe(screen.getByRole('list'));
		expect(screen.getAllByRole('listitem')).toHaveLength(steps.length);
	});

	it('hides decorative rails from assistive technology', () => {
		const { container } = renderStepper();
		const rails = container.querySelectorAll('[class*="rail"]');

		expect(rails).toHaveLength(steps.length - 1);
		rails.forEach((rail) => expect(rail).toHaveAttribute('aria-hidden', 'true'));
	});
});
