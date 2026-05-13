# QuickJS Browser Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing `QuickJsBridge` into editor-ui so expressions in the browser evaluate through QuickJS WASM instead of the legacy engine, removing direct access to `document` / `localStorage` / Vue stores.

**Architecture:** `QuickJsBridge` gets an optional `runtimeBundle: string` config so the browser can pre-load the bundle via vite's `?raw` import (instead of `node:fs`). Editor-ui replaces its current expression-runtime alias stub to re-export the real `QuickJsBridge` and acquires a single shared isolate at startup. The `IS_FRONTEND` short-circuit in `Expression` is dropped for the `quickjs` engine.

**Tech Stack:** TypeScript, vitest, vite, quickjs-emscripten (WASM), `@n8n/expression-runtime`, `n8n-workflow` package.

**Spec:** `docs/superpowers/specs/2026-05-06-quickjs-browser-bridge-design.md`

---

## File map

**Create:**
- (none — all changes are modifications)

**Modify:**
- `packages/@n8n/expression-runtime/src/types/bridge.ts` — add `runtimeBundle?: string` to `BridgeConfig`
- `packages/@n8n/expression-runtime/src/bridge/quickjs-bridge.ts` — use `config.runtimeBundle` if provided; fall back to existing filesystem read
- `packages/@n8n/expression-runtime/src/__tests__/integration.test.ts` — one new test for the string-injection path
- `packages/@n8n/expression-runtime/package.json` — add `./runtime-bundle.iife.js` to `exports`
- `packages/workflow/src/expression.ts` — drop `IS_FRONTEND` short-circuit for `quickjs`; add browser-side shared caller; accept and forward `runtimeBundle` option
- `packages/frontend/editor-ui/vite/expression-runtime-stub.ts` — re-export real `QuickJsBridge` + `ExpressionEvaluator` + error classes from `@n8n/expression-runtime` source; keep `IsolatedVmBridge` as a throwing stub
- `packages/frontend/editor-ui/vite.config.mts` — add a specific alias for `@n8n/expression-runtime/runtime-bundle.iife.js` before the general expression-runtime alias
- `packages/frontend/editor-ui/src/main.ts` — load runtime bundle as `?raw` and call `Expression.initExpressionEngine({ engine: 'quickjs', runtimeBundle, ... })` at startup

---

## Task 1: Add `runtimeBundle` to BridgeConfig and use it in QuickJsBridge

**Files:**
- Modify: `packages/@n8n/expression-runtime/src/types/bridge.ts`
- Modify: `packages/@n8n/expression-runtime/src/bridge/quickjs-bridge.ts` (around lines 406–419, `loadRuntimeBundle`)
- Test: `packages/@n8n/expression-runtime/src/__tests__/integration.test.ts` (add one test in the `quickjs-engine` project block)

- [ ] **Step 1: Add `runtimeBundle` to `BridgeConfig` type**

Edit `packages/@n8n/expression-runtime/src/types/bridge.ts`. Update the `BridgeConfig` interface and `DEFAULT_BRIDGE_CONFIG`:

```ts
export interface BridgeConfig {
	/** Memory limit in MB for isolated context. Default: 128MB */
	memoryLimit?: number;

	/** Timeout in milliseconds for expression execution. Default: 5000ms */
	timeout?: number;

	/** Optional logger. Falls back to no-op if not provided. */
	logger?: Logger;

	/**
	 * Pre-loaded runtime IIFE bundle source as a string.
	 * If provided, the bridge skips its own filesystem read.
	 * Required when running in environments without filesystem access (browser).
	 */
	runtimeBundle?: string;
}

const NO_OP_LOGGER: Logger = {
	error: () => {},
	warn: () => {},
	info: () => {},
	debug: () => {},
};

export const DEFAULT_BRIDGE_CONFIG: Required<BridgeConfig> = {
	memoryLimit: 128,
	timeout: 5000,
	logger: NO_OP_LOGGER,
	runtimeBundle: '',
};
```

Note: `runtimeBundle` defaults to empty string. The bridge treats empty string as "not provided" and falls back to the filesystem read.

- [ ] **Step 2: Write the failing integration test**

Open `packages/@n8n/expression-runtime/src/__tests__/integration.test.ts`. The file already has a `describe('Integration: ExpressionEvaluator (${engineName})')` block that runs against both bridges via the `createBridge()` factory at the top. Add a new `describe` block at the end of the file (after the existing top-level `describe`) that tests the bundle-injection path explicitly. Add this at the file's bottom:

```ts
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';

describe('QuickJsBridge runtimeBundle injection', () => {
	it('should initialize and evaluate when runtimeBundle is provided as a string', async () => {
		// Find the bundle the same way the bridge does, then pass it as a string
		// to prove the bridge no longer needs filesystem access when runtimeBundle is set.
		let dir = __dirname;
		let bundle: string | undefined;
		while (dir !== path.dirname(dir)) {
			try {
				bundle = await readFile(
					path.join(dir, 'dist', 'bundle', 'runtime.iife.js'),
					'utf-8',
				);
				break;
			} catch {}
			dir = path.dirname(dir);
		}
		if (!bundle) throw new Error('runtime bundle not found for test setup');

		const bridge = new QuickJsBridge({ timeout: 5000, runtimeBundle: bundle });
		await bridge.initialize();
		try {
			const result = bridge.execute(
				'(function() { return $json.name; }).call(__data)',
				{ $json: { name: 'injected' } },
			);
			expect(result).toBe('injected');
		} finally {
			await bridge.dispose();
		}
	});
});
```

This block is engine-agnostic — it runs under both `isolated-vm-engine` and `quickjs-engine` projects, but only the QuickJS path exercises the new code. Both should pass.

- [ ] **Step 3: Run the test to verify it fails**

Run from the package directory:

```bash
pushd packages/@n8n/expression-runtime
pnpm test src/__tests__/integration.test.ts 2>&1 | tail -30
popd
```

Expected: the new test fails for the `quickjs-engine` project because `loadRuntimeBundle()` ignores the config and still reads from disk. Actual error message will mention the bundle being read from a path rather than honoring the config.

(If the test passes by accident, the existing bridge's filesystem walk already found the bundle in the test environment — that's expected. Verify the new code path by temporarily breaking the filesystem walk in step 4.)

- [ ] **Step 4: Update `QuickJsBridge.loadRuntimeBundle()` to use the config**

Edit `packages/@n8n/expression-runtime/src/bridge/quickjs-bridge.ts`. Find `loadRuntimeBundle()` (around line 406) and change it to prefer the config-provided bundle:

```ts
private async loadRuntimeBundle(): Promise<void> {
	if (!this.vm) throw new Error('Context not initialized');

	const runtimeBundle = this.config.runtimeBundle
		? this.config.runtimeBundle
		: await readRuntimeBundle();

	const result = this.vm.evalCode(runtimeBundle);
	if (result.error) {
		const errorStr = this.vm.dump(result.error);
		result.error.dispose();
		throw new Error(`Failed to load runtime bundle: ${String(errorStr)}`);
	}
	result.value.dispose();

	this.logger.info('[QuickJsBridge] Runtime bundle loaded');

	this.evalCodeOrThrow('typeof DateTime !== "undefined"', 'DateTime verification');
	this.evalCodeOrThrow('typeof extend !== "undefined"', 'extend verification');

	this.logger.info('[QuickJsBridge] Vendor libraries verified successfully');
}
```

Note: `this.config.runtimeBundle` is now always defined (defaulted to empty string in step 1). The empty-string check (`this.config.runtimeBundle ? ... : ...`) treats empty as "not provided" and falls through to the filesystem walk.

- [ ] **Step 5: Run the test to verify it passes**

```bash
pushd packages/@n8n/expression-runtime
pnpm test src/__tests__/integration.test.ts 2>&1 | tail -10
popd
```

Expected: all integration tests pass under both `isolated-vm-engine` and `quickjs-engine` projects, including the new `runtimeBundle injection` test.

- [ ] **Step 6: Run typecheck**

```bash
pushd packages/@n8n/expression-runtime
pnpm typecheck 2>&1 | tail -5
popd
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/@n8n/expression-runtime/src/types/bridge.ts packages/@n8n/expression-runtime/src/bridge/quickjs-bridge.ts packages/@n8n/expression-runtime/src/__tests__/integration.test.ts
git commit -m "feat(expression-runtime): Accept pre-loaded runtimeBundle string in QuickJsBridge

Lets browser callers pass the IIFE bundle directly instead of reading
from disk, since node:fs is unavailable in the editor-ui build.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Add runtime-bundle package export

**Files:**
- Modify: `packages/@n8n/expression-runtime/package.json`

- [ ] **Step 1: Verify the bundle file exists**

```bash
pushd packages/@n8n/expression-runtime
pnpm build:runtime > "$TMPDIR/build.log" 2>&1
ls -la dist/bundle/runtime.iife.js
popd
```

Expected: the file exists. If the build was already done earlier in this session it's a no-op.

- [ ] **Step 2: Add the export to package.json**

Edit `packages/@n8n/expression-runtime/package.json`. Change the `exports` field from:

```json
"exports": {
	".": {
		"types": "./dist/esm/index.d.ts",
		"import": "./dist/esm/index.js",
		"require": "./dist/cjs/index.js"
	},
	"./*": "./*"
},
```

to:

```json
"exports": {
	".": {
		"types": "./dist/esm/index.d.ts",
		"import": "./dist/esm/index.js",
		"require": "./dist/cjs/index.js"
	},
	"./runtime-bundle.iife.js": "./dist/bundle/runtime.iife.js",
	"./*": "./*"
},
```

Place the new entry *before* the catch-all `"./*"`. Order matters in exports resolution.

- [ ] **Step 3: Verify the path resolves**

```bash
node -e "console.log(require.resolve('@n8n/expression-runtime/runtime-bundle.iife.js'))"
```

Expected: prints the absolute path to `dist/bundle/runtime.iife.js`.

- [ ] **Step 4: Commit**

```bash
git add packages/@n8n/expression-runtime/package.json
git commit -m "feat(expression-runtime): Export runtime IIFE bundle as a package sub-path

Lets editor-ui import the bundle via \`?raw\` for the QuickJS browser bridge.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Drop IS_FRONTEND short-circuit for quickjs in Expression

**Files:**
- Modify: `packages/workflow/src/expression.ts` (three locations: `shouldUseVm`, `initExpressionEngine`, `renderExpression`)

- [ ] **Step 1: Drop IS_FRONTEND check for quickjs in `shouldUseVm`**

In `packages/workflow/src/expression.ts`, find `shouldUseVm()` (around line 238):

```ts
private static shouldUseVm(): boolean {
	return (
		(this.expressionEngine === 'vm' || this.expressionEngine === 'quickjs') &&
		!IS_FRONTEND &&
		!!this.vmEvaluator
	);
}
```

Change to:

```ts
private static shouldUseVm(): boolean {
	if (!this.vmEvaluator) return false;
	if (this.expressionEngine === 'quickjs') return true;
	if (this.expressionEngine === 'vm') return !IS_FRONTEND;
	return false;
}
```

Rationale: `vm` (isolated-vm) is still Node-only; `quickjs` works in both environments.

- [ ] **Step 2: Drop IS_FRONTEND check for quickjs in `initExpressionEngine` and accept `runtimeBundle`**

Find `initExpressionEngine()` (around line 251). Change the options type and the guard:

```ts
static async initExpressionEngine(options: {
	engine: 'legacy' | 'vm' | 'quickjs';
	bridgeTimeout: number;
	bridgeMemoryLimit: number;
	poolSize: number;
	maxCodeCacheSize: number;
	observability?: ObservabilityProvider;
	idleTimeoutMs?: number;
	runtimeBundle?: string;
}): Promise<void> {
	if (options.engine === 'legacy') return;
	if (options.engine === 'vm' && IS_FRONTEND) return;
	this.expressionEngine = options.engine;

	if (!this.vmEvaluator) {
		// Dynamic import to avoid loading expression-runtime in browser environments
		const runtime = await import('@n8n/expression-runtime');
		const createBridge =
			options.engine === 'quickjs'
				? () =>
						new runtime.QuickJsBridge({
							timeout: options.bridgeTimeout,
							memoryLimit: options.bridgeMemoryLimit,
							logger: LoggerProxy,
							runtimeBundle: options.runtimeBundle,
						})
				: () =>
						new runtime.IsolatedVmBridge({
							timeout: options.bridgeTimeout,
							memoryLimit: options.bridgeMemoryLimit,
							logger: LoggerProxy,
						});
		this.vmEvaluator = new runtime.ExpressionEvaluator({
			createBridge,
			maxCodeCacheSize: options.maxCodeCacheSize,
			poolSize: options.poolSize,
			idleTimeoutMs: options.idleTimeoutMs,
			hooks: {
				before: [ThisSanitizer],
				after: [PrototypeSanitizer, DollarSignValidator],
			},
			logger: LoggerProxy,
			observability: options.observability,
		});
		await this.vmEvaluator.initialize();
		// Browser uses a single shared caller for all evaluations since the
		// sync evaluate() requires a pre-acquired caller and Expression
		// instances are short-lived in the editor.
		if (IS_FRONTEND) {
			await this.vmEvaluator.acquire(this.BROWSER_CALLER);
		}
	}
}
```

Add the `BROWSER_CALLER` static field near the top of the class (just under `private static vmEvaluator?`):

```ts
private static readonly BROWSER_CALLER = {};
```

- [ ] **Step 3: Drop IS_FRONTEND check for quickjs in `renderExpression` and route through shared caller**

Find `renderExpression()` (around line 603). Change the VM evaluator branch:

```ts
private renderExpression(expression: string, data: IWorkflowDataProxyData) {
	if (Expression.shouldUseVm()) {
		if (!Expression.vmEvaluator) {
			throw new UnexpectedError(
				`N8N_EXPRESSION_ENGINE=${Expression.expressionEngine} is enabled but VM evaluator is not initialized. Call Expression.initExpressionEngine() during application startup.`,
			);
		}

		const caller = IS_FRONTEND ? Expression.BROWSER_CALLER : this;
		try {
			const result = Expression.vmEvaluator.evaluate(expression, data, caller, {
				timezone: this.timezone,
			});
			return result as string | null | (() => unknown);
		} catch (error) {
			throw mapVmError(error);
		}
	}

	// Fall back to current implementation
	try {
		return evaluateExpression(expression, data);
	} catch (error) {
		// ... existing error handling unchanged
	}
}
```

(Leave the catch block unchanged from current code.)

- [ ] **Step 4: Run workflow tests under all three engine projects**

```bash
pushd packages/workflow
pnpm test 2>&1 | tail -30
popd
```

Expected: all three engine projects (`legacy-engine`, `vm-engine`, `quickjs-engine`) pass. The change broadens where quickjs runs but doesn't alter backend behavior.

- [ ] **Step 5: Run workflow typecheck**

```bash
pushd packages/workflow
pnpm typecheck 2>&1 | tail -5
popd
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/workflow/src/expression.ts
git commit -m "feat(workflow): Allow QuickJS expression engine in the browser

Drops the IS_FRONTEND short-circuit for the quickjs engine while keeping
it for the isolated-vm engine. Adds a shared browser caller so sync
evaluate() has an acquired bridge in editor-ui.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Replace editor-ui expression-runtime stub with real QuickJsBridge

**Files:**
- Modify: `packages/frontend/editor-ui/vite/expression-runtime-stub.ts`
- Modify: `packages/frontend/editor-ui/vite.config.mts` (add specific alias for the runtime bundle path)

- [ ] **Step 1: Add a specific alias for the runtime bundle path before the general alias**

Edit `packages/frontend/editor-ui/vite.config.mts`. Find the `alias` array. Add the new entry *before* the existing `@n8n/expression-runtime` stub alias:

```ts
const alias = [
	{ find: '@', replacement: resolve(__dirname, 'src') },
	{ find: 'stream', replacement: 'stream-browserify' },
	// Allow direct import of the runtime IIFE bundle (for ?raw use in editor-ui).
	// This must come BEFORE the @n8n/expression-runtime stub alias below or it
	// would be intercepted by the stub.
	{
		find: '@n8n/expression-runtime/runtime-bundle.iife.js',
		replacement: resolve(packagesDir, '@n8n', 'expression-runtime', 'dist', 'bundle', 'runtime.iife.js'),
	},
	// Stub out @n8n/expression-runtime for browser build (it pulls in isolated-vm, a Node.js-only native module)
	{
		find: '@n8n/expression-runtime',
		replacement: resolve(__dirname, 'vite/expression-runtime-stub.ts'),
	},
	// ... rest unchanged
```

- [ ] **Step 2: Update the expression-runtime stub to re-export the real QuickJsBridge**

Replace the contents of `packages/frontend/editor-ui/vite/expression-runtime-stub.ts` with:

```ts
/**
 * Browser shim for @n8n/expression-runtime.
 *
 * IsolatedVmBridge depends on isolated-vm (a Node.js-only native module),
 * so we stub it with a throwing class. QuickJsBridge runs on WASM and works
 * in the browser, so we re-export the real implementation from source.
 */
import { resolve } from 'path';

// Real exports from source (path resolves at vite config time, not runtime —
// vite re-aliases the bare import below)
export { QuickJsBridge } from '../../../@n8n/expression-runtime/src/bridge/quickjs-bridge';
export { ExpressionEvaluator } from '../../../@n8n/expression-runtime/src/evaluator/expression-evaluator';

export {
	ExpressionError,
	MemoryLimitError,
	TimeoutError,
	SecurityViolationError,
	SyntaxError,
} from '../../../@n8n/expression-runtime/src/types';

export { extend, extendOptional, EXTENSION_OBJECTS } from '../../../@n8n/expression-runtime/src/extensions/extend';
export { ExpressionExtensionError } from '../../../@n8n/expression-runtime/src/extensions/expression-extension-error';
export { NoOpProvider } from '../../../@n8n/expression-runtime/src/observability/noop-provider';
export { EXPRESSION_METRICS } from '../../../@n8n/expression-runtime/src/observability/metrics';
export { classifyExpressionError } from '../../../@n8n/expression-runtime/src/evaluator/error-classification';

export class IsolatedVmBridge {
	constructor(_config?: unknown) {
		throw new Error('IsolatedVmBridge is not available in browser environments');
	}
}

// IsolateError re-export — keep as throwing stub since it's part of the
// @n8n/errors workspace export and not central to QuickJS
export class IsolateError extends Error {}

export class RuntimeError extends Error {}

// Suppress unused-import warning for `resolve` (kept to ensure node:path
// shim is initialized for any transitive callers).
void resolve;
```

Note: the relative paths (`../../../@n8n/expression-runtime/src/...`) navigate from `packages/frontend/editor-ui/vite/expression-runtime-stub.ts` up to `packages/` and into the expression-runtime source. Verify the resolved path with:

```bash
ls packages/@n8n/expression-runtime/src/bridge/quickjs-bridge.ts
```

Expected: file exists.

- [ ] **Step 3: Verify the stub compiles in isolation by running a TS check**

```bash
pushd packages/frontend/editor-ui
pnpm typecheck 2>&1 | tail -10
popd
```

Expected: no errors. (Some errors may surface about types — fix them by adding necessary type-only re-exports to the stub.)

- [ ] **Step 4: Try a dev build to validate vite can resolve everything**

```bash
pushd packages/frontend/editor-ui
pnpm build 2>&1 | tail -30
popd
```

Expected: build succeeds. If it fails with errors about unresolved `node:fs` or `node:path` imports, the existing `nodePolyfills` plugin should already handle those — re-check the polyfill includes list in `vite.config.mts:172-174` (`['fs', 'path', 'url', 'util', 'timers']`).

**Decision gate:** If the build fails for non-trivial reasons that aren't node-polyfill-related (e.g. circular imports through the alias, or vite can't resolve the relative paths), **stop and re-evaluate** per the spec's fallback plan. Don't force it past this gate.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/editor-ui/vite/expression-runtime-stub.ts packages/frontend/editor-ui/vite.config.mts
git commit -m "feat(editor-ui): Re-export real QuickJsBridge through the vite stub

Keeps the IsolatedVmBridge stub throwing (still native-only) but lets
the real WASM-based QuickJsBridge through, plus the evaluator and
error classes. Adds a specific alias for the runtime IIFE bundle path
so editor-ui can import it via ?raw.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Initialize QuickJS engine on editor-ui startup

**Files:**
- Modify: `packages/frontend/editor-ui/src/main.ts`

- [ ] **Step 1: Add startup init for the QuickJS engine**

Edit `packages/frontend/editor-ui/src/main.ts`. After the existing imports and before `const app = createApp(App)`, add the engine initialization:

```ts
import { Expression } from 'n8n-workflow';

// Load the runtime bundle as a string asset so the bridge can run in browser
// (no node:fs available). The runtime-bundle.iife.js sub-path is aliased in
// vite.config.mts to the built file in @n8n/expression-runtime.
import runtimeBundle from '@n8n/expression-runtime/runtime-bundle.iife.js?raw';

await Expression.initExpressionEngine({
	engine: 'quickjs',
	bridgeTimeout: 5000,
	bridgeMemoryLimit: 128,
	poolSize: 1,
	maxCodeCacheSize: 1024,
	runtimeBundle,
});
```

Place this AFTER the CSS/plugin imports (top of the file) and BEFORE `const pinia = createPinia()`.

Note: top-level `await` is already used elsewhere in this file (the `VueScan` block at line 54), so it works under the current TypeScript / vite config.

- [ ] **Step 2: Verify the editor-ui build still succeeds**

```bash
pushd packages/frontend/editor-ui
pnpm build 2>&1 | tail -20
popd
```

Expected: build succeeds. Bundle size should grow by ~1.1MB.

- [ ] **Step 3: Verify editor-ui typecheck passes**

```bash
pushd packages/frontend/editor-ui
pnpm typecheck 2>&1 | tail -10
popd
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/editor-ui/src/main.ts
git commit -m "feat(editor-ui): Initialize QuickJS expression engine at startup

Loads the runtime bundle via vite's ?raw import and calls
Expression.initExpressionEngine with engine: 'quickjs' so expressions
in the editor evaluate inside the WASM sandbox instead of directly in
the main JS context.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: Manual smoke test

**Goal:** Verify the end-to-end flow in a real browser.

- [ ] **Step 1: Start the dev server**

```bash
pushd packages/frontend/editor-ui
pnpm dev 2>&1 | tee "$TMPDIR/editor-ui-dev.log" &
popd
```

Wait until the dev server prints its URL (typically `http://localhost:5173`).

- [ ] **Step 2: Open the editor and create a workflow**

Open the URL in a browser. Sign in if needed. Create a new workflow with at least two nodes (e.g., a Manual Trigger and a Set node).

- [ ] **Step 3: Verify basic expression evaluation**

In the Set node, add a parameter with the expression:

```
{{ $json.foo }}
```

With pinned input data of `{ "foo": "hello" }` (or use upstream Manual Trigger output).

Expected: the preview shows `hello`.

- [ ] **Step 4: Verify API confinement**

Replace the expression with:

```
{{ document.cookie }}
```

Expected: the preview shows an error like `document is not defined` (or similar). Critically, **not** the actual cookie string.

Try also:

```
{{ localStorage.getItem('n8n-userId') }}
```

Expected: error, not a value.

- [ ] **Step 5: Verify timeout protection**

Replace the expression with:

```
{{ (() => { while(true) {} })() }}
```

Expected: after ~5s the preview shows a timeout error. **The editor remains responsive** — does not freeze the page.

- [ ] **Step 6: Open the browser devtools network tab and confirm WASM was loaded**

In the Network tab, filter by `wasm`. Expected: see one or more `.wasm` chunks loaded around the time the editor started up.

- [ ] **Step 7: Document any failures**

If any of the above steps fail, capture the exact error and add it as a comment in this plan under a `## Findings` section before declaring the POC done. Don't try to fix discovered issues silently.

- [ ] **Step 8: Stop the dev server**

Kill the background dev server:

```bash
pkill -f 'vite.*editor-ui' || true
```

---

## Final verification

After all tasks are complete, run the full test suite one more time to confirm no regressions:

- [ ] **All expression-runtime tests pass**

```bash
pushd packages/@n8n/expression-runtime
pnpm test 2>&1 | tail -10
popd
```

Expected: both `isolated-vm-engine` and `quickjs-engine` projects pass.

- [ ] **All workflow tests pass**

```bash
pushd packages/workflow
pnpm test 2>&1 | tail -10
popd
```

Expected: `legacy-engine`, `vm-engine`, `quickjs-engine` projects all pass.

- [ ] **Editor-ui builds cleanly**

```bash
pushd packages/frontend/editor-ui
pnpm build > "$TMPDIR/final-build.log" 2>&1
tail -5 "$TMPDIR/final-build.log"
popd
```

Expected: build succeeds without warnings about unresolved Node built-ins.
