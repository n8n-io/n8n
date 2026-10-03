import { explainUnknownSdkFunction } from './unknown-sdk-function';

describe('explainUnknownSdkFunction', () => {
	it('names a function the SDK does not export from a bundled CommonJS error', () => {
		const hint = explainUnknownSdkFunction('(0 , import_workflow_sdk.code) is not a function');

		expect(hint).toContain('`code` is not exported by @n8n/workflow-sdk');
		expect(hint).toContain('node, ');
		expect(hint).toContain("node({ type: 'n8n-nodes-base.code'");
	});

	it('names every unknown function from a native ESM error', () => {
		const hint = explainUnknownSdkFunction(
			"The requested module '@n8n/workflow-sdk' does not provide an export named 'agent'; also does not provide an export named 'filter'",
		);

		expect(hint).toContain('`agent`, `filter` are not exported');
	});

	it('ignores errors about functions the SDK exports', () => {
		expect(
			explainUnknownSdkFunction('(0 , import_workflow_sdk.node) is not a function'),
		).toBeUndefined();
	});

	it('ignores unrelated load errors', () => {
		expect(explainUnknownSdkFunction('splitPlayReviews is not defined')).toBeUndefined();
	});
});
