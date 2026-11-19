// ---------------------------------------------------------------------------
// Runs one execution scenario against simulated services instead of the LLM mock.
//
// The build happens as usual. The scenario then runs on the build instance, in
// the environment the workflow was built in: the eval instance runs the stored
// workflow with setup fields bound to seeded data and the credentials the sim
// server issued, and sends every vendor request of the run to the sim server.
// Per run: fresh service data seeded from the scenario, the trigger's items, the
// run, and the evidence the verifier reads.
// ---------------------------------------------------------------------------

import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
	buildCatalog,
	classifyNode,
	credentialProbes,
	type CredentialSource,
	indexNodeTypes,
	type NodeCoverage,
	type NodeTypeIndex,
	type SimCatalog,
	versionInfo,
} from './coverage';
import {
	attachSimEvents,
	caseFields,
	type CaseFields,
	flagSimRun,
	type ServiceEvent,
	type SimFlags,
} from './evidence';
import {
	ADOPT_INSTRUCTIONS,
	bareId,
	type BindingPlan,
	parseWorldPlan,
	type TriggerInput,
	WORLD_INSTRUCTIONS,
	type WorldPlan,
	writeBindingPlan,
	writeTriggerInput,
	writeWorldPlan,
} from './setup-writers';
import { type SimArrival, SimAdminClient, type SimService } from './sim-admin-client';
import type { CliArgs } from '../cli/args';
import type { N8nClient, WorkflowNodeResponse, WorkflowResponse } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';
import type { ExecutionScenario } from '../types';

export interface SimOptions {
	/** Admin API of the sim server. */
	adminUrl: string;
	adminToken: string;
	/** Where written worlds are kept, so later runs of the same scenario reuse them. */
	worldCacheDir: string;
	/** Keep the sim server's tenants after the run, for inspection. */
	keepArtifacts?: boolean;
}

/** Sim options from the CLI args; `undefined` unless `--mocking sim`. */
export function simOptionsFromArgs(args: CliArgs): SimOptions | undefined {
	if (args.mocking !== 'sim' || !args.simAdminUrl) return undefined;
	const adminToken = process.env.N8N_EVAL_SIM_TOKEN ?? process.env.SIM_HARNESS_TOKEN;
	if (!adminToken) {
		throw new Error('--mocking sim needs the sim server admin token in N8N_EVAL_SIM_TOKEN');
	}
	return {
		adminUrl: args.simAdminUrl,
		adminToken,
		worldCacheDir: args.simWorldCache ?? path.join(args.outputDir ?? process.cwd(), 'sim-worlds'),
		keepArtifacts: args.keepWorkflows,
	};
}

export interface SimCaseInfo {
	fileSlug: string;
	userRequest: string;
}

/** What the verifier gets on top of node results: the services' side of the run. */
export interface SimScenarioReport {
	services: string[];
	worldNotes: string;
	startingWorlds: Record<string, unknown>;
	/** Simulated-user actions sent during the scenario; for a polling trigger, after its first poll. */
	arrivals: SimArrival[];
	arrivalsAfterFirstPoll: boolean;
	finalState: Record<string, unknown>;
	unattributed: ServiceEvent[];
	flags: SimFlags;
}

export type SimScenarioOutcome =
	| { kind: 'ran'; evalResult: InstanceAiEvalExecutionResult; report: SimScenarioReport }
	| { kind: 'not-covered'; reasons: string[] };

interface SimContext {
	admin: SimAdminClient;
	services: SimService[];
	catalog: SimCatalog;
	extraSources: Map<string, CredentialSource>;
	probed: Set<string>;
	/** Node descriptions per build instance (lanes may run different n8n builds). */
	nodeTypesByLane: Map<string, Promise<NodeTypeIndex>>;
	options: SimOptions;
}

const contexts = new Map<string, Promise<SimContext>>();

async function createContext(options: SimOptions): Promise<SimContext> {
	const admin = new SimAdminClient(options.adminUrl, options.adminToken);
	const services = await admin.discover();
	if (services.length === 0)
		throw new Error(`sim server at ${options.adminUrl} serves no services`);
	const extraSources = new Map<string, CredentialSource>();
	return {
		admin,
		services,
		catalog: buildCatalog(services, extraSources),
		extraSources,
		probed: new Set(),
		nodeTypesByLane: new Map(),
		options,
	};
}

async function nodeTypesFor(context: SimContext, client: N8nClient): Promise<NodeTypeIndex> {
	let index = context.nodeTypesByLane.get(client.baseUrl);
	if (!index) {
		index = client.getNodeTypes().then(indexNodeTypes);
		index.catch(() => context.nodeTypesByLane.delete(client.baseUrl));
		context.nodeTypesByLane.set(client.baseUrl, index);
	}
	return await index;
}

async function contextFor(options: SimOptions): Promise<SimContext> {
	const key = options.adminUrl;
	let context = contexts.get(key);
	if (!context) {
		context = createContext(options);
		context.catch(() => contexts.delete(key));
		contexts.set(key, context);
	}
	return await context;
}

const PERSONA_WORLD = {
	world_version: 1,
	persona: { ref: 'person:me', name: 'Eval Owner', email: 'owner@acme.test' },
};

const newToken = () => randomBytes(16).toString('hex');

/** Prefix of the eval instance's warnings about what the run could not simulate. */
const SIM_NOT_COVERED = 'SIM NOT COVERED:';
/** A polling trigger that found no record: the run stopped at the trigger, as an empty poll does in production. */
export const TRIGGER_FOUND_NOTHING = 'TRIGGER FOUND NOTHING:';

/**
 * Finds which service issues an n8n credential type that no manifest maps yet, by
 * asking each service that leaves its credential types unnamed. Remembered per process.
 */
async function probeCredentialType(context: SimContext, type: string): Promise<void> {
	if (context.probed.has(type) || context.catalog.credentialSource(type)) return;
	context.probed.add(type);
	const candidates = context.services.filter((s) => !s.credentialInfo.some((c) => c.n8nType));
	for (const service of candidates) {
		// A unique id: runs that share the sim server probe at the same time.
		const tenant = `probe-${newToken().slice(0, 12)}`;
		const token = newToken();
		try {
			await context.admin.createTenant(service, tenant, token, PERSONA_WORLD);
			for (const request of credentialProbes(type)) {
				try {
					const credential = await context.admin.issueCredential(service, tenant, token, request);
					if (credential.type === type) {
						context.extraSources.set(type, { service, request });
						return;
					}
				} catch {
					// Not this product name: try the next one.
				}
			}
		} catch {
			// The service refused even a persona-only tenant: it cannot issue this type.
		} finally {
			await context.admin.deleteTenant(service, tenant).catch(() => {});
		}
	}
}

const sha = (value: unknown) =>
	createHash('sha1').update(JSON.stringify(value)).digest('hex').slice(0, 12);

const safeName = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80);

interface SeededTenants {
	base: string;
	token: string;
	refs: Record<string, string>;
	views: Map<string, Record<string, unknown>>;
	errors: string[];
}

const tenantOf = (base: string, service: SimService) => `${base}-${service.slug}`;

// One tenant id per service: the sim server cannot yet hold one world across its core and legacy fakes.
async function seed(
	context: SimContext,
	services: SimService[],
	worlds: Record<string, unknown>,
): Promise<SeededTenants> {
	const seeded: SeededTenants = {
		base: `ev-${newToken().slice(0, 12)}`,
		token: newToken(),
		refs: {},
		views: new Map(),
		errors: [],
	};
	for (const service of services) {
		try {
			const { refs, view } = await context.admin.createTenant(
				service,
				tenantOf(seeded.base, service),
				seeded.token,
				worlds[service.slug] ?? PERSONA_WORLD,
			);
			Object.assign(seeded.refs, refs);
			seeded.views.set(service.slug, view);
		} catch (error) {
			seeded.errors.push(
				`${service.slug}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	return seeded;
}

/** Sends the scenario's arrivals to the seeded tenants, world refs resolved to the services' ids; returns the errors. */
async function applyArrivals(
	context: SimContext,
	services: SimService[],
	seeded: SeededTenants,
	arrivals: SimArrival[],
): Promise<string[]> {
	const errors = arrivals
		.filter((a) => !services.some((s) => s.slug === a.service))
		.map((a) => `arrival ${a.type}: no service ${a.service} in this run`);
	for (const service of services) {
		const events = arrivals
			.filter((a) => a.service === service.slug)
			.map(({ type, params }) => {
				const resolved = structuredClone(params);
				substituteStrings(resolved, (text) => seeded.refs[text] ?? text);
				return { type, params: resolved };
			});
		if (events.length === 0) continue;
		await context.admin
			.applyEvents(service, tenantOf(seeded.base, service), seeded.token, events)
			.catch((error: unknown) =>
				errors.push(
					`${service.slug} arrivals: ${error instanceof Error ? error.message : String(error)}`,
				),
			);
	}
	return errors;
}

async function dropTenants(context: SimContext, services: SimService[], seeded: SeededTenants) {
	await Promise.all(
		services.map(
			async (s) => await context.admin.deleteTenant(s, tenantOf(seeded.base, s)).catch(() => {}),
		),
	);
}

/**
 * Written once per scenario and kept on disk; the same worlds seed every run. With
 * `adopt`, the base plan is revised once per build to the container names it uses
 * where the case leaves them open.
 */
async function worldPlanFor(
	context: SimContext,
	services: SimService[],
	credentials: string[],
	caseInfo: SimCaseInfo,
	scenario: ExecutionScenario,
	logger: EvalLogger,
	/** How the run starts, when that decides what is starting data: a polling trigger's service. */
	runStart: string | undefined,
	adopt?: { base: WorldPlan; resources: string[] },
): Promise<WorldPlan> {
	const key = sha([
		WORLD_INSTRUCTIONS,
		caseInfo.userRequest,
		scenario,
		services.map((s) => s.slug),
		credentials,
		adopt ? [ADOPT_INSTRUCTIONS, adopt.resources] : null,
		...(runStart ? [runStart] : []),
	]);
	// Keyed by content only: copies of a case (a variant build, another suite) share one world.
	const file = path.join(
		context.options.worldCacheDir,
		`${safeName(scenario.name)}.${key}${adopt ? '.adopted' : ''}.json`,
	);
	const cached = await readFile(file, 'utf8').then(parseWorldPlan, () => undefined);
	if (cached) return cached;
	let plan: WorldPlan | undefined;
	let errors: string[] = [];
	for (let attempt = 1; attempt <= 3; attempt++) {
		plan = await writeWorldPlan({
			services,
			credentials,
			userRequest: caseInfo.userRequest,
			scenario,
			runStart,
			...(plan && errors.length > 0
				? {
						previousPlan: plan,
						previousErrors: errors,
						...(adopt ? { adoptFrom: adopt.resources } : {}),
					}
				: adopt
					? { previousPlan: adopt.base, adoptFrom: adopt.resources }
					: {}),
		});
		const worlds = plan.worlds;
		const check = await seed(context, services, worlds);
		const arrivalErrors =
			check.errors.length === 0 ? await applyArrivals(context, services, check, plan.arrivals) : [];
		await dropTenants(context, services, check);
		errors = [
			...services
				.filter((s) => !worlds[s.slug])
				.map((s) => `${s.slug}: no world document, or one that is not a JSON object`),
			...check.errors,
			...arrivalErrors,
		];
		if (errors.length === 0) break;
		logger.warn(
			`    [${scenario.name}] sim world attempt ${String(attempt)} did not seed: ${errors.join('; ')}`,
		);
	}
	if (!plan || errors.length > 0) throw new Error(`sim world did not seed: ${errors.join('; ')}`);
	await mkdir(context.options.worldCacheDir, { recursive: true });
	// Write then rename: another run reading the shared cache never sees half a file.
	const partial = `${file}.${newToken().slice(0, 8)}.tmp`;
	await writeFile(partial, JSON.stringify(plan, null, 2));
	await rename(partial, file);
	return plan;
}

const bindingCache = new Map<string, Promise<BindingPlan>>();

/** Per build and scenario: the build decides which fields are setup placeholders. */
async function bindingFor(
	context: SimContext,
	services: SimService[],
	workflow: WorkflowResponse,
	plan: WorldPlan,
	caseInfo: SimCaseInfo,
	scenario: ExecutionScenario,
	fields: CaseFields,
) {
	const key = sha([workflow.nodes, plan.worlds, caseInfo.userRequest, scenario, fields.setup]);
	let cached = bindingCache.get(key);
	if (!cached) {
		cached = (async () => {
			const check = await seed(context, services, plan.worlds);
			try {
				// The served records show ids the ref map lacks (a message inside a thread).
				const state: Record<string, unknown> = {};
				for (const service of services) {
					state[service.slug] = await context.admin
						.state(service, tenantOf(check.base, service), check.token)
						.catch(() => ({}));
				}
				return await writeBindingPlan({
					workflow,
					worlds: plan.worlds,
					refs: check.refs,
					state,
					setupFields: fields.setup,
					userRequest: caseInfo.userRequest,
					scenario,
				});
			} finally {
				await dropTenants(context, services, check);
			}
		})();
		cached.catch(() => bindingCache.delete(key));
		bindingCache.set(key, cached);
	}
	return await cached;
}

/** The value at a parameter path; a resource locator gives its `value`. */
function getParameter(params: Record<string, unknown>, dotPath: string): unknown {
	const found = dotPath
		.replace(/\.value$/, '')
		.split('.')
		.reduce<unknown>((o, k) => (isRecord(o) ? o[k] : undefined), params);
	return isRecord(found) && found.__rl ? found.value : found;
}

/** Sets a bound value; a resource locator switches to the matching mode. */
function setParameter(
	params: Record<string, unknown>,
	dotPath: string,
	value: string,
	mode: string,
) {
	const keys = dotPath.replace(/\.value$/, '').split('.');
	let target: Record<string, unknown> = params;
	for (const key of keys.slice(0, -1)) {
		const next = target[key];
		if (!isRecord(next)) return;
		target = next;
	}
	const last = keys[keys.length - 1];
	const current = target[last];
	target[last] = isRecord(current) && current.__rl ? { ...current, mode, value } : value;
}

function findRecord(node: unknown, ref: string): Record<string, unknown> | undefined {
	if (!isRecord(node) && !Array.isArray(node)) return undefined;
	if (isRecord(node) && node.ref === ref) return node;
	for (const value of Object.values(node)) {
		const found = findRecord(value, ref);
		if (found) return found;
	}
	return undefined;
}

function resolveRef(
	ref: string,
	attr: string | undefined,
	refs: Record<string, string>,
	state: Record<string, unknown>,
): string | undefined {
	if (attr) {
		const record = findRecord(state, ref);
		const value = attr
			.split('.')
			.reduce<unknown>((o, k) => (isRecord(o) ? o[k] : undefined), record);
		return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
	}
	const id = refs[ref];
	return id === undefined ? undefined : bareId(id);
}

const replaceWholeId = (text: string, from: string, to: string) =>
	text.replace(
		new RegExp(`(?<![\\w-])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`, 'g'),
		to,
	);

/** Rewrites every string inside `value` in place (node parameters hold ids anywhere, URLs included). */
function substituteStrings(value: unknown, substitute: (text: string) => string): void {
	if (Array.isArray(value)) {
		value.forEach((item, index) => {
			if (typeof item === 'string') value[index] = substitute(item);
			else substituteStrings(item, substitute);
		});
	} else if (isRecord(value)) {
		for (const [key, item] of Object.entries(value)) {
			if (typeof item === 'string') value[key] = substitute(item);
			else substituteStrings(item, substitute);
		}
	}
}

/** Runs one scenario against the simulated services, on the build instance. */
export async function runScenarioInSim(input: {
	options: SimOptions;
	buildClient: N8nClient;
	workflow: WorkflowResponse;
	scenario: ExecutionScenario;
	caseInfo: SimCaseInfo;
	/** Data tables the harness reseeded with this scenario's rows; the server fills the others. */
	seededDataTableIds?: string[];
	timeoutMs: number;
	logger: EvalLogger;
}): Promise<SimScenarioOutcome> {
	const { scenario, caseInfo, logger, workflow } = input;
	const context = await contextFor(input.options);
	const nodeTypes = await nodeTypesFor(context, input.buildClient);
	const enabled = workflow.nodes.filter((n) => !n.disabled);
	const isTrigger = (n: WorkflowNodeResponse) =>
		nodeTypes.get(n.type)?.isTrigger ?? /Trigger$/.test(n.type);
	const triggers = enabled.filter(isTrigger).map((n) => n.name);
	const actions = enabled.filter((n) => !isTrigger(n));

	// Triggers too: n8n checks the start node's credential even when the run starts from its items.
	for (const node of enabled) {
		const info = nodeTypes.get(node.type.replace(/Tool$/, ''));
		for (const option of versionInfo(info, node.typeVersion)?.credentials ?? []) {
			await probeCredentialType(context, option.type);
		}
	}
	const coverage = new Map<string, NodeCoverage>(
		enabled.map((n) => [n.name, classifyNode(n, nodeTypes, context.catalog)]),
	);
	const reasons = [...coverage.entries()]
		.filter(
			(entry): entry is [string, Extract<NodeCoverage, { kind: 'not-covered' }>] =>
				entry[1].kind === 'not-covered',
		)
		.map(([name, c]) => `${name}: ${c.reason}`);
	if (actions.some((n) => n.parameters?.operation === 'sendAndWait')) {
		reasons.push('a send-and-wait node waits for a person to answer');
	}
	if (triggers.length === 0) reasons.push('the workflow has no trigger node to start from');
	if (reasons.length > 0) return { kind: 'not-covered', reasons };

	const services = [
		...new Map(
			[...coverage.values()]
				.filter((c): c is Extract<NodeCoverage, { kind: 'service' }> => c.kind === 'service')
				.map((c) => [c.service.slug, c.service]),
		).values(),
	];

	// The world writer models access for the identities n8n signs in as (a bot is not every member).
	const credentials = [
		...new Set(
			[...coverage.values()].flatMap((c) => {
				if (c.kind !== 'service' || !c.credentialType) return [];
				const source = context.catalog.credentialSource(c.credentialType);
				const info = source?.service.credentialInfo.find((i) => i.id === source.request.credential);
				const who = /\b(bot|app)\b/i.test(info?.doc ?? '') ? '' : '; signs in as the persona';
				return [`${c.service.slug}: ${c.credentialType}${info?.doc ? ` (${info.doc}${who})` : ''}`];
			}),
		),
	];
	// A polling trigger the simulation serves polls it, as when the workflow is published: a
	// first poll sets where it starts reading, then the scenario's records arrive.
	const polls = (name: string) =>
		coverage.get(name)?.kind === 'service' &&
		!!nodeTypes.get(enabled.find((n) => n.name === name)?.type ?? '')?.isPolling;
	const pollTrigger = triggers.length === 1 && polls(triggers[0]) ? triggers[0] : undefined;
	const pollCoverage = pollTrigger ? coverage.get(pollTrigger) : undefined;
	const runStart =
		pollCoverage?.kind === 'service'
			? `a polling trigger on ${pollCoverage.service.slug}`
			: undefined;
	const casePlan = await worldPlanFor(
		context,
		services,
		credentials,
		caseInfo,
		scenario,
		logger,
		runStart,
	);
	const caseText = [
		caseInfo.userRequest,
		scenario.description,
		scenario.dataSetup,
		scenario.successCriteria,
	].join('\n');
	const fields = caseFields(
		workflow.nodes.filter((n) => coverage.get(n.name)?.kind === 'service'),
		caseText,
	);
	let plan = casePlan;
	let adoption = '';
	if (fields.openNames.length > 0) {
		try {
			const adopted = await worldPlanFor(
				context,
				services,
				credentials,
				caseInfo,
				scenario,
				logger,
				runStart,
				{ base: casePlan, resources: fields.resources },
			);
			// Adoption renames or adds containers; faults and id substitutions stay the case's.
			plan = {
				...casePlan,
				worlds: adopted.worlds,
				arrivals: adopted.arrivals,
				notes: adopted.notes,
			};
			adoption = "; worlds adopted the build's open names";
		} catch (error) {
			adoption = `; name adoption failed, kept the case's worlds (${error instanceof Error ? error.message : String(error)})`;
		}
	}
	const worlds = plan.worlds;
	const binding = await bindingFor(context, services, workflow, plan, caseInfo, scenario, fields);
	const seeded = await seed(context, services, worlds);
	try {
		if (seeded.errors.length > 0)
			throw new Error(`sim seeding failed: ${seeded.errors.join('; ')}`);
		const tenant = (service: SimService) => tenantOf(seeded.base, service);
		const sendArrivals = async () => {
			const errors = await applyArrivals(context, services, seeded, plan.arrivals);
			if (errors.length > 0) throw new Error(`sim arrivals failed: ${errors.join('; ')}`);
		};
		const applyFaults = async () => {
			for (const fault of plan.faults) {
				const service = services.find((s) => s.slug === fault.service);
				if (!service) continue;
				if (fault.type === 'revoke_tokens')
					await context.admin.revokeTokens(service, tenant(service), seeded.token);
				if (fault.type === 'force_429')
					await context.admin.patchSettings(service, tenant(service), {
						force_429: fault.count ?? 1,
					});
				if (fault.type === 'force_status') {
					await context.admin.patchSettings(service, tenant(service), {
						force_status: { code: fault.code ?? 503, count: fault.count ?? 1 },
					});
				}
			}
		};
		// Any other trigger finds the arrived records in place when it fires.
		if (!pollTrigger) await sendArrivals();

		// The credentials the sim server issued, one per type; the eval instance stores them for the run.
		const nodes = structuredClone(workflow.nodes);
		const issuedByType = new Map<string, Record<string, unknown>>();
		const runCredentials: Array<{ nodeName: string; type: string; data: Record<string, unknown> }> =
			[];
		for (const node of nodes) {
			const c = coverage.get(node.name);
			if (c?.kind !== 'service' || !c.credentialType) continue;
			let data = issuedByType.get(c.credentialType);
			if (!data) {
				const source = context.catalog.credentialSource(c.credentialType);
				if (!source) throw new Error(`no source for ${c.credentialType}`);
				const issued = await context.admin.issueCredential(
					source.service,
					tenant(source.service),
					seeded.token,
					source.request,
				);
				data = issued.data;
				issuedByType.set(c.credentialType, data);
			}
			runCredentials.push({ nodeName: node.name, type: c.credentialType, data });
			if (c.authValue) node.parameters = { ...node.parameters, authentication: c.authValue };
		}

		// The scenario's failures hit the run, not a polling trigger's first poll.
		if (!pollTrigger) await applyFaults();

		const state: Record<string, unknown> = {};
		for (const service of services) {
			state[service.slug] = await context.admin
				.state(service, tenant(service), seeded.token)
				.catch(() => ({}));
		}
		const unresolved: string[] = [];
		const ignored: string[] = [];
		const applied = new Set<string>();
		const setupPaths = new Set(fields.setup.map((f) => f.path));
		for (const b of binding.bindings) {
			const path = `${b.node}.${b.parameter.replace(/\.value$/, '')}`;
			// Only setup fields: a value the build chose stays as written, so a wrong one fails the run.
			if (!setupPaths.has(path)) {
				ignored.push(path);
				continue;
			}
			const node = nodes.find((n) => n.name === b.node);
			const value =
				b.value ?? (b.ref ? resolveRef(b.ref, undefined, seeded.refs, state) : undefined);
			const current = node ? getParameter(node.parameters ?? {}, b.parameter) : undefined;
			// An expression computes its value at run time: it is the workflow's logic, not a setup field.
			if (typeof current === 'string' && current.startsWith('=')) continue;
			if (node && value !== undefined) {
				node.parameters ??= {};
				setParameter(node.parameters, b.parameter, value, b.value !== undefined ? 'name' : 'id');
				applied.add(path);
			} else {
				unresolved.push(`${b.node}.${b.parameter} -> ${b.ref ?? b.value ?? '?'}`);
			}
		}
		const unbound = fields.setup.filter((f) => !applied.has(f.path)).map((f) => f.path);
		logger.verbose(
			`    [${scenario.name}] sim binding: ${JSON.stringify(binding)}\n    sim worlds: ${JSON.stringify(worlds)}`,
		);
		logger.info(
			`    [${scenario.name}] sim: ${services.map((s) => s.slug).join(', ')}; ${String(applied.size)}/${String(binding.bindings.length - ignored.length)} bindings${unresolved.length > 0 ? ` (unresolved: ${unresolved.join('; ')}; refs: ${Object.keys(seeded.refs).slice(0, 12).join(', ')})` : ''}${unbound.length > 0 ? `; unbound setup fields: ${unbound.join(', ')}` : ''}${ignored.length > 0 ? `; ignored bindings outside setup fields: ${ignored.join(', ')}` : ''}${adoption}`,
		);
		const substitutions = plan.idSubstitutions
			.map((s) => ({ from: s.text, to: resolveRef(s.ref, undefined, seeded.refs, state) }))
			.filter((s): s is { from: string; to: string } => !!s.from && s.to !== undefined);
		const substitute = (text: string) =>
			substitutions.reduce((t, s) => replaceWholeId(t, s.from, s.to), text);
		for (const node of nodes) substituteStrings(node.parameters, substitute);
		const triggerIds = binding.triggerIds
			.map((t) => ({ field: t.field, id: resolveRef(t.ref, t.attr, seeded.refs, state) }))
			.filter((t) => t.id !== undefined);
		const dataSetup =
			substitute(scenario.dataSetup) +
			(triggerIds.length > 0
				? `\n\nTrigger ids: the services hold the triggering record under these exact ids, so the trigger's items must carry them: ${triggerIds.map((t) => `${t.field} = ${String(t.id)}`).join('; ')}.`
				: '');

		// Only what changed travels: the run uses the stored workflow for everything else.
		const original = new Map(
			workflow.nodes.map((n) => [n.name, JSON.stringify(n.parameters ?? {})]),
		);
		const nodeParameters = Object.fromEntries(
			nodes
				.filter((n) => JSON.stringify(n.parameters ?? {}) !== original.get(n.name))
				.map((n) => [n.name, n.parameters ?? {}]),
		);
		const simHosts = [...new Set(context.services.flatMap((service) => service.hosts))];

		let trigger: TriggerInput;
		let pollState: Record<string, unknown> | undefined;
		if (pollTrigger) {
			const firstPoll = await input.buildClient.pollWithSim(workflow.id, {
				startNodeName: pollTrigger,
				nodeParameters,
				credentials: runCredentials,
				simHosts,
			});
			if (firstPoll.error) throw new Error(`sim first poll failed: ${firstPoll.error}`);
			await sendArrivals();
			await applyFaults();
			trigger = { startNode: pollTrigger, items: [] };
			pollState = firstPoll.pollState;
		} else {
			trigger = await writeTriggerInput({
				workflow: { ...workflow, nodes },
				triggerNodes: triggers,
				scenario: { ...scenario, successCriteria: substitute(scenario.successCriteria) },
				dataSetup,
				refs: seeded.refs,
			});
		}
		const startNode = trigger.startNode;

		const result = await input.buildClient.executeWithSim(
			workflow.id,
			{
				startNodeName: startNode,
				triggerItems: trigger.items,
				...(pollState ? { pollState } : {}),
				nodeParameters,
				credentials: runCredentials,
				simHosts,
				scenarioHints: dataSetup.slice(0, 10_000),
				dataContext: JSON.stringify(worlds).slice(0, 20_000),
				...(input.seededDataTableIds?.length
					? { seededDataTableIds: input.seededDataTableIds }
					: {}),
			},
			input.timeoutMs,
		);
		const notCovered = result.hints.warnings
			.filter((w) => w.startsWith(SIM_NOT_COVERED))
			.map((w) => w.slice(SIM_NOT_COVERED.length).trim());
		if (notCovered.length > 0) return { kind: 'not-covered', reasons: notCovered };

		const events: ServiceEvent[] = [];
		const finalState: Record<string, unknown> = {};
		for (const service of services) {
			// A failed read would pass for "no calls, no writes": let it fail the run as a framework issue.
			const log = await context.admin.events(service, tenant(service), seeded.token);
			events.push(...log.map((e) => ({ ...e, service: service.slug })));
			finalState[service.slug] = await context.admin.state(service, tenant(service), seeded.token);
		}
		const typesByName = Object.fromEntries(nodes.map((n) => [n.name, n.type]));
		const unattributed = attachSimEvents(result.nodeResults, typesByName, events);
		const flags = flagSimRun(events);
		const triggerContent = pollState ? result.hints.triggerContent : (trigger.items[0] ?? {});
		const emptyPoll =
			pollState && Object.keys(triggerContent).length === 0
				? [
						`${TRIGGER_FOUND_NOTHING} "${startNode}" polled the simulated service and got no record, so the run stopped at the trigger`,
					]
				: [];

		return {
			kind: 'ran',
			evalResult: {
				...result,
				hints: {
					...result.hints,
					triggerContent,
					warnings: [
						...result.hints.warnings,
						...emptyPoll,
						...flags.gaps.map((g) => `SIMULATION GAP: ${g}`),
						...unbound.map((u) => `UNBOUND SETUP FIELD: ${u} (the harness left it unset)`),
					],
				},
			},
			report: {
				services: services.map((s) => s.slug),
				worldNotes: plan.notes,
				startingWorlds: worlds,
				arrivals: plan.arrivals,
				arrivalsAfterFirstPoll: pollTrigger !== undefined,
				finalState,
				unattributed,
				flags,
			},
		};
	} finally {
		if (!input.options.keepArtifacts) await dropTenants(context, services, seeded);
	}
}
