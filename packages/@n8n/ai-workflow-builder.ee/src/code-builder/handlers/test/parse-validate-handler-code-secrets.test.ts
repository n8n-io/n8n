import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { ParseValidateHandler } from '../parse-validate-handler';

describe('ParseValidateHandler — Code node hardcoded secrets', () => {
	const handler = new ParseValidateHandler({ generatePinData: false });

	it('emits HARDCODED_CREDENTIALS via parseAndValidate and validateJSON', async () => {
		const secret = 'internal-admin-secret-42';
		const { warnings } = await handler.parseAndValidate(`
			const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } });
			const check = node({
				type: 'n8n-nodes-base.code',
				version: 2,
				config: { name: 'Check Secret', parameters: { jsCode: 'const ADMIN_SECRET = "${secret}";' } },
			});
			export default workflow('wf-1', 'Secret Check').add(start.to(check));
		`);

		expect(warnings).toContainEqual(
			expect.objectContaining({ code: 'HARDCODED_CREDENTIALS', nodeName: 'Check Secret' }),
		);
		expect(warnings.find((w) => w.code === 'HARDCODED_CREDENTIALS')?.message).not.toContain(secret);

		const json: WorkflowJSON = {
			id: 'wf-2',
			name: 'Partial Update',
			nodes: [
				{
					id: 'n1',
					name: 'Py Check',
					type: 'n8n-nodes-base.code',
					typeVersion: 2,
					position: [0, 0],
					parameters: { language: 'python', pythonCode: `ADMIN_SECRET = "${secret}"` },
				},
			],
			connections: {},
		};
		expect(handler.validateJSON(json)).toContainEqual(
			expect.objectContaining({ code: 'HARDCODED_CREDENTIALS', nodeName: 'Py Check' }),
		);
	});
});
