import { node, trigger, workflow } from '@n8n/workflow-sdk';

import { collectHostSdkValidatorWarnings } from '../host-sdk-validation';
import type { ValidationWarning } from '../workflow-validation-warnings';

function wrappedMockWorkflow() {
	const authored = workflow('wf-1', 'Mocks').add(
		trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } }).to(
			node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.3,
				config: {
					name: 'Fetch Orders',
					parameters: { url: 'https://example.com' },
					output: [{ json: { orderId: 'ord_1' } }],
				},
			}),
		),
	);
	return { json: authored.toJSON(), declaredOutputs: authored.generatePinData().toJSON().pinData };
}

describe('collectHostSdkValidatorWarnings', () => {
	it('reports a monorepo finding that the sandbox did not report', () => {
		const { json, declaredOutputs } = wrappedMockWorkflow();

		const findings = collectHostSdkValidatorWarnings(json, declaredOutputs, []);

		expect(findings.map((finding) => finding.code)).toContain('MOCK_OUTPUT_JSON_ENVELOPE');
	});

	it('skips a finding that the sandbox already reported for the same node and path', () => {
		const { json, declaredOutputs } = wrappedMockWorkflow();
		const reported: ValidationWarning[] = [
			{ code: 'MOCK_OUTPUT_JSON_ENVELOPE', message: 'already shown', nodeName: 'Fetch Orders' },
		];

		const findings = collectHostSdkValidatorWarnings(json, declaredOutputs, reported);

		expect(findings.map((finding) => finding.code)).not.toContain('MOCK_OUTPUT_JSON_ENVELOPE');
	});

	it('keeps a finding whose parameter path differs from the reported one', () => {
		const { json, declaredOutputs } = wrappedMockWorkflow();
		const reported: ValidationWarning[] = [
			{
				code: 'MOCK_OUTPUT_JSON_ENVELOPE',
				message: 'another field',
				nodeName: 'Fetch Orders',
				parameterPath: 'url',
			},
		];

		const findings = collectHostSdkValidatorWarnings(json, declaredOutputs, reported);

		expect(findings.map((finding) => finding.code)).toContain('MOCK_OUTPUT_JSON_ENVELOPE');
	});
});
