/**
 * Shared in-sandbox runtime: secret redaction and env-dump command blocking.
 *
 * Embedded as a source string into the guardrails pi extension (see
 * `guardrails-extension.ts`); kept as plain JavaScript so unit tests evaluate
 * the exact code that ships in the sandbox via `new Function`.
 */
export const GUARDRAILS_RUNTIME_SOURCE = String.raw`
// ── shared runtime: redaction and env-dump blocking ─────────────────────────

// Values shorter than this are never redacted: replacing ubiquitous short
// strings would shred innocent output, and a 1-3 character credential is not
// a realistic secret.
const MIN_REDACTABLE_SECRET_LENGTH = 4;

/** Resolves manifest env var names to the secret values present in env. */
function collectSecretValues(manifest, env) {
	if (manifest === null || manifest === undefined) return [];
	const collected = [];
	for (const secret of manifest.secrets) {
		const value = env[secret.envVar];
		if (typeof value === 'string' && value.length >= MIN_REDACTABLE_SECRET_LENGTH) {
			collected.push({ label: secret.label, value });
		}
	}
	return collected;
}

/**
 * A secret can surface verbatim, JSON-escaped (inside stringified payloads),
 * or URL-encoded (inside query strings and form bodies) — redact every shape.
 */
function redactionVariants(value) {
	const variants = [value];
	const jsonEscaped = JSON.stringify(value).slice(1, -1);
	if (jsonEscaped !== value) variants.push(jsonEscaped);
	try {
		const uriEncoded = encodeURIComponent(value);
		if (uriEncoded !== value) variants.push(uriEncoded);
	} catch {
		// Lone surrogates cannot be URI-encoded; the verbatim variant still applies.
	}
	return variants;
}

/** Replaces every occurrence of every secret value with [REDACTED:<label>]. */
function redactSecrets(text, secrets) {
	if (typeof text !== 'string' || text.length === 0) return text;
	// Longest value first, so a secret containing another secret cannot leave
	// a recognizable fragment behind after partial replacement.
	const ordered = secrets.slice().sort((a, b) => b.value.length - a.value.length);
	let redacted = text;
	for (const secret of ordered) {
		const marker = '[REDACTED:' + secret.label + ']';
		for (const variant of redactionVariants(secret.value)) {
			redacted = redacted.split(variant).join(marker);
		}
	}
	return redacted;
}

function escapeRegExp(value) {
	return value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}

/** Matches $VAR and dollar-brace VAR references in a shell segment. */
function referencesEnvVar(segment, envVar) {
	const pattern = new RegExp('\\$\\{?' + escapeRegExp(envVar) + '(?![A-Za-z0-9_])');
	return pattern.test(segment);
}

// Commands whose sole purpose in a segment is to print their arguments —
// printing a secret env var through them leaks the value into the transcript.
const PRINTING_COMMANDS = new Set(['echo', 'printf']);

function commandBasename(token) {
	const slashIndex = token.lastIndexOf('/');
	return slashIndex === -1 ? token : token.slice(slashIndex + 1);
}

/**
 * Screens a bash command for the obvious ways to dump the process
 * environment. Returns a human-readable block reason, or null when the
 * command looks safe. This is a tripwire, not a wall: code the model writes
 * can always read process.env — the real protections are value redaction and
 * the host-side scrub of the event stream.
 */
function findEnvDumpBlockReason(command, secretEnvVars) {
	if (typeof command !== 'string' || command.trim().length === 0) return null;
	const guidance =
		' Use the list_credentials tool to see which credentials are available, and read individual' +
		' values in code (process.env.NAME) only at the point of use, without printing them.';
	// Split on shell separators so "ls && env" is caught. This is a heuristic
	// tokenization, deliberately simple — see the tripwire note above.
	const segments = command.split(/\r?\n|&&|\|\||[;|&]/);
	for (const rawSegment of segments) {
		const segment = rawSegment.trim();
		if (segment.length === 0) continue;
		if (/\/proc\/\S*\/environ/.test(segment)) {
			return (
				'Blocked: reading /proc/*/environ dumps the process environment, which holds credential values.' +
				guidance
			);
		}
		const tokens = segment.split(/\s+/);
		const executable = commandBasename(tokens[0]);
		const args = tokens.slice(1);
		if (executable === 'printenv') {
			return (
				'Blocked: printenv prints environment variables, which hold credential values.' + guidance
			);
		}
		// "env VAR=x command" is a legitimate launcher; bare or flag-only env dumps everything.
		if (executable === 'env' && args.every((arg) => arg.startsWith('-'))) {
			return (
				'Blocked: env without a command prints the entire environment, which holds credential values.' +
				guidance
			);
		}
		if (executable === 'set' && args.length === 0) {
			return (
				'Blocked: bare "set" prints all shell variables, including the environment.' + guidance
			);
		}
		if (executable === 'export' && (args.length === 0 || args.includes('-p'))) {
			return (
				'Blocked: "export" in print mode lists exported environment variables, which hold credential values.' +
				guidance
			);
		}
		if ((executable === 'declare' || executable === 'typeset') && args.includes('-p')) {
			return (
				'Blocked: "' +
				executable +
				' -p" prints shell variables, including the environment.' +
				guidance
			);
		}
		if (PRINTING_COMMANDS.has(executable)) {
			for (const envVar of secretEnvVars) {
				if (referencesEnvVar(segment, envVar)) {
					return (
						'Blocked: printing ' +
						envVar +
						' would write a credential value into the transcript.' +
						guidance
					);
				}
			}
		}
	}
	return null;
}
`;
