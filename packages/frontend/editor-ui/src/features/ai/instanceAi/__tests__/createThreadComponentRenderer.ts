import { defineComponent, h, type Component } from 'vue';
import { createComponentRenderer, type RenderOptions } from '@/__tests__/render';
import { provideThread, useInstanceAiStore } from '../instanceAi.store';

type RendererOptions = { merge?: boolean };

export function createThreadComponentRenderer<T extends Component>(
	component: T,
	defaultOptions: RenderOptions<T> = {},
) {
	const ThreadProvider = defineComponent({
		name: 'InstanceAiThreadTestProvider',
		inheritAttrs: false,
		setup(_, { attrs, slots }) {
			provideThread(useInstanceAiStore());
			return () => h(component as Component, attrs, slots);
		},
	});

	const renderProvider = createComponentRenderer(
		ThreadProvider,
		defaultOptions as unknown as RenderOptions<typeof ThreadProvider>,
	);

	return (options: RenderOptions<T> = {}, rendererOptions: RendererOptions = {}) =>
		renderProvider(options as unknown as RenderOptions<typeof ThreadProvider>, rendererOptions);
}
