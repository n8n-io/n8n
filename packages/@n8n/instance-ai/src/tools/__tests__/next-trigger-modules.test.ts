import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { toContract } from '@n8n/node-sdk/registry';

import { nextActions, nextNodeModule, nodeModuleText, rangedNodeModuleText } from '../next-modules';

const TSC = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');

/**
 * Runs `tsc` on `source` with the generated node modules, as the sandbox build does, and with
 * the module text of each import path in `modules`.
 */
function typeErrors(source: string, modules: Readonly<Record<string, string>> = {}): string[] {
	const root = mkdtempSync(path.join(tmpdir(), 'next-trigger-modules-'));
	try {
		mkdirSync(path.join(root, 'nodes'));
		for (const id of [
			'webhook',
			'schedule',
			'form',
			'whatsAppTrigger',
			'facebookTrigger',
			'dataTable',
			'googleSheetsTrigger',
		]) {
			writeFileSync(path.join(root, 'nodes', `${id}.ts`), nodeModuleText(id) ?? '');
		}
		for (const [id, text] of Object.entries(modules)) {
			writeFileSync(path.join(root, 'nodes', `${id}.ts`), text);
		}
		writeFileSync(path.join(root, 'workflow.ts'), source);
		const sdk = require.resolve('@n8n/workflow-sdk/next').replace(/\.js$/, '.d.ts');
		const compilerOptions = {
			strict: true,
			noEmit: true,
			skipLibCheck: true,
			target: 'ES2022',
			module: 'ES2022',
			moduleResolution: 'bundler',
			types: [],
			paths: { '@n8n/nodes/*': ['./nodes/*'], '@n8n/workflow-sdk/next': [sdk] },
		};
		writeFileSync(
			path.join(root, 'tsconfig.json'),
			JSON.stringify({ compilerOptions, files: ['workflow.ts'] }),
		);
		try {
			execFileSync(process.execPath, [TSC, '-p', root, '--pretty', 'false'], { encoding: 'utf8' });
			return [];
		} catch (error) {
			const output = (error as { stdout?: string }).stdout ?? String(error);
			return output
				.split('\n')
				.filter((line) => line.includes('error TS'))
				.map((line) => line.replace(/^.*?([\w.-]+\.ts)\((\d+),\d+\): /, '$1:$2 '));
		}
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

const header = [
	"import { route, set, steps, when, workflow } from '@n8n/workflow-sdk/next';",
	"import { form } from '@n8n/nodes/form';",
	"import { schedule } from '@n8n/nodes/schedule';",
	"import { webhook } from '@n8n/nodes/webhook';",
	'',
].join('\n');

const incident = `webhook.trigger({
	name: 'Webhook',
	httpMethod: 'POST',
	path: 'incidents',
	responseMode: 'responseNode',
	schema: {
		body: {
			type: 'object',
			properties: {
				service: { type: 'string' },
				severity: { enum: ['critical', 'warning', 'info'] },
				message: { type: 'string' },
				count: { type: 'integer' },
			},
			required: ['service', 'severity', 'message'],
		},
	},
})`;

// Each case runs a real tsc.
describe('native trigger modules', { timeout: 30_000 }, () => {
	it('emit the legacy nodes, so n8n runs them', () => {
		expect(nodeModuleText('webhook')).toContain(
			'contractTrigger("n8n-nodes-base.webhook", config, 2.2,',
		);
		expect(nodeModuleText('webhook')).toContain(
			'contractStep("n8n-nodes-base.respondToWebhook", config, 1.5,',
		);
		expect(nodeModuleText('schedule')).toContain(
			'contractTrigger("n8n-nodes-base.scheduleTrigger", config, 1.4, undefined, {"example":',
		);
	});

	it('resolve from the legacy node types', () => {
		expect(nextNodeModule('n8n-nodes-base.webhook')?.node).toBe('webhook');
		expect(nextNodeModule('n8n-nodes-base.respondToWebhook')?.node).toBe('webhook');
		expect(nextNodeModule('n8n-nodes-base.scheduleTrigger')?.node).toBe('schedule');
		expect(nextNodeModule('n8n-nodes-base.formTrigger')?.node).toBe('form');
	});

	it('type the webhook body by the declared schema, and the schedule rules', () => {
		const source = `${header}
export default workflow(
	'Incidents',
	${incident},
	when({ name: 'Critical?', if: (item) => item.body.severity === 'critical' }, {
		then: set({ name: 'Alert', fields: { text: (_item, $) => \`CRITICAL \${$('Webhook').body.service}: \${$('Webhook').body.message.toUpperCase()}\` } }),
	}),
	webhook.respond({ name: 'Reply', respondWith: 'json', responseBody: (_item, $) => ({ saved: $('Webhook').body.service }) }),
	schedule.trigger({
		name: 'Weekly',
		rule: { interval: [{ field: 'weeks', triggerAtDay: [5], triggerAtHour: 17, triggerAtMinute: 0 }, { field: 'cronExpression', expression: '0 9 * * 1-5' }] },
	}),
	set({ name: 'When', fields: { day: (item) => item['Day of week'] } }),
);
`;
		expect(typeErrors(source)).toEqual([]);
	});

	it('take a partial trigger sample, and reject a sample key the output does not have', () => {
		const sampled = (schema: string, sample: string) =>
			`webhook.trigger({ name: 'Webhook', httpMethod: 'POST', path: 'p',${schema} sample: [${sample}] });`;
		const declared =
			" schema: { body: { type: 'object', properties: { service: { type: 'string' }, count: { type: 'integer' } }, required: ['service'] } },";
		const source = `${header}
${sampled('', "{ body: { service: 'db' } }")}
${sampled(declared, "{ body: { service: 'db' } }")}
`;
		expect(typeErrors(source)).toEqual([]);
		const wrong = `${header}
${sampled(declared, "{ body: { servce: 'db' } }")}
${sampled(declared, "{ body: { count: 'two' } }")}
${sampled('', '{ bdy: {} }')}
`;
		expect(typeErrors(wrong).map((error) => error.split(' ')[0])).toEqual(
			[6, 7, 8].map((line) => `workflow.ts:${line}`),
		);
	});

	it('read an undeclared webhook body as open JSON, as a decompiled flow has it', () => {
		const source = `${header}
export default workflow(
	'Echo',
	webhook.trigger({ name: 'Webhook', httpMethod: 'POST', path: 'echo' }),
	set({ name: 'Upper', fields: { text: (item) => item.body.message.toUpperCase(), page: (item) => item.query.page } }),
);
`;
		expect(typeErrors(source)).toEqual([]);
	});

	it('type the files of a webhook and a form submission by their field names', () => {
		const source = `${header}
export default workflow(
	'Uploads',
	webhook.trigger({ name: 'Webhook', httpMethod: 'POST', path: 'upload' }),
	set({ name: 'Name', fields: { file: (item) => item.binary.image.fileName, type: (item) => item.binary.data.mimeType } }),
	form.trigger({
		name: 'Apply',
		formTitle: 'Apply',
		formFields: { values: [{ fieldType: 'file', fieldLabel: 'CV', multipleFiles: false }] },
	}),
	set({ name: 'Type', fields: { type: (item) => item.binary.CV.mimeType } }),
);
`;
		expect(typeErrors(source)).toEqual([]);
	});

	it('type a form submission by the form fields', () => {
		const source = `${header}
export default workflow(
	'Signups',
	form.trigger({
		name: 'Signup',
		formTitle: 'Sign up',
		formFields: {
			values: [
				{ fieldType: 'email', fieldLabel: 'Email', requiredField: true },
				{ fieldType: 'text', fieldLabel: 'Company name', fieldName: 'company' },
				{ fieldType: 'number', fieldLabel: 'Seats' },
				{ fieldType: 'checkbox', fieldLabel: 'Topics', fieldOptions: { values: [{ option: 'AI' }] } },
				{ fieldType: 'file', fieldLabel: 'Resume' },
			],
		},
	}),
	set({
		name: 'Lead',
		fields: {
			email: (item) => item.Email.toLowerCase(),
			company: (item) => item.company ?? '',
			seats: (item) => (item.Seats ?? 0) + 1,
			topics: (item) => (item.Topics ?? []).join(', '),
			at: (item) => item.submittedAt,
			files: (item) => [item.Resume ?? []].flat().map((file) => file.filename).join(', '),
		},
	}),
);
`;
		expect(typeErrors(source)).toEqual([]);
		const wrong = `${header}
const signup = () => form.trigger({ name: 'Signup', formTitle: 'Sign up', formFields: { values: [{ fieldType: 'email', fieldLabel: 'Email' }] } });
workflow('A', signup(), set({ name: 'A', fields: { x: (item) => item.Emial } }));
workflow('B', signup(), set({ name: 'B', fields: { x: (item) => item.Email.toLowerCase() } }));
form.trigger({ name: 'C', formTitle: 'T', formFields: { values: [{ fieldType: 'email', fieldLabel: 'E', requird: true }] } });
form.trigger({ name: 'D', formTitle: 'T', formFields: { values: [{ fieldType: 'emial', fieldLabel: 'E' }] } });
workflow('F', form.trigger({ name: 'F', formTitle: 'T', formFields: { values: [{ fieldType: 'file', fieldLabel: 'CV', requiredField: true }] } }), set({ name: 'G', fields: { x: (item) => item.CV.filename } }));
`;
		const errors = typeErrors(wrong);
		expect(errors.map((error) => error.split(' ')[0])).toEqual(
			[7, 8, 9, 10, 11].map((line) => `workflow.ts:${line}`),
		);
		expect(errors[4]).toContain("Property 'filename' does not exist");
		expect(errors[0]).toContain("Property 'Emial' does not exist");
		expect(errors[1]).toContain("'item.Email' is possibly 'null'");
	});

	it('type a form page by its own fields, after the form trigger', () => {
		const source = `${header}
export default workflow(
	'Signup pages',
	form.trigger({
		name: 'Signup',
		formTitle: 'Sign up',
		formFields: { values: [{ fieldType: 'email', fieldLabel: 'Email', requiredField: true }] },
	}),
	form.page({
		name: 'Plan',
		formFields: {
			values: [
				{ fieldType: 'number', fieldLabel: 'Seats', requiredField: true },
				{ fieldType: 'text', fieldLabel: 'Notes' },
			],
		},
		options: { formTitle: 'Your plan' },
	}),
	set({
		name: 'Lead',
		fields: {
			email: (_item, $) => $('Signup').Email,
			seats: (item) => item.Seats + 1,
			notes: (item) => item.Notes ?? '',
			at: (item) => item.submittedAt,
		},
	}),
);
`;
		expect(typeErrors(source)).toEqual([]);
		expect(nodeModuleText('form')).toContain('contractStep("n8n-nodes-base.form", config, 2.5,');
		const wrong = `${header}
const start = () => form.trigger({ name: 'S', formTitle: 'T', formFields: { values: [{ fieldType: 'email', fieldLabel: 'Email' }] } });
const page = () => form.page({ name: 'P', formFields: { values: [{ fieldType: 'number', fieldLabel: 'Seats' }] } });
workflow('A', start(), page(), set({ name: 'A', fields: { x: (item) => item.Seat } }));
workflow('B', start(), page(), set({ name: 'B', fields: { x: (item) => item.Seats + 1 } }));
workflow('C', form.trigger({ name: 'S', formTitle: 'T', formFields: { values: [{ fieldType: 'email', fieldLabel: 'E' }] } }), form.page({ name: 'P', formFields: { values: [{ fieldType: 'text', fieldLabl: 'X' }] } }));
`;
		const errors = typeErrors(wrong);
		expect(errors.map((error) => error.split(' ')[0])).toEqual(
			[8, 9, 10].map((line) => `workflow.ts:${line}`),
		);
		expect(errors[0]).toContain("Property 'Seat' does not exist");
		expect(errors[1]).toContain("'item.Seats' is possibly 'null'");
	});

	it('type the rows of the Google Sheets Trigger as an open row of cells', () => {
		expect(nextNodeModule('n8n-nodes-base.googleSheetsTrigger')?.node).toBe('googleSheetsTrigger');
		const source = `${header}import { googleSheetsTrigger } from '@n8n/nodes/googleSheetsTrigger';
export default workflow(
	'New jobs',
	googleSheetsTrigger
		.trigger({
			name: 'Jobs',
			documentId: { __rl: true, mode: 'url', value: 'https://docs.google.com/spreadsheets/d/abc/edit' },
			sheetName: { __rl: true, mode: 'id', value: '0' },
			event: 'rowAdded',
			pollTimes: { item: [{ mode: 'everyX', value: 5, unit: 'minutes' }] },
		}),
	set({ name: 'Job', fields: { title: (row) => String(row.Title), row: (row) => row.row_number ?? 0 } }),
);
`;
		expect(typeErrors(source)).toEqual([]);
		const wrong = `${header}import { googleSheetsTrigger } from '@n8n/nodes/googleSheetsTrigger';
const doc = { __rl: true, mode: 'url', value: 'https://docs.google.com/spreadsheets/d/abc/edit' } as const;
googleSheetsTrigger.trigger({ name: 'A', documentId: doc, sheetName: { __rl: true, mode: 'name', value: 'Jobs' } });
googleSheetsTrigger.trigger({ name: 'B', documentId: doc, sheetName: { __rl: true, mode: 'id', value: '0' }, event: 'rowAddded' });
workflow('C', googleSheetsTrigger.trigger({ name: 'C', documentId: doc, sheetName: { __rl: true, mode: 'id', value: '0' } }), set({ name: 'D', fields: { n: (row) => row.Title.toUpperCase() } }));
`;
		const errors = typeErrors(wrong);
		expect([...new Set(errors.map((error) => error.split(' ')[0]))]).toEqual(
			[7, 8, 9].map((line) => `workflow.ts:${line}`),
		);
	});

	it('wire every named output of a routed step with route', () => {
		const exists = `dataTable.row.exists({
	name: 'Known',
	table: { name: 'leads' },
	where: { match: 'all', conditions: [{ column: 'email', op: 'eq', value: (item) => item.Email }] },
})`;
		const source = `${header}import { dataTable } from '@n8n/nodes/dataTable';
export default workflow(
	'Leads',
	form.trigger({ name: 'Signup', formTitle: 'Sign up', formFields: { values: [{ fieldType: 'email', fieldLabel: 'Email', requiredField: true }] } }),
	route(${exists}, {
		exists: set({ name: 'Seen', fields: { email: (item) => item.Email } }),
		missing: set({ name: 'Fresh', fields: { email: (item, $) => $('Signup').Email } }),
	}),
	set({ name: 'Done', fields: { email: (item) => item.email } }),
);
`;
		expect(typeErrors(source)).toEqual([]);
		expect(nodeModuleText('dataTable')).toContain('route(step, { <output>: part })');
		const wrong = `${header}import { dataTable } from '@n8n/nodes/dataTable';
const start = () => form.trigger({ name: 'S', formTitle: 'T', formFields: { values: [{ fieldType: 'email', fieldLabel: 'Email', requiredField: true }] } });
workflow('S', start(), route(${exists}, { absent: steps() }));
`;
		const errors = typeErrors(wrong);
		expect(errors.map((error) => error.split(' ')[0])).toEqual(['workflow.ts:11']);
		expect(errors[0]).toContain("is not assignable to type 'never'");
	});

	it('take node settings on every trigger and step, and reject unknown ones', () => {
		const signup = (settings: string) =>
			`form.trigger({ name: 'Signup', formTitle: 'Sign up', formFields: { values: [{ fieldType: 'email', fieldLabel: 'Email', requiredField: true }] }, settings: ${settings} })`;
		const source = `${header}import { dataTable } from '@n8n/nodes/dataTable';
export default workflow(
	'Settings',
	${signup("{ notes: 'Public form' }")},
	dataTable.row.insert({ name: 'Save', table: { name: 'leads' }, values: { email: (item) => item.Email }, settings: { retryOnFail: true, maxTries: 3, waitBetweenTries: 1000 } }),
	route(dataTable.row.exists({ name: 'Known', table: { name: 'leads' }, where: { match: 'all', conditions: [{ column: 'email', op: 'eq', value: (_item, $) => $('Signup').Email }] }, settings: { onError: 'continueRegularOutput' } }), {
		exists: steps(),
		missing: steps(),
	}),
	${incident.replace('})', "\tsettings: { notesInFlow: true, notes: 'Alerts' },\n})")},
);
`;
		expect(typeErrors(source)).toEqual([]);
		const wrong = `${header}export default workflow(
	'Wrong settings',
	${signup('{ retryOnFial: true }')},
	webhook.trigger({ name: 'Hook', path: 'in', settings: { onError: 'continueErrorOutput' } }),
);
`;
		const errors = typeErrors(wrong);
		expect(errors.map((error) => error.split(' ')[0])).toEqual(['workflow.ts:7', 'workflow.ts:8']);
		expect(errors[0]).toContain("Type 'true' is not assignable to type 'never'");
		expect(errors[1]).toContain('"continueErrorOutput"');
	});

	it('type the Meta events of the WhatsApp and Facebook triggers', () => {
		const source = `${header}
import { facebookTrigger } from '@n8n/nodes/facebookTrigger';
import { whatsAppTrigger } from '@n8n/nodes/whatsAppTrigger';
export default workflow(
	'Meta',
	whatsAppTrigger.trigger({ name: 'WhatsApp', updates: ['messages'] }),
	set({ name: 'Ask', fields: { from: (item) => item.messages?.[0]?.from ?? '', text: (item) => item.messages?.[0]?.text?.body ?? '' } }),
	facebookTrigger.trigger({ name: 'Page', appId: '1', object: 'page', fields: ['feed'] }),
	set({ name: 'Comment', fields: { by: (item) => item.changes?.[0]?.value.from?.name ?? '', text: (item) => item.changes?.[0]?.value.message ?? '' } }),
);
`;
		expect(typeErrors(source)).toEqual([]);
		const wrong = `${header}
import { whatsAppTrigger } from '@n8n/nodes/whatsAppTrigger';
whatsAppTrigger.trigger({ name: 'A', updates: ['message'] });
workflow('B', whatsAppTrigger.trigger({ name: 'B', updates: ['messages'] }), set({ name: 'C', fields: { x: (item) => item.messages?.[0]?.body } }));
workflow('D', whatsAppTrigger.trigger({ name: 'D', updates: ['messages'] }), set({ name: 'E', fields: { x: (item) => item.messages[0].from } }));
`;
		const errors = typeErrors(wrong);
		expect(errors.map((error) => error.split(' ')[0])).toEqual([
			'workflow.ts:7',
			'workflow.ts:8',
			'workflow.ts:9',
		]);
		expect(errors[2]).toContain("'item.messages' is possibly 'undefined'");
	});

	it('fail tsc on a wrong path, a wrong value, and a wrong rule', () => {
		const source = `${header}
const hook = () => ${incident};
workflow('A', hook(), set({ name: 'A', fields: { x: (_item, $) => $('Webhook').body.severty } }));
workflow('B', hook(), set({ name: 'B', fields: { x: (item) => item.body.severity === 'critcal' } }));
workflow('C', hook(), set({ name: 'C', fields: { x: (item) => item.body.count.toFixed() } }));
webhook.trigger({ name: 'D', path: 'x', httpMethod: 'POSTT' });
workflow('G', hook(), webhook.respond({ name: 'G', respondWith: 'redirect' }));
workflow('H', hook(), webhook.respond({ name: 'H', respondWith: 'text', responseBody: { ok: true } }));
schedule.trigger({ name: 'E', rule: { interval: [{ field: 'weeks', triggerAtDay: [7] }] } });
schedule.trigger({ name: 'F', rule: { interval: [{ field: 'days', triggerAtHourr: 8 }] } });
`;
		const errors = typeErrors(source);
		const lines = errors.map((error) => error.split(' ')[0]);
		expect(lines).toEqual(
			['A', 'B', 'C', 'D', 'G', 'H', 'E', 'F'].map((_, index) => `workflow.ts:${index + 24}`),
		);
		expect(errors[0]).toContain("Property 'severty' does not exist");
		expect(errors[1]).toContain('have no overlap');
		expect(errors[2]).toContain("'item.body.count' is possibly 'undefined'");
	});
});

describe('range modules', { timeout: 30_000 }, () => {
	const get = nextActions().find(({ id }) => id === 'httpRequest.get');
	const contract = get && toContract(get);
	// A stored version whose input has `link` where the newest version has `url`.
	const versions = new Map(
		contract
			? [
					[
						'httpRequest.get@~3.1.0',
						{
							contract: {
								...contract,
								input: {
									type: 'object' as const,
									properties: { link: { type: 'string' as const } },
									required: ['link'],
								},
							},
						},
					],
				]
			: [],
	);
	const module = rangedNodeModuleText('httpRequest', '~3.1.0', versions) ?? '';
	const source = (from: string, field: string) => `import { manual, workflow } from '@n8n/workflow-sdk/next';
import { httpRequest } from '@n8n/nodes/${from}';
export default workflow('Get', manual(), httpRequest.get({ name: 'Get', ${field}: 'https://example.com' }));
`;

	it('type a module at a range by the input of the version that the range locks', () => {
		expect(module).toContain('export const httpRequest = {');
		expect(module).not.toContain('send:');
		expect(
			typeErrors(source('httpRequest@~3.1.0', 'link'), { 'httpRequest@~3.1.0': module }),
		).toEqual([]);
		expect(
			typeErrors(source('httpRequest@~3.1.0', 'url'), { 'httpRequest@~3.1.0': module }).join('\n'),
		).toContain("'url' does not exist");
		expect(
			typeErrors(source('httpRequest', 'url'), {
				httpRequest: nodeModuleText('httpRequest') ?? '',
			}),
		).toEqual([]);
	});

	it('have no module when no action has a version in the range', () => {
		expect(rangedNodeModuleText('httpRequest', '~9.0.0', versions)).toBeUndefined();
	});
});
