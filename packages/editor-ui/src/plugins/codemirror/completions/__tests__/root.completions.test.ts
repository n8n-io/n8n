import { rootCompletions } from '../root.completions';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { v4 as uuidv4 } from 'uuid';
import { i18n } from '@/plugins/i18n';

const EXPLICIT = false;

test('should return completion options: $', () => {
	setActivePinia(createTestingPinia());

	const doc = '{{ $ }}';
	const position = doc.indexOf('$') + 1;
	const context = new CompletionContext(EditorState.create({ doc }), position, EXPLICIT);

	const result = rootCompletions(context);

	if (!result) throw new Error('Expected dollar-sign completion options');

	const { options, from } = result;

	const rootKeys = [...Object.keys(i18n.rootVars), '$parameter'].sort((a, b) => a.localeCompare(b));
	expect(options.map((o) => o.label)).toEqual(rootKeys);
	expect(from).toEqual(position - 1);
});

test('should return completion options: $(', () => {
	const firstNodeName = 'Manual Trigger';
	const secondNodeName = 'Set';

	const nodes = [
		{
			id: uuidv4(),
			name: firstNodeName,
			position: [0, 0],
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
		},
		{
			id: uuidv4(),
			name: secondNodeName,
			position: [0, 0],
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
		},
	];

	const initialState = { workflows: { workflow: { nodes } } };

	setActivePinia(createTestingPinia({ initialState }));

	const doc = '{{ $( }}';
	const position = doc.indexOf('(') + 1;
	const context = new CompletionContext(EditorState.create({ doc }), position, EXPLICIT);

	const result = rootCompletions(context);

	if (!result) throw new Error('Expected dollar-sign-selector completion options');

	const { options, from } = result;

	expect(options).toHaveLength(nodes.length);
	expect(options[0].label).toEqual(`$('${firstNodeName}')`);
	expect(options[1].label).toEqual(`$('${secondNodeName}')`);
	expect(from).toEqual(position - 2);
});

test('should not return completion options for regular strings', () => {
	setActivePinia(createTestingPinia());

	const doc = '{{ hello }}';
	const position = doc.indexOf('o') + 1;
	const context = new CompletionContext(EditorState.create({ doc }), position, EXPLICIT);

	const result = rootCompletions(context);

	expect(result).toBeNull();
});
