import type { ISupplyDataFunctions } from 'n8n-workflow';

import { n8nContextHeaders } from './context-headers';

const ctxWith = (workflow: { id?: string; name?: string }, executionId = 'exec-7') =>
	({
		getWorkflow: () => workflow,
		getExecutionId: () => executionId,
	}) as unknown as ISupplyDataFunctions;

describe('n8nContextHeaders', () => {
	it('names the workflow and the execution so a gateway can attribute usage', () => {
		const headers = n8nContextHeaders(ctxWith({ id: 'wf-1', name: 'Nightly sync' }));

		expect(headers).toEqual({
			'x-n8n-workflow-id': 'wf-1',
			'x-n8n-workflow-name': 'Nightly sync',
			'x-n8n-execution-id': 'exec-7',
		});
	});

	it.each([
		[
			'the workflow has no id yet',
			{ name: 'Draft' },
			'exec-7',
			['x-n8n-workflow-name', 'x-n8n-execution-id'],
		],
		[
			'the workflow has no name yet',
			{ id: 'wf-1' },
			'exec-7',
			['x-n8n-workflow-id', 'x-n8n-execution-id'],
		],
		[
			'there is no execution, as in the editor',
			{ id: 'wf-1', name: 'Draft' },
			'',
			['x-n8n-workflow-id', 'x-n8n-workflow-name'],
		],
	])(
		'sends only the headers that have a value when %s',
		(_name, workflow, executionId, expected) => {
			const headers = n8nContextHeaders(ctxWith(workflow, executionId));

			expect(Object.keys(headers)).toEqual(expected);
		},
	);

	it.each([
		['Cyrillic', 'Ночная синхронизация'],
		['an emoji', 'Nightly 🌙 sync'],
	])(
		'percent-encodes a workflow name written in %s, rather than failing',
		(_name, workflowName) => {
			const headers = n8nContextHeaders(ctxWith({ id: 'wf-1', name: workflowName }));

			expect(() => new Headers(headers)).not.toThrow();
			expect(decodeURIComponent(headers['x-n8n-workflow-name'])).toBe(workflowName);
		},
	);

	it('leaves an ordinary name alone, spaces and all', () => {
		const headers = n8nContextHeaders(ctxWith({ id: 'wf-1', name: 'Nightly sync' }));

		expect(headers['x-n8n-workflow-name']).toBe('Nightly sync');
	});
});
