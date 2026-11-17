/**
 * The item of a library node for an input item that failed under a continue setting: the
 * converter writes the text that the v1 node puts in it, or does not link the library node.
 */
import { compile } from '../../compiler/index.ts';
import { convertWorkflow } from '../index.ts';

function workflow(node: Record<string, unknown>) {
	return {
		name: 'Error items',
		nodes: [
			{
				name: 'Hook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				parameters: { path: 'p' },
			},
			{ name: 'Node', position: [200, 0], ...node },
		],
		connections: { Hook: { main: [[{ node: 'Node', type: 'main', index: 0 }]] } },
	};
}

function converted(node: Record<string, unknown>): string {
	const out = convertWorkflow(workflow(node));
	expect(out.ok).toBe(true);
	expect(compile(out.source).diagnostics).toEqual([]);
	return out.source;
}

const telegram = {
	type: 'n8n-nodes-base.telegram',
	typeVersion: 1.2,
	parameters: {
		resource: 'message',
		operation: 'sendMessage',
		chatId: '1',
		text: 'Hi',
		additionalFields: { appendAttribution: false },
	},
	credentials: { telegramApi: { id: 'c1', name: 'Telegram' } },
};

const supabase = {
	type: 'n8n-nodes-base.supabase',
	typeVersion: 1,
	parameters: {
		operation: 'get',
		tableId: 'leads',
		filters: { conditions: [{ keyName: 'id', keyValue: 1 }] },
	},
	credentials: { supabaseApi: { id: 'c1', name: 'Supabase' } },
};

const airtable = {
	type: 'n8n-nodes-base.airtable',
	typeVersion: 2.1,
	parameters: {
		resource: 'record',
		operation: 'create',
		base: { __rl: true, mode: 'id', value: 'app1' },
		table: { __rl: true, mode: 'id', value: 'tbl1' },
		columns: { mappingMode: 'defineBelow', value: { Name: 'A' }, schema: [] },
		options: {},
	},
	credentials: { airtableTokenApi: { id: 'c1', name: 'Airtable' } },
};

describe('error items of library nodes in the converter', () => {
	it('gives the description of a Telegram error, as the v1 node does', () => {
		const source = converted({ ...telegram, onError: 'continueRegularOutput' });
		expect(source).toContain('{ error: (error.description ?? error.message) }');
	});

	it('moves a Telegram error item to the error output with its input item', () => {
		const source = converted({ ...telegram, onError: 'continueErrorOutput' });
		expect(source).toContain('error: (error.description ?? error.message) });');
	});

	it('gives the message for Supabase get and the description for the other operations', () => {
		expect(converted({ ...supabase, onError: 'continueRegularOutput' })).toContain(
			'{ error: error.message }',
		);
		const update = {
			...supabase,
			parameters: {
				...supabase.parameters,
				operation: 'update',
				fieldsUi: { fieldValues: [{ fieldId: 'a', fieldValue: 1 }] },
			},
			onError: 'continueErrorOutput',
		};
		const source = converted(update);
		// An error without a description stays on output 0, as an item without an `error`.
		expect(source).toContain('if (error.description)');
		// An error that the v1 node throws passes the input items on.
		expect(source).toContain('if (error.wholeNode === true) {');
	});

	it('does not link the Airtable library node under a continue setting', () => {
		expect(converted(airtable)).not.toContain("host: 'fallback'");
		// Without the source of the v1 node to compile, the node runs in the host.
		const source = converted({ ...airtable, onError: 'continueRegularOutput' });
		expect(source).toContain("host: 'fallback'");
		expect(source).not.toContain('{ message: error.message');
	});
});
