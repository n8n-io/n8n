import { __version__ } from "../index.js";

//#region ../../node_modules/.pnpm/langsmith@0.3.74_@opentelemetry+api@1.9.0_openai@5.12.2_ws@8.18.3_bufferutil@4.0.9_utf-8-validate@6.0.5__zod@3.25.76_/node_modules/langsmith/dist/utils/env.js
let globalEnv;
const isBrowser = () => typeof window !== "undefined" && typeof window.document !== "undefined";
const isWebWorker = () => typeof globalThis === "object" && globalThis.constructor && globalThis.constructor.name === "DedicatedWorkerGlobalScope";
const isJsDom = () => typeof window !== "undefined" && window.name === "nodejs" || typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom");
const isDeno = () => typeof Deno !== "undefined";
const isNode = () => typeof process !== "undefined" && typeof process.versions !== "undefined" && typeof process.versions.node !== "undefined" && !isDeno();
const getEnv = () => {
	if (globalEnv) return globalEnv;
	if (typeof Bun !== "undefined") globalEnv = "bun";
	else if (isBrowser()) globalEnv = "browser";
	else if (isNode()) globalEnv = "node";
	else if (isWebWorker()) globalEnv = "webworker";
	else if (isJsDom()) globalEnv = "jsdom";
	else if (isDeno()) globalEnv = "deno";
	else globalEnv = "other";
	return globalEnv;
};
let runtimeEnvironment;
function getRuntimeEnvironment() {
	if (runtimeEnvironment === void 0) {
		const env = getEnv();
		const releaseEnv = getShas();
		runtimeEnvironment = {
			library: "langsmith",
			runtime: env,
			sdk: "langsmith-js",
			sdk_version: __version__,
			...releaseEnv
		};
	}
	return runtimeEnvironment;
}
/**
* Retrieves the LangSmith-specific metadata from the current runtime environment.
*
* @returns {Record<string, string>}
*  - A record of LangSmith-specific metadata environment variables.
*/
function getLangSmithEnvVarsMetadata() {
	const allEnvVars = getLangSmithEnvironmentVariables();
	const envVars = {};
	const excluded = [
		"LANGCHAIN_API_KEY",
		"LANGCHAIN_ENDPOINT",
		"LANGCHAIN_TRACING_V2",
		"LANGCHAIN_PROJECT",
		"LANGCHAIN_SESSION",
		"LANGSMITH_API_KEY",
		"LANGSMITH_ENDPOINT",
		"LANGSMITH_TRACING_V2",
		"LANGSMITH_PROJECT",
		"LANGSMITH_SESSION"
	];
	for (const [key, value] of Object.entries(allEnvVars)) if (typeof value === "string" && !excluded.includes(key) && !key.toLowerCase().includes("key") && !key.toLowerCase().includes("secret") && !key.toLowerCase().includes("token")) if (key === "LANGCHAIN_REVISION_ID") envVars["revision_id"] = value;
	else envVars[key] = value;
	return envVars;
}
/**
* Retrieves only the LangChain/LangSmith-prefixed environment variables from the current runtime environment.
* This is more efficient than copying all environment variables.
*
* @returns {Record<string, string>}
*  - A record of LangChain/LangSmith environment variables.
*/
function getLangSmithEnvironmentVariables() {
	const envVars = {};
	try {
		if (typeof process !== "undefined" && process.env) {
			for (const [key, value] of Object.entries(process.env)) if ((key.startsWith("LANGCHAIN_") || key.startsWith("LANGSMITH_")) && value != null) if ((key.toLowerCase().includes("key") || key.toLowerCase().includes("secret") || key.toLowerCase().includes("token")) && typeof value === "string") envVars[key] = value.slice(0, 2) + "*".repeat(value.length - 4) + value.slice(-2);
			else envVars[key] = value;
		}
	} catch (e) {}
	return envVars;
}
function getEnvironmentVariable(name) {
	try {
		return typeof process !== "undefined" ? process.env?.[name] : void 0;
	} catch (e) {
		return void 0;
	}
}
function getLangSmithEnvironmentVariable(name) {
	return getEnvironmentVariable(`LANGSMITH_${name}`) || getEnvironmentVariable(`LANGCHAIN_${name}`);
}
let cachedCommitSHAs;
/**
* Get the Git commit SHA from common environment variables
* used by different CI/CD platforms.
* @returns {string | undefined} The Git commit SHA or undefined if not found.
*/
function getShas() {
	if (cachedCommitSHAs !== void 0) return cachedCommitSHAs;
	const common_release_envs = [
		"VERCEL_GIT_COMMIT_SHA",
		"NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA",
		"COMMIT_REF",
		"RENDER_GIT_COMMIT",
		"CI_COMMIT_SHA",
		"CIRCLE_SHA1",
		"CF_PAGES_COMMIT_SHA",
		"REACT_APP_GIT_SHA",
		"SOURCE_VERSION",
		"GITHUB_SHA",
		"TRAVIS_COMMIT",
		"GIT_COMMIT",
		"BUILD_VCS_NUMBER",
		"bamboo_planRepository_revision",
		"Build.SourceVersion",
		"BITBUCKET_COMMIT",
		"DRONE_COMMIT_SHA",
		"SEMAPHORE_GIT_SHA",
		"BUILDKITE_COMMIT"
	];
	const shas = {};
	for (const env of common_release_envs) {
		const envVar = getEnvironmentVariable(env);
		if (envVar !== void 0) shas[env] = envVar;
	}
	cachedCommitSHAs = shas;
	return shas;
}
function getOtelEnabled() {
	return getEnvironmentVariable("OTEL_ENABLED") === "true" || getLangSmithEnvironmentVariable("OTEL_ENABLED") === "true";
}

//#endregion
export { getEnv, getEnvironmentVariable, getLangSmithEnvVarsMetadata, getLangSmithEnvironmentVariable, getOtelEnabled, getRuntimeEnvironment };
//# sourceMappingURL=env.js.map