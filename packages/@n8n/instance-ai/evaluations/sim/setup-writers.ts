// ---------------------------------------------------------------------------
// The three LLM steps that prepare a simulated run:
//   1. world writer: the services' starting data, from the user's request and
//      the scenario ONLY (never the workflow), so a workflow that targets the
//      wrong resource finds it missing, as it would for a real user;
//   2. binder: points the built workflow's setup placeholders at seeded
//      resources, and adopts the workflow's names where the case leaves a name open;
//   3. trigger writer: the start node and the items it emits.
// What each service accepts comes from its manifest, not from this file.
// ---------------------------------------------------------------------------

import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import { createEvalAgent } from '../../src';
import type { SimService } from './sim-admin-client';
import type { WorkflowResponse } from '../clients/n8n-client';
import type { ExecutionScenario } from '../types';

const WORLD_FORMAT = `A world document is one JSON object, written once and projected into each service:
{"world_version": 1, "timezone": "Europe/Berlin",
 "persona": {"ref": "person:me", "name": "...", "email": "...@acme.test"},
 "people": [{"ref": "person:jo", "name": "...", "email": "...", "org": "org:acme"}],
 "orgs": [{"ref": "org:acme", "name": "Acme GmbH", "domain": "acme.test"}],
 "entities": [{"ref": "<kind>:<name>", "kind": "<one of the service's kinds>", ...fields from the kind's schema}],
 "placement": {"<entity ref>": ["<service slug>"]},
 "timeline": [{"at": "+10m", "ref": "<entity ref>", "action": "deliver", "service": "<slug>"}],
 "native": {"<service>": {...}}}
Refs are stable logical names; the service assigns native ids and returns a ref -> id map. Times are relative
("-3d", "+1d 10:00") and resolve against the real clock: never set a fixed "now". "native" passes service-specific
objects through as-is, for what the neutral kinds cannot express; follow the service's native schema.`;

const cap = (value: unknown, max: number): string => {
	const text = typeof value === 'string' ? value : JSON.stringify(value);
	return text.length > max ? `${text.slice(0, max)} …` : text;
};

/** What one service accepts, from its manifest: kinds, schemas, an example world. */
export function serviceMaterial(service: SimService): string {
	const lines = [`### Service "${service.slug}" (hosts: ${service.hosts.join(', ')})`];
	if (service.kinds.length > 0) lines.push(`Neutral kinds it accepts: ${service.kinds.join(', ')}`);
	if (service.kindSchemas.length > 0) lines.push(`Kind schemas: ${cap(service.kindSchemas, 6000)}`);
	if (service.native) lines.push(`Native block schema: ${cap(service.native, 5000)}`);
	if (service.example) lines.push(`Example world: ${cap(service.example, 6000)}`);
	if (service.events?.length) lines.push(`Events (arrivals): ${cap(service.events, 6000)}`);
	if (service.kinds.length === 0 && !service.native && !service.example) {
		lines.push(
			'It does not describe its kinds. Use the neutral kinds that fit (email_thread, table, chat_message, channel, document, crm_contact, task); a seeding error names what it rejects.',
		);
	}
	return lines.join('\n');
}

export function userRequestOf(conversation: unknown): string {
	if (!Array.isArray(conversation)) return '';
	return conversation
		.map((turn: unknown) => {
			if (typeof turn === 'string') return turn;
			if (typeof turn === 'object' && turn !== null && 'role' in turn && 'text' in turn) {
				return turn.role === 'user' && typeof turn.text === 'string' ? turn.text : '';
			}
			return '';
		})
		.filter((t) => t !== '')
		.join('\n---\n')
		.slice(0, 6000);
}

const scenarioText = (scenario: ExecutionScenario): string =>
	[
		`## Scenario "${scenario.name}"`,
		`description: ${scenario.description}`,
		`dataSetup: ${scenario.dataSetup}`,
		`successCriteria: ${scenario.successCriteria}`,
	].join('\n');

// Structured output closes every object (additionalProperties: false), so free-form JSON travels as strings.
const worldEntriesSchema = z.array(
	z.object({
		service: z.string().describe('the service slug'),
		world: z.string().describe('the world document, as a JSON object'),
	}),
);

/** Parses JSON-string worlds; an entry that is not a JSON object is left out. */
function parseWorlds(entries: Array<{ service: string; world: string }>) {
	const worlds: Record<string, Record<string, unknown>> = {};
	for (const { service, world } of entries) {
		try {
			const parsed: unknown = JSON.parse(world);
			if (isRecord(parsed)) worlds[service] = parsed;
		} catch {}
	}
	return worlds;
}

const worldPlanOutputSchema = z.object({
	worlds: worldEntriesSchema.describe('One world document per listed service.'),
	arrivals: z
		.array(
			z.object({
				service: z.string().describe('the service slug'),
				type: z.string().describe("one of the service's events"),
				params: z.string().describe('the event params, as a JSON object'),
			}),
		)
		.describe(
			'Records that come in from outside during the scenario and start the workflow, in order. Not in the worlds.',
		),
	faults: z
		.array(
			z.object({
				service: z.string(),
				type: z.enum(['force_429', 'force_status', 'revoke_tokens']),
				code: z.number().int().optional().describe('force_status only: 500-599'),
				count: z.number().int().optional().describe('how many of the next calls fail'),
			}),
		)
		.describe('Failures the scenario describes. A missing record is not a fault.'),
	idSubstitutions: z
		.array(z.object({ text: z.string(), ref: z.string() }))
		.describe('Ids the request or scenario names, with the world ref each stands for.'),
	notes: z.string(),
});

const worldPlanSchema = worldPlanOutputSchema.extend({
	worlds: z.record(z.string(), z.record(z.string(), z.unknown())),
	arrivals: z.array(
		z.object({
			service: z.string(),
			type: z.string(),
			params: z.record(z.string(), z.unknown()),
		}),
	),
});

export type WorldPlan = z.infer<typeof worldPlanSchema>;

/** A world plan read back from the cache; `undefined` when the file is not one. */
export function parseWorldPlan(text: string): WorldPlan | undefined {
	try {
		const parsed = worldPlanSchema.safeParse(JSON.parse(text));
		return parsed.success ? parsed.data : undefined;
	} catch {
		return undefined;
	}
}

export const WORLD_INSTRUCTIONS = `You prepare simulated SaaS services for one test scenario of an n8n workflow evaluation.
The workflow under test is NOT shown to you on purpose. Write each service's starting data from the user's request and
the scenario alone, the way the real user's accounts would look. A workflow that uses a resource the request and the
scenario never mention must find it missing, as it would for a real user.

Write one world document per listed service, following its kinds, schemas and example. Put every record the
scenario's dataSetup describes into the worlds, with the exact values given. Create the containers the request or the
scenario names or implies (a channel, a spreadsheet and its tabs, a database), with the names they use; a container the
workflow must read or write but nobody names (the sheet it logs to, the channel it posts in) gets a plausible name, since
the real user picks one at setup. Add only a small
realistic background (the persona; a chat workspace's #general). When the scenario says something does not exist, is
empty, was deleted or cannot be found, leave it out: the service answers like the real one.

When the scenario says records ARRIVE during the scenario and start the workflow (an email comes in, someone adds a
row), they are not starting data: write each as an arrival, with the service's event that brings it (from its listed
events) and that event's params. Refer to world records by their refs, and to a spreadsheet's tab by its title.
Everything that exists before the scenario starts goes in the worlds. Events are never failures.

When the scenario says a service FAILS, add a fault instead of data: a rate limit is force_429; an outage or server
error is force_status with its 5xx code; revoked access, an invalid or expired credential is revoke_tokens. "count" is
how many of the service's next calls fail; a failure that then recovers is 1. A missing record is not a fault.

The services assign their own ids. When the request, dataSetup or successCriteria names an id a call will use (a
spreadsheet, channel, user, database, page or message id), list it in idSubstitutions with the world ref it stands
for; the harness rewrites that id to the service's id. Whole ids only; never a short number that is not an id.

${WORLD_FORMAT}`;

/** How the world writer revises a plan to a build's names; part of the adopted world's cache key. */
export const ADOPT_INSTRUCTIONS = [
	"Where the request and the scenario leave a container's name open (not named, named loosely, or picked at setup),",
	'rename the container to the name the workflow uses. Add a container only when the case implies one without naming',
	'it (a review sheet the request mentions) and the worlds lack it; give it the columns the workflow writes. When the',
	"case names the container for that purpose (post to #revenue), a different workflow name is the workflow's mistake:",
	'leave the worlds as they are. Column headers the case leaves open take the column names the workflow maps. Nodes',
	'that share a document field use one resource: their tabs belong in that one resource. Never change a name the',
	'request or the scenario gives exactly, a data value, a fault or an id substitution, and never add what the',
	'scenario says is missing. Arrivals follow the renames. Answer with the full plan.',
].join(' ');

export async function writeWorldPlan(input: {
	services: SimService[];
	/** One line per credential the run uses: service, n8n type and who it signs in as. */
	credentials: string[];
	userRequest: string;
	scenario: ExecutionScenario;
	/** How the run starts, when that decides what is starting data. */
	runStart?: string;
	previousErrors?: string[];
	previousPlan?: WorldPlan;
	/** The built workflow's resource fields: revise `previousPlan` to the names the case leaves open. */
	adoptFrom?: string[];
}): Promise<WorldPlan> {
	const prompt = [
		`## Services to prepare: ${input.services.map((s) => s.slug).join(', ')}`,
		...input.services.map(serviceMaterial),
		'## Who n8n signs in as',
		[
			'Each line is a credential this run uses. A user or member credential acts as the persona and sees',
			"what the persona sees; a bot credential acts as the app's bot. When the scenario says a call fails",
			'for lack of access, take that access away from THIS identity, so the service refuses it as it really would.',
		].join(' '),
		...input.credentials,
		"## The user's request",
		input.userRequest,
		scenarioText(input.scenario),
		...(input.runStart
			? [
					'## How the run starts',
					`The workflow starts from ${input.runStart}. It reacts only to records that arrive after it starts: write the records the scenario's run handles (the email it processes, the row it reacts to) as arrivals, never in the worlds. Arrivals carry no past time.`,
				]
			: []),
		...(input.previousErrors && input.previousPlan
			? [
					'## Your previous answer failed to seed',
					cap(input.previousPlan, 20000),
					'Errors:',
					...input.previousErrors,
					'Fix the worlds and answer again in full.',
				]
			: []),
		...(input.adoptFrom && input.previousPlan
			? [
					"## Adopt the workflow's names",
					'You wrote this plan without the workflow:',
					cap(input.previousPlan, 20000),
					'The built workflow now exists. Its resource fields, per node (<parameter> = value (mode)):',
					...input.adoptFrom,
					ADOPT_INSTRUCTIONS,
				]
			: []),
	].join('\n\n');
	const agent = createEvalAgent('eval-sim-world-writer', {
		instructions: WORLD_INSTRUCTIONS,
		cache: true,
	}).structuredOutput(worldPlanOutputSchema);
	const result = await agent.generate(prompt);
	const plan = worldPlanOutputSchema.safeParse(result.structuredOutput);
	if (!plan.success) throw new Error(`world writer returned no valid plan: ${plan.error.message}`);
	return {
		...plan.data,
		worlds: parseWorlds(plan.data.worlds),
		arrivals: plan.data.arrivals.map((arrival) => {
			let params: unknown;
			try {
				params = JSON.parse(arrival.params);
			} catch {}
			return { ...arrival, params: isRecord(params) ? params : {} };
		}),
	};
}

const bindingSchema = z.object({
	bindings: z.array(
		z.object({
			node: z.string(),
			parameter: z.string().describe('dot path under node.parameters'),
			ref: z.string().optional().describe('a seeded world ref; the harness sets its native id'),
			value: z.string().optional().describe('a literal name, for a parameter that takes a name'),
		}),
	),
	triggerIds: z
		.array(z.object({ field: z.string(), ref: z.string(), attr: z.string().optional() }))
		.describe('Trigger output fields that must carry a seeded record id.'),
});

export type BindingPlan = z.infer<typeof bindingSchema>;

const BIND_INSTRUCTIONS = `You connect a built n8n workflow to simulated services that already hold the user's data.
You get the workflow's nodes, the seeded worlds with each ref's native id, and the scenario.

1. bindings: bind EVERY field listed under "Setup fields" (an empty value or resource locator, a placeholder, or an id
   that the request and the scenario never give, so it belongs to the build instance), and only those. Never bind a parameter that holds an expression (a value starting with "="):
   it computes its value at run time. Give each a "ref" (its native id is set) or a "value" (a literal,
   for a parameter that takes a name or plain text). A spreadsheet tab (sheetName) binds by its tab title as a value,
   never to a spreadsheet ref. Map each placeholder to the seeded resource the request and the scenario mean; when they
   name none, the user would pick one at setup: choose the most suitable seeded resource of that kind. NEVER list a
   parameter that already names a resource by name or by an id the request or scenario gives: it stays as written, so
   a workflow that targets the wrong resource fails as it would for a real user.
2. triggerIds: the harness writes the trigger's output item from the scenario. When a later node acts on the record
   behind the trigger by id (replies to the email, marks it read, downloads the file), list the trigger output fields
   that must carry the seeded record's id, with its ref (and "attr", a path into the record in the seeded state, when
   the id is a field inside it, such as the id of a message inside a thread).
A node that names a tab binds its document field to the resource that holds that tab.`;

export async function writeBindingPlan(input: {
	workflow: WorkflowResponse;
	worlds: Record<string, unknown>;
	refs: Record<string, string>;
	/** What the services serve after seeding, per service: records with their native ids. */
	state: Record<string, unknown>;
	setupFields: Array<{ path: string; value: string }>;
	userRequest: string;
	scenario: ExecutionScenario;
}): Promise<BindingPlan> {
	const nodes = input.workflow.nodes.map((n) => ({
		name: n.name,
		type: n.type,
		typeVersion: n.typeVersion,
		parameters: n.parameters,
	}));
	const prompt = [
		'## Workflow nodes',
		cap(nodes, 30000),
		'## Seeded worlds',
		cap(input.worlds, 20000),
		'## Ref -> native id',
		cap(input.refs, 8000),
		'## Seeded state (what each service serves, with native ids)',
		cap(input.state, 12000),
		'## Setup fields (<node>.<parameter path> = current value)',
		...(input.setupFields.length > 0
			? input.setupFields.map((f) => `- ${f.path} = ${JSON.stringify(f.value)}`)
			: ['(none found)']),
		"## The user's request",
		input.userRequest,
		scenarioText(input.scenario),
	].join('\n\n');
	const agent = createEvalAgent('eval-sim-binder', {
		instructions: BIND_INSTRUCTIONS,
		cache: true,
	}).structuredOutput(bindingSchema);
	const result = await agent.generate(prompt);
	const plan = bindingSchema.safeParse(result.structuredOutput);
	if (!plan.success) throw new Error(`binder returned no valid plan: ${plan.error.message}`);
	return plan.data;
}

const triggerSchema = z.object({
	startNode: z.string().describe('the trigger node this scenario starts from'),
	items: z.array(z.string()).describe('the json of each item it emits, each as a JSON object'),
});

export interface TriggerInput {
	startNode: string;
	items: Array<Record<string, unknown>>;
}

const TRIGGER_INSTRUCTIONS = `You write the input of one n8n workflow test run.
Pick the trigger node the scenario starts from, and write the items it emits, exactly as that n8n trigger node outputs
them (field names, nesting and types of the real node), with the values the scenario's dataSetup gives. A schedule or
manual trigger emits one item with the fields that node really outputs. A webhook or form trigger emits what n8n puts
in its item for the request the scenario describes. When the dataSetup ends with trigger ids, use those exact values
for those fields. Field names come from the trigger's own definition (its form fields, the payload the scenario
describes), never from the expressions of the nodes that read them: a reader that asks for a field the trigger does
not emit is a workflow mistake to keep. When a field holds the id or URL of a resource that later nodes read or write
(a spreadsheet, a channel, a record) and the scenario gives none, use a seeded resource's native id (inside the
vendor's usual URL for a URL field). Emit zero items only when the scenario says the trigger fires with nothing.`;

export async function writeTriggerInput(input: {
	workflow: WorkflowResponse;
	triggerNodes: string[];
	scenario: ExecutionScenario;
	dataSetup: string;
	refs: Record<string, string>;
}): Promise<TriggerInput> {
	const triggers = input.workflow.nodes.filter((n) => input.triggerNodes.includes(n.name));
	const downstream = Object.entries(input.workflow.connections ?? {})
		.filter(([source]) => input.triggerNodes.includes(source))
		.flatMap(([, outputs]) => JSON.stringify(outputs).match(/"node":"[^"]+"/g) ?? []);
	const readers = input.workflow.nodes
		.filter((n) => downstream.some((d) => d.includes(`"${n.name}"`)))
		.map((n) => ({ name: n.name, type: n.type, parameters: n.parameters }));
	const prompt = [
		'## Trigger nodes',
		cap(
			triggers.map((n) => ({
				name: n.name,
				type: n.type,
				typeVersion: n.typeVersion,
				parameters: n.parameters,
			})),
			8000,
		),
		'## Nodes that read the trigger output',
		cap(readers, 12000),
		'## Seeded resources (ref -> native id)',
		cap(input.refs, 6000),
		scenarioText({ ...input.scenario, dataSetup: input.dataSetup }),
	].join('\n\n');
	const agent = createEvalAgent('eval-sim-trigger-writer', {
		instructions: TRIGGER_INSTRUCTIONS,
		cache: true,
	}).structuredOutput(triggerSchema);
	const result = await agent.generate(prompt);
	const trigger = triggerSchema.safeParse(result.structuredOutput);
	if (!trigger.success)
		throw new Error(`trigger writer returned no valid input: ${trigger.error.message}`);
	const items = trigger.data.items.map((item): unknown => JSON.parse(item));
	if (!items.every(isRecord))
		throw new Error('trigger writer returned an item that is not an object');
	return { startNode: trigger.data.startNode, items };
}
