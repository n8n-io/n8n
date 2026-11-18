import { findWorkflowIdInText } from '../workflow-link';

const BASE = 'https://n8n.test';

describe('findWorkflowIdInText', () => {
	it('finds the id in the attribution link of the Slack node', () => {
		const text = `Stats are ready\n_Automated with this <${BASE}/workflow/Abc123XyZ?utm_source=n8n-internal&utm_medium=powered_by|n8n workflow>_`;

		expect(findWorkflowIdInText(text, BASE)).toBe('Abc123XyZ');
	});

	it('finds the id when the base URL has a trailing slash', () => {
		expect(findWorkflowIdInText(`${BASE}/workflow/wf-1`, `${BASE}/`)).toBe('wf-1');
	});

	it('ignores a link to another host', () => {
		expect(findWorkflowIdInText('https://evil.example/workflow/wf-1', BASE)).toBeUndefined();
	});

	it('ignores a host that only starts like the instance host', () => {
		expect(
			findWorkflowIdInText('https://n8n.test.evil.example/workflow/wf-1', BASE),
		).toBeUndefined();
	});

	it('returns nothing for a text without a workflow link', () => {
		expect(findWorkflowIdInText(`${BASE}/home/workflows`, BASE)).toBeUndefined();
		expect(findWorkflowIdInText('plain text', BASE)).toBeUndefined();
	});

	it('does not take an id from an overlong path segment', () => {
		const long = 'a'.repeat(40);
		expect(findWorkflowIdInText(`${BASE}/workflow/${long}`, BASE)).toBeUndefined();
	});
});
