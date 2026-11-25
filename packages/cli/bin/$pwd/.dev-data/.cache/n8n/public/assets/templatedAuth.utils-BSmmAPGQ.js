import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { Ar as require_startCase, xi as require_escapeRegExp } from "./vendor-Hx42-oQF.js";
import { Rk as jsonParse } from "./app-D5flEmb-.js";
//#region src/features/credentials/templatedAuth.utils.ts
var import_escapeRegExp = /* @__PURE__ */ __toESM(require_escapeRegExp(), 1);
var import_startCase = /* @__PURE__ */ __toESM(require_startCase(), 1);
/**
* Helpers for Templated Custom Auth (`httpTemplatedCustomAuth`) credentials:
* the template's `{{marker}}`s are the source of truth for which inputs a
* simple view renders; placeholder defs only contribute labels and masking.
*
* Markers are NOT n8n expressions: they are plain named placeholders that the
* server substitutes per JSON leaf with stored values, never evaluated (an
* agent/user-supplied template must not become an eval surface). Expressions
* only appear as placeholder *values* (e.g. `={{ $secrets.vault.key }}`),
* where the platform's expression handling applies.
*/
var TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE = "httpTemplatedCustomAuth";
var PLACEHOLDER_MARKER_REGEX = /\{\{\s*([\w.-]+)\s*\}\}/g;
/** Parse a credential's JSON-string field, tolerating blanks and garbage. */
function parseTemplatedAuthField(raw, fallback) {
	if (typeof raw !== "string" || raw.trim() === "") return fallback;
	return jsonParse(raw, { fallbackValue: fallback });
}
/**
* Same shape rule as the server resolver (assertTemplatedAuthParts in
* packages/nodes-base/utils/templated-auth.ts): the template must be an
* object whose headers/body/qs parts, when present, are objects too — a
* parseable but wrong-shaped template would only fail at resolve time.
*/
function isValidTemplateShape(template) {
	if (typeof template !== "object" || template === null || Array.isArray(template)) return false;
	return [
		"headers",
		"body",
		"qs"
	].every((part) => {
		const value = template[part];
		return value === void 0 || typeof value === "object" && value !== null && !Array.isArray(value);
	});
}
/** All string leaves of a parsed template, in depth-first encounter order. */
function stringLeaves(value) {
	if (typeof value === "string") return [value];
	if (Array.isArray(value)) return value.flatMap(stringLeaves);
	if (typeof value === "object" && value !== null) return Object.values(value).flatMap(stringLeaves);
	return [];
}
/** All `{{marker}}` names in the template, deduplicated in encounter order. */
function extractTemplateMarkers(template) {
	return [...new Set(stringLeaves(template).flatMap((leaf) => [...leaf.matchAll(PLACEHOLDER_MARKER_REGEX)].map((match) => match[1])))];
}
/**
* Static template text directly before a `{{marker}}` in the same string
* (e.g. `Key ` in `Key {{api_key}}`), used to strip a pasted duplicate of
* that prefix (some dashboards copy `Key abc…` including the scheme word).
*/
function markerPrefix(template, name) {
	const marker = new RegExp(`\\{\\{\\s*${(0, import_escapeRegExp.default)(name)}\\s*\\}\\}`);
	for (const leaf of stringLeaves(template)) {
		const match = marker.exec(leaf);
		if (match && match.index > 0) return leaf.slice(0, match.index);
	}
	return "";
}
/**
* Normalize a value emitted by a guided-form input back to what should be
* stored: the displayed blanking mask (bare, or '='-prefixed by the expression
* toggle, which re-emits the displayed value) maps back to the `***` sentinel,
* so the mask itself can never be saved over the real secret.
*/
function storedPlaceholderValue(displayed) {
	const bare = displayed.startsWith("=") ? displayed.slice(1) : displayed;
	return bare === "__n8n_BLANK_VALUE_e5362baf-c777-4d57-a609-6eaf1f9e87f6" || bare === "***" ? "***" : displayed;
}
/** Trim a pasted value and strip a duplicated template prefix. Expressions
*  (external-secrets references) pass through untouched. */
function cleanPlaceholderValue(template, name, value) {
	if (value.startsWith("=")) return value;
	let cleaned = value.trim();
	const prefix = markerPrefix(template, name);
	if (prefix && cleaned.startsWith(prefix)) cleaned = cleaned.slice(prefix.length).trim();
	return cleaned;
}
function parsePlaceholderDefs(raw) {
	const parsed = parseTemplatedAuthField(raw, []);
	if (!Array.isArray(parsed)) return [];
	return parsed.filter((def) => typeof def?.name === "string");
}
function parsePlaceholderValues(raw) {
	const parsed = parseTemplatedAuthField(raw, {});
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
	return Object.fromEntries(Object.entries(parsed).filter((entry) => typeof entry[1] === "string"));
}
/**
* "fal.ai API Key" + user → "fal.ai API Key (Jan D)". Suffixes the creator so
* same-recipe credentials stay tellable-apart in shared projects.
*/
function composeCredentialNameWithUser(base, user) {
	const first = user?.firstName?.trim();
	if (!first) return base;
	const lastInitial = user?.lastName?.trim().charAt(0) ?? "";
	return `${base} (${first}${lastInitial ? ` ${lastInitial}` : ""})`;
}
/**
* Human service identity for labels: the recipe's suggested credential name
* ("fal.ai API Key").
*/
function deriveServiceName(setupHint) {
	return setupHint?.suggestedName?.trim() || void 0;
}
/** A stored URL only when it parses as http(s) — junk must not reach the
*  handoff context's strict url() validation. */
function parseHttpUrl(value) {
	if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return void 0;
	try {
		new URL(value);
		return value;
	} catch {
		return;
	}
}
/**
* The guided form's input labels, one per template marker — what the user
* actually pastes into a recipe-created credential.
*/
function listPlaceholderTitles(credentialData) {
	const template = parseTemplatedAuthField(credentialData.template, {});
	const defsByName = new Map(parsePlaceholderDefs(credentialData.placeholderDefs).map((def) => [def.name, def]));
	return extractTemplateMarkers(template).map((marker) => defsByName.get(marker)?.title || (0, import_startCase.default)(marker));
}
//#endregion
export { extractTemplateMarkers as a, parseHttpUrl as c, parseTemplatedAuthField as d, storedPlaceholderValue as f, deriveServiceName as i, parsePlaceholderDefs as l, cleanPlaceholderValue as n, isValidTemplateShape as o, composeCredentialNameWithUser as r, listPlaceholderTitles as s, TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE as t, parsePlaceholderValues as u };
