/**
 * Resolves the credentials requested for a one-off task into the three shapes
 * the tool needs: the per-exec env map (values — exist only for the harness
 * exec), the secrets manifest (names + labels — written into the sandbox for
 * the in-sandbox redactor), and the scrub list (values + labels — for the
 * authoritative host-side redaction).
 */
import type { z } from 'zod';

import {
	credentialEnvVarName,
	type injectedCredentialSchema,
	type OneOffTaskCredentialResolver,
	type SecretsManifest,
} from './contracts';
import type { ScrubSecret } from './redaction';

export type InjectedCredential = z.infer<typeof injectedCredentialSchema>;

/** A credential the orchestrator selected for injection (user-approved). */
export interface RequestedCredential {
	credentialId: string;
	name: string;
	type: string;
}

export interface ResolvedTaskSecrets {
	/** Env var name → secret value. Passed only to the harness exec. */
	env: Record<string, string>;
	/** Names + labels only — never values. Written into the sandbox. */
	manifest: SecretsManifest;
	/** Values + labels for host-side scrubbing. Never leaves this process. */
	scrubSecrets: ScrubSecret[];
	/** The `credentials` section of the task contract. */
	injectedCredentials: InjectedCredential[];
}

const ENV_PREFIX = 'N8N_TASK_';

/** Redaction label: the env var minus the shared prefix, e.g. `GOOGLE_SHEETS_ACCESS_TOKEN`. */
function labelForEnvVar(envVar: string): string {
	return envVar.startsWith(ENV_PREFIX) ? envVar.slice(ENV_PREFIX.length) : envVar;
}

/**
 * Recover the field name from a `credentialEnvVarName`-shaped env var by
 * stripping the credential's own prefix. Falls back to the full env var when
 * the resolver used a non-conventional name.
 */
function fieldForEnvVar(credentialName: string, envVar: string): string {
	// `credentialEnvVarName(name, 'x')` = `N8N_TASK_<CRED>_X`; dropping the
	// final char yields the per-credential prefix `N8N_TASK_<CRED>_`.
	const prefix = credentialEnvVarName(credentialName, 'x').slice(0, -1);
	return envVar.startsWith(prefix) ? envVar.slice(prefix.length).toLowerCase() : envVar;
}

export async function resolveTaskCredentials(
	resolver: OneOffTaskCredentialResolver,
	requested: RequestedCredential[],
	options: { userId: string; projectId?: string },
): Promise<ResolvedTaskSecrets> {
	const env: Record<string, string> = {};
	const manifestSecrets: SecretsManifest['secrets'] = [];
	const scrubSecrets: ScrubSecret[] = [];
	const injectedCredentials: InjectedCredential[] = [];

	for (const credential of requested) {
		// Access is rechecked at resolve time by the adapter (workstream C);
		// a denial surfaces as a UserError from this call.
		const resolved = await resolver.resolveForOneOffTask({
			credentialId: credential.credentialId,
			userId: options.userId,
			...(options.projectId ? { projectId: options.projectId } : {}),
		});

		const envVars: InjectedCredential['envVars'] = [];
		for (const [envVar, value] of Object.entries(resolved.envVars)) {
			env[envVar] = value;
			const label = labelForEnvVar(envVar);
			manifestSecrets.push({ envVar, label });
			scrubSecrets.push({ value, label });
			envVars.push({ envVar, field: fieldForEnvVar(credential.name, envVar) });
		}
		injectedCredentials.push({ name: credential.name, type: credential.type, envVars });
	}

	return {
		env,
		manifest: { version: 1, secrets: manifestSecrets },
		scrubSecrets,
		injectedCredentials,
	};
}

/**
 * Merge the harness's LLM provider env vars (e.g. `ANTHROPIC_API_KEY`) into
 * the resolved task secrets. The model key is a secret like any credential
 * value — it joins the per-exec env, the scrub list, and the secrets manifest
 * (label = the env var name) — but it is NOT a task credential, so
 * `injectedCredentials` (and therefore the task contract/prompt) stays
 * untouched.
 */
export function withHarnessLlmEnv(
	resolved: ResolvedTaskSecrets,
	llmEnvVars: Record<string, string>,
): ResolvedTaskSecrets {
	const env = { ...resolved.env };
	const manifestSecrets = [...resolved.manifest.secrets];
	const scrubSecrets = [...resolved.scrubSecrets];

	for (const [envVar, value] of Object.entries(llmEnvVars)) {
		env[envVar] = value;
		manifestSecrets.push({ envVar, label: envVar });
		scrubSecrets.push({ value, label: envVar });
	}

	return {
		env,
		manifest: { version: 1, secrets: manifestSecrets },
		scrubSecrets,
		injectedCredentials: resolved.injectedCredentials,
	};
}
