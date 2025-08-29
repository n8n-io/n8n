import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { useTelemetryContext } from './useTelemetryContext';

describe(useTelemetryContext, () => {
	it('should return empty context when no context is provided', () => {
		const TestComponent = defineComponent({
			setup() {
				const context = useTelemetryContext();
				return () => h('div', JSON.stringify(context));
			},
		});

		expect(mount(TestComponent).text()).toBe('{}');
	});

	it('should return context with overrides when overrides are provided', () => {
		const TestComponent = defineComponent({
			setup() {
				const context = useTelemetryContext({ view_shown: 'ndv' });
				return () => h('div', JSON.stringify(context));
			},
		});

		expect(mount(TestComponent).text()).toBe('{"view_shown":"ndv"}');
	});

	it('should inherit context from parent and merge with overrides', () => {
		const ChildComponent = defineComponent({
			setup() {
				const childCtx = useTelemetryContext({ view_shown: 'ndv' });
				return () => h('div', JSON.stringify(childCtx));
			},
		});
		const ParentComponent = defineComponent({
			setup() {
				useTelemetryContext({ view_shown: 'focus_panel', ndv_source: 'added_new_node' });
				return () => h('div', [h(ChildComponent)]);
			},
		});

		expect(mount(ParentComponent).text()).toBe(
			'{"view_shown":"ndv","ndv_source":"added_new_node"}',
		);
	});

	it('should handle multiple nested contexts correctly', () => {
		const Level4Component = defineComponent({
			setup() {
				const ctx = useTelemetryContext();
				return () => h('div', JSON.stringify(ctx));
			},
		});
		const Level3Component = defineComponent({
			setup() {
				const ctx = useTelemetryContext({ view_shown: 'ndv' });
				return () => h('div', [h('div', JSON.stringify(ctx)), h(Level4Component)]);
			},
		});
		const Level2Component = defineComponent({
			setup() {
				const ctx = useTelemetryContext({ ndv_source: 'other' });
				return () => h('div', [h('div', JSON.stringify(ctx)), h(Level3Component)]);
			},
		});
		const Level1Component = defineComponent({
			setup() {
				const ctx = useTelemetryContext({ view_shown: 'focus_panel' });
				return () => h('div', [h('div', JSON.stringify(ctx)), h(Level2Component)]);
			},
		});

		expect(mount(Level1Component).text()).toBe(
			[
				'{"view_shown":"focus_panel"}',
				'{"view_shown":"focus_panel","ndv_source":"other"}',
				'{"view_shown":"ndv","ndv_source":"other"}',
				'{"view_shown":"ndv","ndv_source":"other"}',
			].join(''),
		);
	});
});
