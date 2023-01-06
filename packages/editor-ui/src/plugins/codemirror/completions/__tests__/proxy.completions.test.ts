import { proxyCompletions } from '../proxy.completions';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import * as workflowHelpers from '@/mixins/workflowHelpers';
import {
	executionProxy,
	inputProxy,
	itemProxy,
	nodeSelectorProxy,
	prevNodeProxy,
	workflowProxy,
} from './proxyMocks';
import { IDataObject } from 'n8n-workflow';

const EXPLICIT = false;

beforeEach(() => {
	setActivePinia(createTestingPinia());
});

function testCompletionOptions(proxy: IDataObject, toResolve: string) {
	vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce(proxy);

	const doc = `{{ ${toResolve}. }}`;
	const position = doc.indexOf('.') + 1;
	const context = new CompletionContext(EditorState.create({ doc }), position, EXPLICIT);

	const result = proxyCompletions(context);

	if (!result) throw new Error(`Expected ${toResolve} completion options`);

	const { options: actual, from } = result;

	expect(actual.map((o) => o.label)).toEqual(Reflect.ownKeys(proxy));
	expect(from).toEqual(position);
}

// input proxy

test('should return proxy completion options: $input', () => {
	testCompletionOptions(inputProxy, '$input');
});

// item proxy

test('should return proxy completion options: $input.first()', () => {
	testCompletionOptions(itemProxy, '$input.first()');
});

test('should return proxy completion options: $input.last()', () => {
	testCompletionOptions(itemProxy, '$input.last()');
});

test('should return proxy completion options: $input.item', () => {
	testCompletionOptions(itemProxy, '$input.item');
});

test('should return proxy completion options: $input.all()[0]', () => {
	testCompletionOptions(itemProxy, '$input.all()[0]');
});

// json proxy

test('should return proxy completion options: $json', () => {
	testCompletionOptions(workflowProxy, '$json');
});

// prevNode proxy

test('should return proxy completion options: $prevNode', () => {
	testCompletionOptions(prevNodeProxy, '$prevNode');
});

// execution proxy

test('should return proxy completion options: $execution', () => {
	testCompletionOptions(executionProxy, '$execution');
});

// workflow proxy

test('should return proxy completion options: $workflow', () => {
	testCompletionOptions(workflowProxy, '$workflow');
});

// node selector proxy

test('should return proxy completion options: $()', () => {
	const firstNodeName = 'Manual';
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

	const connections = {
		Manual: {
			main: [
				[
					{
						node: 'Set',
						type: 'main',
						index: 0,
					},
				],
			],
		},
	};

	const initialState = { workflows: { workflow: { nodes, connections } } };

	setActivePinia(createTestingPinia({ initialState }));

	testCompletionOptions(nodeSelectorProxy, "$('Set')");
});

// no proxy

test('should not return completion options for non-existing proxies', () => {
	vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce(null);

	const doc = '{{ $hello. }}';
	const position = doc.indexOf('.') + 1;
	const context = new CompletionContext(EditorState.create({ doc }), position, EXPLICIT);

	const result = proxyCompletions(context);

	expect(result).toBeNull();
});
