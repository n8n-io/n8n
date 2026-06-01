import { defineComponent, h, type Component } from 'vue';
import { createComponentRenderer, type RenderOptions } from '@/__tests__/render';
import { provideThread, useInstanceAiStore, type ThreadRuntime } from '../instanceAi.store';

type RendererOptions = { merge?: boolean };

export function createThreadComponentRenderer<T extends Component>(
	component: T,
	defaultOptions: RenderOptions<T> = {},
	getThread?: () => ThreadRuntime,
) {
	const ThreadProvider = defineComponent({
		name: 'InstanceAiThreadTestProvider',
		inheritAttrs: false,
		setup(_, { attrs, slots }) {
			const store = useInstanceAiStore();
			provideThread(getThread?.() ?? store.getOrCreateRuntime('thread-1'));
			return () => h(component, attrs, slots);
		},
	});

	const renderProvider = createComponentRenderer(
		ThreadProvider,
		defaultOptions as unknown as RenderOptions<typeof ThreadProvider>,
	);

	return (options: RenderOptions<T> = {}, rendererOptions: RendererOptions = {}) =>
		renderProvider(options as unknown as RenderOptions<typeof ThreadProvider>, rendererOptions);
}
