import { transform } from 'esbuild';
import * as agents from '@n8n/agents';
import { verify } from '@n8n/agents';
import * as zod from 'zod';
import { playgroundCheckpointStore } from './checkpoint-store';
import { getCredentialKey } from './credentials-db';

export interface CompileResult {
	ok: boolean;
	error?: string;
	exported?: unknown;
	evalNames?: string[];
}

/**
 * Wraps the SDK's Agent class so that `.build()` automatically injects
 * the playground's checkpoint store and resolves declared credentials.
 * This is exactly what the execution engine would do — the user never
 * needs to call `.checkpoint()` or handle API keys manually.
 */
class EngineAgent extends agents.Agent {
	build() {
		this.checkpoint(playgroundCheckpointStore);

		const credName = this.declaredCredential;
		if (!credName) {
			throw new Error(
				"Agent requires a credential. Add .credential('name') to specify which credential to use " +
					"(e.g. .credential('anthropic')). Add credentials via the Credentials panel.",
			);
		}

		const apiKey = getCredentialKey(credName);
		if (!apiKey) {
			throw new Error(`Credential "${credName}" not found. Add it via the Credentials panel.`);
		}

		this.resolvedApiKey = apiKey;
		return super.build();
	}
}

/**
 * Wraps the SDK's Eval class so that `.build()` automatically resolves
 * credentials for LLM-as-judge evals.
 */
class EngineEval extends agents.Eval {
	protected override build() {
		const credName = this.declaredCredential;
		if (credName) {
			const apiKey = getCredentialKey(credName);
			if (apiKey) {
				this.resolvedApiKey = apiKey;
			}
		}
		return super.build();
	}
}

/** The module exposed to user code as `require('@n8n/agents')`. */
const sandboxedAgents = { ...agents, Agent: EngineAgent, Eval: EngineEval };

/**
 * Transpile TypeScript source to CJS via esbuild and eval it in a sandbox
 * that only allows @n8n/agents and zod imports.
 *
 * Used by both the compile route (to activate agents) and the typecheck tool
 * (to validate generated code).
 */
export async function compileSource(source: string): Promise<CompileResult> {
	if (!source?.trim()) {
		return { ok: false, error: 'No source code provided' };
	}

	const verification = verify(source);
	if (!verification.ok) {
		return { ok: false, error: verification.errors.join('\n') };
	}

	try {
		const result = await transform(source, {
			loader: 'ts',
			format: 'cjs',
			target: 'es2022',
		});

		const moduleExports: Record<string, unknown> = {};
		const moduleRequire = (id: string) => {
			if (id === '@n8n/agents') return sandboxedAgents;
			if (id === 'zod') return zod;
			throw new Error(`Module "${id}" is not available in the playground`);
		};

		const fn = new Function(
			'exports',
			'require',
			'module',
			'fetch',
			'console',
			'Buffer',
			result.code,
		);
		const mod = { exports: moduleExports };
		fn(moduleExports, moduleRequire, mod, fetch, console, Buffer);

		const exported = mod.exports.default ?? mod.exports;

		if (!exported || typeof exported !== 'object' || !('run' in exported)) {
			return {
				ok: false,
				error: 'No agent found. Export a built agent as default: export default agent;',
			};
		}

		// Extract eval names from the agent if it has evaluations attached
		const evalNames =
			'evaluations' in exported
				? (exported as { evaluations: Array<{ name: string }> }).evaluations.map((e) => e.name)
				: [];

		return { ok: true, exported, evalNames };
	} catch (e) {
		return {
			ok: false,
			error: e instanceof Error ? e.message : 'Unknown compilation error',
		};
	}
}
