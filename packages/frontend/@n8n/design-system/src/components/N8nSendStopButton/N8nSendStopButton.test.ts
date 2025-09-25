import { fireEvent } from '@testing-library/vue';

import { createComponentRenderer } from '@n8n/design-system/__tests__/render';

import N8nSendStopButton from './N8nSendStopButton.vue';

const renderComponent = createComponentRenderer(N8nSendStopButton);

describe('N8nSendStopButton', () => {
	describe('rendering', () => {
		it('should render send button by default', () => {
			const { container } = renderComponent({
				global: {
					stubs: ['N8nButton'],
				},
			});

			const sendButton = container.querySelector('.sendButton');
			expect(sendButton).toBeTruthy();

			const stopButton = container.querySelector('.stopButton');
			expect(stopButton).toBeFalsy();
		});

		it('should render stop button when streaming', () => {
			const { container } = renderComponent({
				props: {
					streaming: true,
				},
				global: {
					stubs: ['N8nButton'],
				},
			});

			const sendButton = container.querySelector('.sendButton');
			expect(sendButton).toBeFalsy();

			const stopButton = container.querySelector('.stopButton');
			expect(stopButton).toBeTruthy();
		});

		it('should render with custom size', () => {
			const { container } = renderComponent({
				props: {
					size: 'large',
				},
				global: {
					stubs: {
						N8nButton: {
							props: ['size', 'type', 'square', 'disabled', 'icon', 'iconSize'],
							template: '<button :class="{sendButton: true}" :data-size="size"></button>',
						},
					},
				},
			});

			const button = container.querySelector('button');
			expect(button).toHaveAttribute('data-size', 'large');
		});

		it('should disable send button when disabled prop is true', () => {
			const { container } = renderComponent({
				props: {
					disabled: true,
				},
				global: {
					stubs: {
						N8nButton: {
							props: ['disabled', 'type', 'square', 'icon', 'iconSize', 'size'],
							template: '<button :disabled="disabled" :class="{sendButton: true}"></button>',
						},
					},
				},
			});

			const button = container.querySelector('button');
			expect(button).toHaveAttribute('disabled');
		});
	});

	describe('events', () => {
		it('should emit send event when send button is clicked', async () => {
			const render = renderComponent({
				global: {
					stubs: {
						N8nButton: {
							props: ['disabled', 'type', 'square', 'icon', 'iconSize', 'size'],
							template: '<button @click="$emit(\'click\')" :class="{sendButton: true}"></button>',
							emits: ['click'],
						},
					},
				},
			});

			const button = render.container.querySelector('button') as HTMLButtonElement;
			await fireEvent.click(button);

			expect(render.emitted('send')).toBeTruthy();
			expect(render.emitted('send')?.[0]).toEqual([]);
		});

		it('should emit stop event when stop button is clicked', async () => {
			const render = renderComponent({
				props: {
					streaming: true,
				},
				global: {
					stubs: {
						N8nButton: {
							props: ['type', 'square', 'size', 'icon', 'iconSize'],
							template: '<button @click="$emit(\'click\')" :class="{stopButton: true}"></button>',
							emits: ['click'],
						},
					},
				},
			});

			const button = render.container.querySelector('button') as HTMLButtonElement;
			await fireEvent.click(button);

			expect(render.emitted('stop')).toBeTruthy();
			expect(render.emitted('stop')?.[0]).toEqual([]);
		});

		it('should not emit send event when button is disabled', async () => {
			const render = renderComponent({
				props: {
					disabled: true,
				},
				global: {
					stubs: {
						N8nButton: {
							props: ['disabled', 'type', 'square', 'icon', 'iconSize', 'size'],
							template:
								'<button :disabled="disabled" @click="!disabled && $emit(\'click\')" :class="{sendButton: true}"></button>',
							emits: ['click'],
						},
					},
				},
			});

			const button = render.container.querySelector('button') as HTMLButtonElement;
			await fireEvent.click(button);

			expect(render.emitted('send')).toBeFalsy();
		});
	});

	describe('button properties', () => {
		it('should pass correct props to send button', () => {
			const { container } = renderComponent({
				props: {
					size: 'medium',
					disabled: false,
				},
				global: {
					stubs: {
						N8nButton: {
							props: ['type', 'size', 'iconSize', 'square', 'icon', 'disabled'],
							template: `
								<button
									:data-type="type"
									:data-size="size"
									:data-icon-size="iconSize"
									:data-square="square"
									:data-icon="icon"
									:disabled="disabled"
									:class="{sendButton: true}"
								></button>`,
						},
					},
				},
			});

			const button = container.querySelector('button');
			expect(button).toHaveAttribute('data-type', 'primary');
			expect(button).toHaveAttribute('data-size', 'medium');
			expect(button).toHaveAttribute('data-icon-size', 'large');
			expect(button).toHaveAttribute('data-square', '');
			expect(button).toHaveAttribute('data-icon', 'arrow-up');
			expect(button).not.toHaveAttribute('disabled');
		});

		it('should pass correct props to stop button', () => {
			const { container } = renderComponent({
				props: {
					streaming: true,
					size: 'small',
				},
				global: {
					stubs: {
						N8nButton: {
							props: ['type', 'size', 'square'],
							template: `
								<button
									:data-type="type"
									:data-size="size"
									:data-square="square"
									:class="{stopButton: true}"
								></button>`,
						},
					},
				},
			});

			const button = container.querySelector('button');
			expect(button).toHaveAttribute('data-type', 'primary');
			expect(button).toHaveAttribute('data-size', 'small');
			expect(button).toHaveAttribute('data-square', '');
		});
	});

	describe('default props', () => {
		it('should use default size of small', () => {
			const { container } = renderComponent({
				global: {
					stubs: {
						N8nButton: {
							props: ['size', 'type', 'square', 'icon', 'iconSize', 'disabled'],
							template: '<button :data-size="size" :class="{sendButton: true}"></button>',
						},
					},
				},
			});

			const button = container.querySelector('button');
			expect(button).toHaveAttribute('data-size', 'small');
		});

		it('should default to not streaming', () => {
			const { container } = renderComponent({
				global: {
					stubs: ['N8nButton'],
				},
			});

			const sendButton = container.querySelector('.sendButton');
			expect(sendButton).toBeTruthy();

			const stopButton = container.querySelector('.stopButton');
			expect(stopButton).toBeFalsy();
		});

		it('should default to not disabled', () => {
			const { container } = renderComponent({
				global: {
					stubs: {
						N8nButton: {
							props: ['disabled', 'type', 'square', 'icon', 'iconSize', 'size'],
							template:
								'<button :disabled="disabled" :data-disabled="disabled" :class="{sendButton: true}"></button>',
						},
					},
				},
			});

			const button = container.querySelector('button');
			expect(button).not.toHaveAttribute('disabled');
			expect(button).toHaveAttribute('data-disabled', 'false');
		});
	});
});
