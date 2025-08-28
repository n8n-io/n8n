import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { useTelemetryContext } from './useTelemetryContext';

describe(useTelemetryContext, () => {
	it('should return empty context when no context is provided', () => {
		const TestComponent = defineComponent({
			setup() {
				const context = useTelemetryContext();
				return () => h('div', context.view_shown);
			},
		});

		expect(mount(TestComponent).text()).toBe('');
	});

	it('should return context with overrides when overrides are provided', () => {
		const TestComponent = defineComponent({
			setup() {
				const context = useTelemetryContext({ view_shown: 'ndv' });
				return () => h('div', context.view_shown);
			},
		});

		expect(mount(TestComponent).text()).toBe('ndv');
	});

	it('should inherit context from parent and merge with overrides', () => {
		const ChildComponent = defineComponent({
			setup() {
				const childCtx = useTelemetryContext({ view_shown: 'ndv' });
				return () => h('div', childCtx.view_shown);
			},
		});
		const ParentComponent = defineComponent({
			setup() {
				useTelemetryContext({ view_shown: 'focus_panel' });
				return () => h('div', [h(ChildComponent)]);
			},
		});

		expect(mount(ParentComponent).text()).toBe('ndv');
	});

	it('should handle multiple nested contexts correctly', () => {
		const Level4Component = defineComponent({
			setup() {
				const ctx = useTelemetryContext();
				return () => h('div', ctx.view_shown);
			},
		});
		const Level3Component = defineComponent({
			setup() {
				const ctx = useTelemetryContext({ view_shown: 'ndv' });
				return () => h('div', [h('div', ctx.view_shown), h('div', ','), h(Level4Component)]);
			},
		});
		const Level2Component = defineComponent({
			setup() {
				const ctx = useTelemetryContext({});
				return () => h('div', [h('div', ctx.view_shown), h('div', ','), h(Level3Component)]);
			},
		});
		const Level1Component = defineComponent({
			setup() {
				const ctx = useTelemetryContext({ view_shown: 'focus_panel' });
				return () => h('div', [h('div', ctx.view_shown), h('div', ','), h(Level2Component)]);
			},
		});

		expect(mount(Level1Component).text()).toBe('focus_panel,focus_panel,ndv,ndv');
	});
});
