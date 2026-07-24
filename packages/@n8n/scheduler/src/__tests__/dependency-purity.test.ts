/**
 * Dependency purity guard: living documentation of why `@n8n/scheduler` is pure.
 *
 * ## A blueprint, not a mandate
 *
 * This is *one* way to draw modularity boundaries, not a house rule. Treat it as
 * a worked example to argue with. It is something concrete to ground a discussion
 * about where n8n wants its layers. Nobody is obliged to copy it. The value is in
 * making the trade-offs explicit enough to debate.
 *
 * ## The design choice
 *
 * `@n8n/scheduler` is the pure-logic core of the durable scheduler. Deciding
 * *what is due* (materializer, executor claim logic, reaper/fencing, recurrence
 * math, retention windows) is deliberately separated from *doing it* and from
 * *where the state lives*.
 *
 * The core is a deterministic decision engine. Every effect is handed in through
 * a port rather than reached for. Storage arrives as the executor and retention
 * stores, time as a `Clock`, tracing as a `Tracer`. The adapters that actually
 * touch a database or the host live at the edges, inside `@n8n/db` repositories
 * and the cli wiring. The core never reaches for them.
 *
 * Keeping this boundary is what makes the core cheap to test and to reuse. Unit
 * tests run with no database and no container. `fast-check` property tests and
 * Stryker mutation tests hammer the logic directly. No SQL or TypeORM detail
 * leaks in, so the same code runs on any dialect. And the whole package can be
 * lifted out of a full n8n main, which is exactly what the scheduler-worker idea
 * below relies on.
 *
 * Nothing in the language enforces this. A stray import from `@n8n/db` or a
 * `node:fs` reference would quietly erode the purity and no test would fail. This
 * test is the enforcement. The lists further down are the documentation of what
 * is allowed and, more importantly, what is excluded and why.
 *
 * ## Why bother: the constraint is the feature
 *
 * Day to day, this boundary looks like friction. It is faster to import the
 * repository and run the query right here, or to grab a service off the DI
 * container because it is already there. The payoff is not in the next hour of
 * DX. It is in what the constraint forces the codebase to become. The allowlist
 * is a forcing function that makes us think in layers instead of reaching for
 * whatever is nearest. The reasoning, step by step.
 *
 * 1. Name the one job and refuse the rest. This package decides *what is due*. It
 *    does not run the work, store the state, or wire itself into an app. Once
 *    that sentence is the contract, "should this code live here?" has an answer
 *    instead of a vibe, and unrelated concerns stop piling up in the core.
 *
 * 2. Turn every effect into a port the caller hands in. Anything that touches the
 *    world, the database, the clock, the network, tracing, arrives as an
 *    interface rather than something acquired inside. The core receives
 *    capabilities and never goes looking for them. That is why storage and time
 *    are arguments, and why `@n8n/db` and the Node I/O built-ins are excluded.
 *
 * 3. Say no to the container even when it is convenient. We do not register
 *    things in DI just because we can. Inside a leaf, a container hides the real
 *    dependency graph and adds a runtime you have to boot before you can test.
 *    Plain typed arguments keep the graph visible and the tests trivial, so
 *    `@n8n/di` stays out, and so does `@n8n/config`, which is built on it.
 *
 * 4. Stay ignorant of who calls you. How a Wait node or a Schedule Trigger node
 *    gets scheduled is a *use* of this package, not a concern of it. The
 *    scheduler must not know its consumers exist. That keeps the dependency arrow
 *    pointing one way, from the cli and the nodes toward the scheduler and never
 *    back. It is why importing the cli (`n8n`) is forbidden. That import would
 *    flip the arrow.
 *
 * 5. Aim for a pure leaf. Follow the four steps and the package settles at the
 *    bottom of the graph with no effectful edges. It becomes a decision engine
 *    you can unit-test without a database, stress with property and mutation
 *    tests, run against any dialect, and lift into a standalone worker. That
 *    pure-leaf shape is the target this test defends, one import at a time.
 *
 * ## Exploring the idea: a `@n8n/scheduler-worker` deployable
 *
 * Here is a concrete scenario the pure leaf unlocks. It is a thought exercise,
 * not a plan. Today the cli owns the port bindings. `DurableScheduler` wires the
 * `@n8n/db` repositories as the task store and transaction runner, `Tracing` as
 * the `Tracer`, `GlobalConfig` as the options, and `ScheduleTriggerTaskHandler`
 * as the `TaskHandler`. One direction worth exploring is to lift that wiring into
 * a `@n8n/scheduler-worker` package and deploy it as its own process, dedicated
 * to scheduling.
 *
 * Relocating the scheduler itself is free, because it is a pure leaf with no
 * effectful edges to untangle. The cost is everywhere else. When a task is due
 * the worker should not run the workflow inline, since that would pull in the
 * whole node-execution engine. In a scaled deployment it instead creates an
 * execution and publishes a job to the queue (Bull and Redis), and the regular
 * workers run it. So the worker's real `TaskHandler` is "create an execution and
 * enqueue it".
 *
 * That capability lives inside the cli today, tangled through
 * `WorkflowExecutionService`, the scaling service, `ExecutionRepository`, and the
 * trigger-context builders. The worker cannot simply import the cli to get it,
 * because the cli will import the worker and the dependency would be circular. So
 * the real work is decomposing the cli, pulling the shared concerns down into
 * leaf packages that both the cli and the worker can depend on. The rough
 * candidates, names still open, are a workflow-execution publisher that creates
 * the execution row and enqueues it (this is where Bull and Redis would actually
 * live, in the publisher rather than in the scheduler), the trigger-context and
 * additional-data building that a run needs, and the instance identity and config
 * slices the loops read.
 *
 * Once you list what the worker would actually bundle, it comes out far leaner
 * than the `cli` it grew out of. `cli` drags in every node's dependencies
 * (1Password, S3, and hundreds more). The worker needs only what scheduling and
 * enqueuing require:
 *
 *   - `@n8n/scheduler` for the core, and `@n8n/db` for the repositories and
 *     transactions (which brings in `@n8n/typeorm` and a database driver)
 *   - a new publisher package to enqueue executions (Bull and ioredis)
 *   - `@n8n/backend-common` for logging, with `@n8n/config`, `@n8n/di`,
 *     `@n8n/decorators` and `n8n-workflow` to wire and type it
 *   - today, `n8n-core` for instance identity and error reporting, unless those
 *     get extracted too
 *
 * It leaves behind the bulk of n8n: the editor, the REST API, the node registry,
 * and every node's dependency. The win is a process whose scheduling scales and
 * fails on its own, and getting there is mostly `cli` decomposition. Purity made
 * the scheduler side free to move. The same discipline one level up is what makes
 * the worker shippable.
 *
 * ## What each excluded dependency would cost us
 *
 * See `FORBIDDEN_PACKAGES` and `FORBIDDEN_NODE_BUILTINS`. Each entry carries its
 * justification inline. The short version. The DB and ORM packages would tie the
 * core to a dialect and a running database. `n8n-core` is the *doing* side. The
 * DI container `@n8n/di`, together with `@n8n/config` and `@n8n/backend-common`
 * that build on it, would hide the ports behind a global registry instead of
 * explicit injection. The cli (`n8n`) is the app wiring and depends on us, not
 * the other way around. And the Node I/O built-ins are effects that belong behind
 * a port.
 *
 * We do not ban every `node:` built-in, only the effectful ones that do I/O. A
 * pure-computation built-in like `node:crypto` stays allowed, because hashing is
 * deterministic and the boundary we defend is effects, not standard-library use.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const packageRoot = resolve(__dirname, '../..');
const srcDir = resolve(__dirname, '..');

type Rule = { name: string; reason: string };

/** Prod dependencies the core is allowed to declare. Adding one is a conscious act. */
const ALLOWED_DEPENDENCIES: Rule[] = [
	{ name: '@n8n/constants', reason: 'Shared constant values only. No runtime, no I/O.' },
	{ name: '@n8n/utils', reason: 'Pure helper functions (e.g. error normalization).' },
	{ name: 'cron-parser', reason: 'Pure cron arithmetic for recurrence math.' },
	{
		name: 'luxon',
		reason: 'Pure date/time arithmetic. The wall clock is injected via the Clock port.',
	},
	{ name: 'n8n-workflow', reason: 'Core interfaces and types shared across n8n, no I/O.' },
];

/** Packages the core must never import, with the reason each is excluded. */
const FORBIDDEN_PACKAGES: Rule[] = [
	{
		name: '@n8n/db',
		reason:
			'Persistence layer (TypeORM entities/repositories). Storage is a port; adapters live in @n8n/db.',
	},
	{ name: '@n8n/typeorm', reason: 'ORM. Would bind the core to a database and a SQL dialect.' },
	{ name: 'typeorm', reason: 'ORM. Would bind the core to a database and a SQL dialect.' },
	{
		name: 'n8n-core',
		reason: 'The execution runtime, the "doing" side. The core only decides what is due.',
	},
	{
		name: '@n8n/di',
		reason:
			'DI container. Ports are injected explicitly as arguments, not resolved from a global container.',
	},
	{
		name: '@n8n/config',
		reason:
			'Debatable, but its config classes are @n8n/di-decorated so importing it drags in the DI runtime (reflect-metadata). The core takes plain typed options instead. Allowing it would need a types-only entry point.',
	},
	{
		name: '@n8n/backend-common',
		reason:
			'A backend convenience toolbox (logging, locking, license, DI modules) built on @n8n/di and @n8n/config. More a thought exercise than a real temptation, which is the point: importing it for one helper would drag in the whole DI/logger runtime. Proximity is not a reason to depend.',
	},
	{
		name: 'n8n',
		reason:
			'The cli/app wiring. It depends on the scheduler, not the reverse; importing it inverts the dependency.',
	},
];

/**
 * Effectful Node built-ins the core must never import. Listed by base name.
 * Subpaths (`fs/promises`, `dns/promises`) and the `node:` prefix are matched
 * too. Pure-computation built-ins (`crypto`, `path`, `util`, ...) are allowed.
 */
const FORBIDDEN_NODE_BUILTINS: Rule[] = [
	{
		name: 'fs',
		reason: 'Filesystem I/O, an effect. Persistence belongs behind an injected store.',
	},
	{ name: 'net', reason: 'Raw sockets, an effect.' },
	{ name: 'tls', reason: 'Encrypted sockets, an effect.' },
	{ name: 'dgram', reason: 'UDP sockets, an effect.' },
	{ name: 'http', reason: 'Network I/O, an effect.' },
	{ name: 'https', reason: 'Network I/O, an effect.' },
	{ name: 'http2', reason: 'Network I/O, an effect.' },
	{ name: 'dns', reason: 'Network name resolution, an effect.' },
	{ name: 'child_process', reason: 'Spawning processes, an effect and the "doing" side.' },
	{ name: 'cluster', reason: 'Process orchestration. Belongs in the cli wiring, not the core.' },
	{
		name: 'worker_threads',
		reason: 'Thread orchestration. Belongs in the cli wiring, not the core.',
	},
	{
		name: 'os',
		reason: 'Reads host state, a non-deterministic input that breaks reproducibility.',
	},
	{
		name: 'process',
		reason:
			'Reads env/argv and controls the process. Ambient effects, so pass values in explicitly.',
	},
	{ name: 'inspector', reason: 'Runtime introspection, an effect.' },
	{ name: 'repl', reason: 'Interactive host binding, an effect.' },
	{ name: 'v8', reason: 'Engine internals, a host effect.' },
	{ name: 'vm', reason: 'Arbitrary code execution, an effect.' },
	{ name: 'readline', reason: 'Terminal I/O, an effect.' },
];

const DOC = 'See the doc comment at the top of dependency-purity.test.ts for the rationale.';

/** Collect every `.ts` file under `src/`, excluding tests (which are allowed to touch anything). */
function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			return entry.name === '__tests__' ? [] : sourceFiles(full);
		}
		if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) return [];
		return [full];
	});
}

/** Strip comments so a module name mentioned in prose can't trip a false positive. */
function stripComments(code: string): string {
	return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/** Extract module specifiers from static imports/exports, `require(...)` and dynamic `import(...)`. */
function importedModules(code: string): string[] {
	const specifiers: string[] = [];
	const patterns = [
		/(?:import|export)\b[^'"]*?\bfrom\s*['"]([^'"]+)['"]/g,
		/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
		/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
		/\bimport\s+['"]([^'"]+)['"]/g, // bare side-effect import
	];
	const stripped = stripComments(code);
	for (const pattern of patterns) {
		for (const match of stripped.matchAll(pattern)) {
			specifiers.push(match[1]);
		}
	}
	return specifiers;
}

/** True when `specifier` is, or is a subpath of, `name`. */
function matches(specifier: string, name: string): boolean {
	return specifier === name || specifier.startsWith(`${name}/`);
}

/** Find which forbidden package/built-in a specifier resolves to, if any. */
function findViolation(specifier: string): Rule | null {
	const pkg = FORBIDDEN_PACKAGES.find((rule) => matches(specifier, rule.name));
	if (pkg) return pkg;

	const bare = specifier.replace(/^node:/, '');
	const builtin = FORBIDDEN_NODE_BUILTINS.find((rule) => matches(bare, rule.name));
	if (builtin) return { name: `node:${builtin.name}`, reason: builtin.reason };

	return null;
}

describe('@n8n/scheduler dependency purity', () => {
	it('declares only allow-listed prod dependencies (manifest check)', () => {
		const raw = readFileSync(join(packageRoot, 'package.json'), 'utf8');
		let manifest: { dependencies?: Record<string, string> };
		try {
			manifest = JSON.parse(raw) as { dependencies?: Record<string, string> };
		} catch (error) {
			throw new Error(`Could not parse @n8n/scheduler package.json: ${String(error)}`);
		}

		const allowed = new Set(ALLOWED_DEPENDENCIES.map((rule) => rule.name));
		const unexpected = Object.keys(manifest.dependencies ?? {}).filter((dep) => !allowed.has(dep));

		expect(
			unexpected,
			`@n8n/scheduler declares prod dependencies outside the purity allowlist: ${unexpected.join(', ')}.\n` +
				`Add it to ALLOWED_DEPENDENCIES with a justification only if it is genuinely pure (no DB, no ORM, no I/O). ${DOC}`,
		).toEqual([]);
	});

	it('imports nothing that would break purity (import check)', () => {
		const violations: string[] = [];

		for (const file of sourceFiles(srcDir)) {
			const code = readFileSync(file, 'utf8');
			for (const specifier of importedModules(code)) {
				const hit = findViolation(specifier);
				if (hit) {
					violations.push(
						`${relative(packageRoot, file)} imports '${specifier}' (${hit.name}): ${hit.reason}`,
					);
				}
			}
		}

		expect(
			violations,
			`@n8n/scheduler source imports a forbidden dependency:\n${violations.join('\n')}\n${DOC}`,
		).toEqual([]);
	});
});
