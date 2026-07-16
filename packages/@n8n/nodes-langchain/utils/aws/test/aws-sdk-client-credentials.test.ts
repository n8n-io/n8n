import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { parse, simpleTraverse, AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * Guardrail for the AWS node/credential surface: every AWS SDK client constructed
 * here must be handed an explicit `credentials` config, and every
 * `fromTemporaryCredentials(...)` call must pass `masterCredentials` (without it the
 * SDK silently falls back to the host credential chain). The scan is structural and
 * fails closed: anything it cannot statically verify is reported as an issue rather
 * than silently passing, so a future client added in a scanned dir is caught.
 */

const AWS_SDK_MODULE = /^@aws-sdk\//;
const FROM_TEMPORARY_CREDENTIALS = 'fromTemporaryCredentials';
const CREDENTIAL_PROVIDERS_MODULE = '@aws-sdk/credential-providers';

// The AWS node/credential surface. Forward-looking dirs (no AWS client today) are
// included so a future construction is caught automatically; each is existsSync-guarded.
const SCAN_DIRS = [
	'..', // utils/aws
	'../../../nodes/llms/LmChatAwsBedrock',
	'../../../nodes/embeddings/EmbeddingsAwsBedrock',
	'../../../../../nodes-base/credentials/common/aws',
].map((rel) => path.resolve(__dirname, rel));

// Bump when more AWS SDK clients are added to the scanned surface.
// The chat and embeddings nodes share one construction site (createBedrockRuntimeClient).
const MIN_EXPECTED_CLIENT_CONSTRUCTIONS = 1;

interface ImportBinding {
	module: string;
	isAwsSdk: boolean;
	/** Original (imported) name in the source module; `*` for a namespace import. */
	importedName: string;
}

export interface ScanResult {
	/** Number of `new <awsSdkClient>(...)` constructions found on the scanned surface. */
	clientConstructionCount: number;
	/** Human-readable description of each statically-unverifiable or missing-key finding. */
	issues: string[];
}

// Phase-0 scope is presence-only: a `credentials` / `masterCredentials` key must be
// present. Validating the identity value behind it (e.g. rejecting discovery providers) is
// deferred. An explicit discovery-provider value such as `credentials: fromIni()` is
// intentionally NOT inspected here; that case is owned by the runtime
// awsSystemCredentialsAccess gate in getSystemCredentials(), not by this presence scan.
// Match the key by name and ignore `shorthand` so `{ region, credentials }` counts.
function hasObjectKey(objectExpression: TSESTree.ObjectExpression, keyName: string): boolean {
	return objectExpression.properties.some(
		(prop) =>
			prop.type === AST_NODE_TYPES.Property &&
			prop.key.type === AST_NODE_TYPES.Identifier &&
			prop.key.name === keyName,
	);
}

/**
 * Collects local-name -> import binding for value imports from any module. Each binding
 * records its source module and original (imported) name so callees can be resolved
 * through aliases and namespace member access. Type-only specifiers and type-only
 * declarations are skipped so a type import cannot shadow the value binding
 * (e.g. `import type { BedrockRuntimeClientConfig }` next to `import { BedrockRuntimeClient }`).
 */
function collectImportBindings(ast: TSESTree.Program): Map<string, ImportBinding> {
	const bindings = new Map<string, ImportBinding>();

	simpleTraverse(ast, {
		enter(node) {
			if (node.type !== AST_NODE_TYPES.ImportDeclaration) return;
			if (node.importKind === 'type') return;

			const module = node.source.value;
			const isAwsSdk = AWS_SDK_MODULE.test(module);

			for (const specifier of node.specifiers) {
				if (specifier.type === AST_NODE_TYPES.ImportSpecifier) {
					if (specifier.importKind === 'type') continue;
					const importedName =
						specifier.imported.type === AST_NODE_TYPES.Identifier
							? specifier.imported.name
							: specifier.imported.value;
					bindings.set(specifier.local.name, { module, isAwsSdk, importedName });
				} else if (specifier.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
					// `import * as ns from '...'` — member access (`ns.X`) is resolved later.
					bindings.set(specifier.local.name, { module, isAwsSdk, importedName: '*' });
				} else {
					// Default import — bound by local name, no original name to resolve.
					bindings.set(specifier.local.name, {
						module,
						isAwsSdk,
						importedName: specifier.local.name,
					});
				}
			}
		},
	});

	return bindings;
}

interface DeclarationIndex {
	/** Variable name -> its initializer expression (top-level/function-scope declarators). */
	initializers: Map<string, TSESTree.Expression>;
}

/**
 * Deterministic same-file declaration pre-pass. `simpleTraverse` provides no scope
 * chain, so this is a flat collection of declarator initializers by name — not real
 * scope resolution.
 */
function buildDeclarationIndex(ast: TSESTree.Program): DeclarationIndex {
	const initializers = new Map<string, TSESTree.Expression>();

	simpleTraverse(ast, {
		enter(node) {
			if (
				node.type === AST_NODE_TYPES.VariableDeclarator &&
				node.id.type === AST_NODE_TYPES.Identifier &&
				node.init
			) {
				initializers.set(node.id.name, node.init);
			}
		},
	});

	return { initializers };
}

/**
 * Resolves whether the object the construction config resolves to statically carries a
 * `credentials` key. Verification is construction-time, not whole-file: the config must be
 * an inline object literal or a same-file variable whose initializer is an object literal.
 * A post-construction `cfg.credentials = ...` assignment is deliberately NOT accepted —
 * accepting it (scope/order-blind) would let an unrelated assignment mask a genuinely
 * missing key. All real sites use a `{ region, credentials }` initializer, so this holds.
 */
function configHasCredentials(
	arg: TSESTree.CallExpressionArgument,
	declarations: DeclarationIndex,
): boolean {
	if (arg.type === AST_NODE_TYPES.ObjectExpression) {
		return hasObjectKey(arg, 'credentials');
	}

	if (arg.type === AST_NODE_TYPES.Identifier) {
		const init = declarations.initializers.get(arg.name);
		if (init?.type === AST_NODE_TYPES.ObjectExpression) {
			return hasObjectKey(init, 'credentials');
		}
	}

	return false;
}

export function scanSourceForAwsCredentialIssues(
	source: string,
	filename = '<inline>',
): ScanResult {
	const ast = parse(source, { jsx: false, range: true });
	const imports = collectImportBindings(ast);
	const declarations = buildDeclarationIndex(ast);

	const issues: string[] = [];
	let clientConstructionCount = 0;

	simpleTraverse(ast, {
		enter(node) {
			// `new <awsSdkClient>(config)` must receive explicit `credentials`. Covers a bare
			// `new STSClient(...)` and namespace-member `new ns.STSClient(...)` where `ns` is an
			// `@aws-sdk/*` namespace import; the latter would otherwise slip the net as a
			// credential-less client.
			if (node.type === AST_NODE_TYPES.NewExpression) {
				const clientName = resolveAwsClientName(node.callee, imports);
				if (clientName) {
					clientConstructionCount += 1;
					const [arg] = node.arguments;

					if (!arg) {
						issues.push(`new ${clientName}() constructed without a config argument in ${filename}`);
					} else if (!configHasCredentials(arg, declarations)) {
						issues.push(
							`cannot statically verify credentials for new ${clientName}(${describeArg(arg)}) in ${filename}`,
						);
					}
				}
			}

			// `fromTemporaryCredentials({ ... })` must pass `masterCredentials`. Resolved through
			// the import binding so an aliased import (`{ fromTemporaryCredentials as ftc }`) or a
			// namespace member (`creds.fromTemporaryCredentials(...)`) is caught too.
			if (
				node.type === AST_NODE_TYPES.CallExpression &&
				calleeIsFromTemporaryCredentials(node.callee, imports)
			) {
				const [arg] = node.arguments;
				if (arg?.type !== AST_NODE_TYPES.ObjectExpression) {
					issues.push(
						`cannot statically verify masterCredentials for ${FROM_TEMPORARY_CREDENTIALS}(...) in ${filename}`,
					);
				} else if (!hasObjectKey(arg, 'masterCredentials')) {
					issues.push(
						`${FROM_TEMPORARY_CREDENTIALS}(...) missing masterCredentials in ${filename}`,
					);
				}
			}
		},
	});

	return { clientConstructionCount, issues };
}

/**
 * Returns the display name of the AWS SDK client a `new` callee resolves to, or undefined.
 * Handles an Identifier bound to an `@aws-sdk/*` import and a `ns.Client` member where `ns`
 * is an `@aws-sdk/*` namespace import.
 */
function resolveAwsClientName(
	callee: TSESTree.Expression,
	imports: Map<string, ImportBinding>,
): string | undefined {
	if (callee.type === AST_NODE_TYPES.Identifier) {
		return imports.get(callee.name)?.isAwsSdk ? callee.name : undefined;
	}

	if (
		callee.type === AST_NODE_TYPES.MemberExpression &&
		!callee.computed &&
		callee.object.type === AST_NODE_TYPES.Identifier &&
		callee.property.type === AST_NODE_TYPES.Identifier
	) {
		const binding = imports.get(callee.object.name);
		if (binding?.isAwsSdk && binding.importedName === '*') {
			return `${callee.object.name}.${callee.property.name}`;
		}
	}

	return undefined;
}

/**
 * Whether a call's callee resolves to `fromTemporaryCredentials` imported from
 * `@aws-sdk/credential-providers`, via either a (possibly aliased) named import on an
 * Identifier callee or a namespace member on a MemberExpression callee.
 */
function calleeIsFromTemporaryCredentials(
	callee: TSESTree.Expression,
	imports: Map<string, ImportBinding>,
): boolean {
	if (callee.type === AST_NODE_TYPES.Identifier) {
		const binding = imports.get(callee.name);
		return (
			binding?.module === CREDENTIAL_PROVIDERS_MODULE &&
			binding.importedName === FROM_TEMPORARY_CREDENTIALS
		);
	}

	if (
		callee.type === AST_NODE_TYPES.MemberExpression &&
		!callee.computed &&
		callee.object.type === AST_NODE_TYPES.Identifier &&
		callee.property.type === AST_NODE_TYPES.Identifier &&
		callee.property.name === FROM_TEMPORARY_CREDENTIALS
	) {
		const binding = imports.get(callee.object.name);
		return binding?.module === CREDENTIAL_PROVIDERS_MODULE && binding.importedName === '*';
	}

	return false;
}

function describeArg(arg: TSESTree.CallExpressionArgument): string {
	if (arg.type === AST_NODE_TYPES.Identifier) return arg.name;
	if (arg.type === AST_NODE_TYPES.CallExpression) return 'call-expression';
	return arg.type;
}

function collectTsFiles(dir: string): string[] {
	const results: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			for (const nested of collectTsFiles(fullPath)) results.push(nested);
		} else if (
			entry.isFile() &&
			entry.name.endsWith('.ts') &&
			!entry.name.endsWith('.test.ts') &&
			!entry.name.endsWith('.d.ts')
		) {
			results.push(fullPath);
		}
	}
	return results;
}

function scanSurface(): ScanResult {
	const aggregate: ScanResult = { clientConstructionCount: 0, issues: [] };

	for (const dir of SCAN_DIRS) {
		if (!existsSync(dir)) continue;
		for (const file of collectTsFiles(dir)) {
			const result = scanSourceForAwsCredentialIssues(readFileSync(file, 'utf8'), file);
			aggregate.clientConstructionCount += result.clientConstructionCount;
			aggregate.issues = aggregate.issues.concat(result.issues);
		}
	}

	return aggregate;
}

describe('AWS SDK client credentials guardrail (real surface)', () => {
	const result = scanSurface();

	it('finds at least the known AWS SDK client constructions', () => {
		expect(result.clientConstructionCount).toBeGreaterThanOrEqual(
			MIN_EXPECTED_CLIENT_CONSTRUCTIONS,
		);
	});

	it('constructs every AWS SDK client with explicit credentials and masterCredentials', () => {
		expect(result.issues).toEqual([]);
	});
});

describe('scanSourceForAwsCredentialIssues controls', () => {
	const stsImport = "import { STSClient } from '@aws-sdk/client-sts';";
	const stsNamespaceImport = "import * as sts from '@aws-sdk/client-sts';";

	it('(a) flags an inline client config missing credentials', () => {
		const result = scanSourceForAwsCredentialIssues(
			`${stsImport}\nconst c = new STSClient({ region: 'us-east-1' });`,
		);
		expect(result.clientConstructionCount).toBe(1);
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toContain('cannot statically verify credentials for new STSClient');
	});

	it('(b) flags a variable client config missing credentials', () => {
		const result = scanSourceForAwsCredentialIssues(
			`${stsImport}\nconst cfg = { region: 'us-east-1' };\nconst c = new STSClient(cfg);`,
		);
		expect(result.clientConstructionCount).toBe(1);
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toContain(
			'cannot statically verify credentials for new STSClient(cfg)',
		);
	});

	it('(c) accepts a variable client config carrying credentials', () => {
		const result = scanSourceForAwsCredentialIssues(
			`${stsImport}\nconst credentials = {};\nconst cfg = { region: 'us-east-1', credentials };\nconst c = new STSClient(cfg);`,
		);
		expect(result.clientConstructionCount).toBe(1);
		expect(result.issues).toEqual([]);
	});

	it('(d) flags fromTemporaryCredentials missing masterCredentials', () => {
		const result = scanSourceForAwsCredentialIssues(
			`import { ${FROM_TEMPORARY_CREDENTIALS} } from '${CREDENTIAL_PROVIDERS_MODULE}';\nconst p = ${FROM_TEMPORARY_CREDENTIALS}({ params: {} });`,
		);
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toContain('missing masterCredentials');
	});

	it('(e) fails closed on an unresolvable client config argument', () => {
		const result = scanSourceForAwsCredentialIssues(
			`${stsImport}\nconst c = new STSClient(getCfg());`,
		);
		expect(result.clientConstructionCount).toBe(1);
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toContain(
			'cannot statically verify credentials for new STSClient(call-expression)',
		);
	});

	it('does not flag non-@aws-sdk client constructions', () => {
		const result = scanSourceForAwsCredentialIssues(
			"import { ProjectsClient } from '@google-cloud/resource-manager';\nconst c = new ProjectsClient({});",
		);
		expect(result.clientConstructionCount).toBe(0);
		expect(result.issues).toEqual([]);
	});

	it('(f) flags a namespace-member client construction missing credentials', () => {
		const result = scanSourceForAwsCredentialIssues(
			`${stsNamespaceImport}\nconst c = new sts.STSClient({ region: 'us-east-1' });`,
		);
		expect(result.clientConstructionCount).toBe(1);
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toContain(
			'cannot statically verify credentials for new sts.STSClient',
		);
	});

	it('(g) flags an aliased fromTemporaryCredentials missing masterCredentials', () => {
		const result = scanSourceForAwsCredentialIssues(
			`import { ${FROM_TEMPORARY_CREDENTIALS} as ftc } from '${CREDENTIAL_PROVIDERS_MODULE}';\nconst p = ftc({ params: {} });`,
		);
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toContain('missing masterCredentials');
	});

	it('(h) flags a namespace-member fromTemporaryCredentials missing masterCredentials', () => {
		const result = scanSourceForAwsCredentialIssues(
			`import * as creds from '${CREDENTIAL_PROVIDERS_MODULE}';\nconst p = creds.${FROM_TEMPORARY_CREDENTIALS}({ params: {} });`,
		);
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toContain('missing masterCredentials');
	});

	it('(i) still flags credentials assigned after construction (assignment does not satisfy)', () => {
		const result = scanSourceForAwsCredentialIssues(
			`${stsImport}\nconst cfg = { region: 'us-east-1' };\nconst c = new STSClient(cfg);\ncfg.credentials = {};`,
		);
		expect(result.clientConstructionCount).toBe(1);
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toContain(
			'cannot statically verify credentials for new STSClient(cfg)',
		);
	});
});
