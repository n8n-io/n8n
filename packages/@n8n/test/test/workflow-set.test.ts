import { executeWorkflow, loadWorkflow, loadWorkflows, type WorkflowDefinition } from '../src';
import formatName from './fixtures/format-name.json';

test('throws on an ambiguous workflow name and lists the IDs', () => {
	const workflows = loadWorkflows([formatName, { ...formatName, id: 'format-name-2' }]);

	expect(() => workflows.get('Format name')).toThrow(
		'More than one workflow is named "Format name". Select one by ID: format-name-1, format-name-2',
	);
	expect(workflows.get('format-name-2').id).toBe('format-name-2');
});

test('accepts any saved workflow settings', () => {
	const saved = JSON.parse('{"saveDataErrorExecution":"all"}') as {
		saveDataErrorExecution: string;
	};
	const definition: WorkflowDefinition = { ...formatName, settings: saved };

	expect(loadWorkflow(definition).definition.settings).toEqual({ saveDataErrorExecution: 'all' });
});

test('rejects a node reference from another workflow', async () => {
	const workflow = loadWorkflow(formatName);
	const other = loadWorkflow({ ...formatName, name: 'Other' });
	const result = await executeWorkflow(workflow, { input: { first: 'ada', last: 'lovelace' } });

	expect(() => result.node(other.node('Format name'))).toThrow(
		expect.objectContaining({ code: 'NODE_NOT_FOUND' }),
	);
});
