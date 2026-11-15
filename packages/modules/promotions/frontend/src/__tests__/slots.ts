import { componentRegistry } from '@n8n/frontend-module-sdk';
import { defineComponent } from 'vue';

/** Renders what the editor's slot components show as text, so tests can read it. */
export function registerDiffSlotStubs() {
	componentRegistry.register(
		'workflow-diff-placeholder',
		defineComponent({
			template: '<div><slot name="sourceLabel" /><slot name="targetLabel" /><slot /></div>',
		}),
	);
	componentRegistry.register(
		'code-diff',
		defineComponent({
			props: ['oldString', 'newString'],
			template: '<pre>{{ oldString }}{{ newString }}</pre>',
		}),
	);
}
