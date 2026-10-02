import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { nextNodeModule, nodeModuleText } from '../next-modules';

const TSC = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');

/** Runs `tsc` on `source` with the generated node modules, as the sandbox build does. */
function typeErrors(source: string): string[] {
	const root = mkdtempSync(path.join(tmpdir(), 'next-trigger-modules-'));
	try {
		mkdirSync(path.join(root, 'nodes'));
		for (const id of ['webhook', 'schedule', 'form', 'whatsAppTrigger', 'facebookTrigger']) {
			writeFileSync(path.join(root, 'nodes', `${id}.ts`), nodeModuleText(id) ?? '');
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
	"import { set, workflow } from '@n8n/workflow-sdk/next';",
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
	it('emit the built-in nodes, so n8n runs them', () => {
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

	it('resolve from the built-in node types', () => {
		expect(nextNodeModule('n8n-nodes-base.webhook')?.node).toBe('webhook');
		expect(nextNodeModule('n8n-nodes-base.respondToWebhook')?.node).toBe('webhook');
		expect(nextNodeModule('n8n-nodes-base.scheduleTrigger')?.node).toBe('schedule');
		expect(nextNodeModule('n8n-nodes-base.formTrigger')?.node).toBe('form');
	});

	it('type the webhook body by the declared schema, and the schedule rules', () => {
		const source = `${header}
export default workflow(
	'Incidents',
	${incident}
		.branch({
			name: 'Critical?',
			if: (item) => item.body.severity === 'critical',
			then: (flow) =>
				flow.andThen(
					set({ name: 'Alert', fields: { text: (_item, $) => \`CRITICAL \${$('Webhook').body.service}: \${$('Webhook').body.message.toUpperCase()}\` } }),
				),
		})
		.andThen(webhook.respond({ name: 'Reply', respondWith: 'json', responseBody: (_item, $) => ({ saved: $('Webhook').body.service }) })),
	schedule.trigger({
		name: 'Weekly',
		rule: { interval: [{ field: 'weeks', triggerAtDay: [5], triggerAtHour: 17, triggerAtMinute: 0 }, { field: 'cronExpression', expression: '0 9 * * 1-5' }] },
	}).andThen(set({ name: 'When', fields: { day: (item) => item['Day of week'] } })),
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
	webhook.trigger({ name: 'Webhook', httpMethod: 'POST', path: 'echo' }).andThen(
		set({ name: 'Upper', fields: { text: (item) => item.body.message.toUpperCase(), page: (item) => item.query.page } }),
	),
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
	}).andThen(
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
	),
);
`;
		expect(typeErrors(source)).toEqual([]);
		const wrong = `${header}
const flow = form.trigger({ name: 'Signup', formTitle: 'Sign up', formFields: { values: [{ fieldType: 'email', fieldLabel: 'Email' }] } });
flow.andThen(set({ name: 'A', fields: { x: (item) => item.Emial } }));
flow.andThen(set({ name: 'B', fields: { x: (item) => item.Email.toLowerCase() } }));
form.trigger({ name: 'C', formTitle: 'T', formFields: { values: [{ fieldType: 'email', fieldLabel: 'E', requird: true }] } });
form.trigger({ name: 'D', formTitle: 'T', formFields: { values: [{ fieldType: 'emial', fieldLabel: 'E' }] } });
form.trigger({ name: 'F', formTitle: 'T', formFields: { values: [{ fieldType: 'file', fieldLabel: 'CV', requiredField: true }] } }).andThen(set({ name: 'G', fields: { x: (item) => item.CV.filename } }));
`;
		const errors = typeErrors(wrong);
		expect(errors.map((error) => error.split(' ')[0])).toEqual(
			[7, 8, 9, 10, 11].map((line) => `workflow.ts:${line}`),
		);
		expect(errors[4]).toContain("Property 'filename' does not exist");
		expect(errors[0]).toContain("Property 'Emial' does not exist");
		expect(errors[1]).toContain("'item.Email' is possibly 'null'");
	});

	it('type the Meta events of the WhatsApp and Facebook triggers', () => {
		const source = `${header}
import { facebookTrigger } from '@n8n/nodes/facebookTrigger';
import { whatsAppTrigger } from '@n8n/nodes/whatsAppTrigger';
export default workflow(
	'Meta',
	whatsAppTrigger.trigger({ name: 'WhatsApp', updates: ['messages'] }).andThen(
		set({ name: 'Ask', fields: { from: (item) => item.messages?.[0]?.from ?? '', text: (item) => item.messages?.[0]?.text?.body ?? '' } }),
	),
	facebookTrigger.trigger({ name: 'Page', appId: '1', object: 'page', fields: ['feed'] }).andThen(
		set({ name: 'Comment', fields: { by: (item) => item.changes?.[0]?.value.from?.name ?? '', text: (item) => item.changes?.[0]?.value.message ?? '' } }),
	),
);
`;
		expect(typeErrors(source)).toEqual([]);
		const wrong = `${header}
import { whatsAppTrigger } from '@n8n/nodes/whatsAppTrigger';
whatsAppTrigger.trigger({ name: 'A', updates: ['message'] });
whatsAppTrigger.trigger({ name: 'B', updates: ['messages'] }).andThen(set({ name: 'C', fields: { x: (item) => item.messages?.[0]?.body } }));
whatsAppTrigger.trigger({ name: 'D', updates: ['messages'] }).andThen(set({ name: 'E', fields: { x: (item) => item.messages[0].from } }));
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
const flow = ${incident};
flow.andThen(set({ name: 'A', fields: { x: (_item, $) => $('Webhook').body.severty } }));
flow.andThen(set({ name: 'B', fields: { x: (item) => item.body.severity === 'critcal' } }));
flow.andThen(set({ name: 'C', fields: { x: (item) => item.body.count.toFixed() } }));
webhook.trigger({ name: 'D', path: 'x', httpMethod: 'POSTT' });
flow.andThen(webhook.respond({ name: 'G', respondWith: 'redirect' }));
flow.andThen(webhook.respond({ name: 'H', respondWith: 'text', responseBody: { ok: true } }));
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
