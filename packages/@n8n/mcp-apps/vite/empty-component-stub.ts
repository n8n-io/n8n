import { defineComponent } from 'vue';

/**
 * No-op component used to alias-stub heavy editor-ui components that can
 * never activate inside the MCP app (e.g. the experimental in-canvas NDV,
 * which sits behind an experiment flag and drags the entire NDV/RunData/
 * CodeMirror subtree into the bundle).
 */
// eslint-disable-next-line import-x/no-default-export -- stands in for a Vue SFC default export
export default defineComponent({
	name: 'StubbedComponent',
	render: () => null,
});
