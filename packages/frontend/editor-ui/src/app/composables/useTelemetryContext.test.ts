import { mount } from '@vue/test-utils';
import { computed, defineComponent, h } from 'vue';
import { useTelemetryContext } from './useTelemetryContext';

describe(useTelemetryContext, () => {
	it('should return empty context when no context is provided', () => {
		const TestComponent = defineComponent({
			setup() {
				const context = useTelemetryContext();
				return () => h('div', JSON.stringify([context.view_shown, context.ndv_source?.value]));
			},
		});

		expect(mount(TestComponent).text()).toBe('[null,null]');
	});

	it('should return context with overrides when overrides are provided', () => {
		const TestComponent = defineComponent({
			setup() {
				const context = useTelemetryContext({ view_shown: 'ndv' });
				return () => h('div', JSON.stringify([context.view_shown, context.ndv_source?.value]));
			},
		});

		expect(mount(TestComponent).text()).toBe('["ndv",null]');
	});

	it('should inherit context from parent and merge with overrides', () => {
		const ChildComponent = defineComponent({
			setup() {
				const childCtx = useTelemetryContext({ view_shown: 'ndv' });
				return () => h('div', JSON.stringify([childCtx.view_shown, childCtx.ndv_source?.value]));
			},
		});
		const ParentComponent = defineComponent({
			setup() {
				useTelemetryContext({
					view_shown: 'focus_panel',
					ndv_source: computed(() => 'added_new_node'),
				});
				return () => h('div', [h(ChildComponent)]);
			},
		});

		expect(mount(ParentComponent).text()).toBe('["ndv","added_new_node"]');
	});

	it('should handle multiple nested contexts correctly', () => {
		const Level4Component = defineComponent({
			setup() {
				const ctx = useTelemetryContext();
				return () => h('div', JSON.stringify([ctx.view_shown, ctx.ndv_source?.value]));
			},
		});
		const Level3Component = defineComponent({
			setup() {
				const ctx = useTelemetryContext({ view_shown: 'ndv' });
				return () =>
					h('div', [
						h('div', JSON.stringify([ctx.view_shown, ctx.ndv_source?.value])),
						h(Level4Component),
					]);
			},
		});
		const Level2Component = defineComponent({
			setup() {
				const ctx = useTelemetryContext({ ndv_source: computed(() => 'other') });
				return () =>
					h('div', [
						h('div', JSON.stringify([ctx.view_shown, ctx.ndv_source?.value])),
						h(Level3Component),
					]);
			},
		});
		const Level1Component = defineComponent({
			setup() {
				const ctx = useTelemetryContext({ view_shown: 'focus_panel' });
				return () =>
					h('div', [
						h('div', JSON.stringify([ctx.view_shown, ctx.ndv_source?.value])),
						h(Level2Component),
					]);
			},
		});

		expect(mount(Level1Component).text()).toBe(
			[
				'["focus_panel",null]',
				'["focus_panel","other"]',
				'["ndv","other"]',
				'["ndv","other"]',
			].join(''),
		);
	});
});
