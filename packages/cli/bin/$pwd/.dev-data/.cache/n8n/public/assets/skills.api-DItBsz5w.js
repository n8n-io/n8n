import { Fw as makeRestApiRequest } from "./app-D5flEmb-.js";
//#region src/features/settings/context/skills.api.ts
var ENDPOINT = "/skills";
var SOURCES_ENDPOINT = "/skill-sources";
async function getSkills(context, query = {}) {
	return await makeRestApiRequest(context, "GET", ENDPOINT, { ...query });
}
/** The users who created a skill that the current user can see. */
async function getSkillCreators(context) {
	return await makeRestApiRequest(context, "GET", `${ENDPOINT}/creators`);
}
/** The agents the current user can read, searched by name, for the agent filter. */
async function getSkillAgents(context, query = {}) {
	return await makeRestApiRequest(context, "GET", `${ENDPOINT}/agents`, { ...query });
}
/** A name that no skill in the scope has yet: the requested name, or the name with a number. */
async function getNewSkillName(context, query) {
	return (await makeRestApiRequest(context, "GET", `${ENDPOINT}/new-name`, { ...query })).name;
}
async function getSkill(context, id) {
	return await makeRestApiRequest(context, "GET", `${ENDPOINT}/${id}`);
}
async function createSkill(context, payload) {
	return await makeRestApiRequest(context, "POST", ENDPOINT, payload);
}
/** Saves the next version. Answers `created: false` when the content matches the latest one. */
async function saveSkill(context, id, payload) {
	return await makeRestApiRequest(context, "PATCH", `${ENDPOINT}/${id}`, payload);
}
async function deleteSkill(context, id) {
	await makeRestApiRequest(context, "DELETE", `${ENDPOINT}/${id}`);
}
/** The scope of a source, as the credential and repository lists take it. */
/** The credentials that a source in the scope accepts and that the user can use. */
async function getSkillSourceCredentials(context, query) {
	return await makeRestApiRequest(context, "GET", `${SOURCES_ENDPOINT}/credentials`, { ...query });
}
/** The repositories that a credential can read, for the owner and repository selects. */
async function getSkillSourceRepositories(context, query) {
	return await makeRestApiRequest(context, "GET", `${SOURCES_ENDPOINT}/repositories`, { ...query });
}
/** Reads a link, with a credential for a private one, and lists the skills in it. Writes nothing. */
async function discoverSkillSource(context, payload) {
	return await makeRestApiRequest(context, "POST", `${SOURCES_ENDPOINT}/discover`, payload);
}
/** Connects the source in the scope and imports the picked skills as synced skills. */
async function connectSkillSource(context, payload) {
	return await makeRestApiRequest(context, "POST", SOURCES_ENDPOINT, payload);
}
/** The sources that the user can see, for their rows in the skills table. */
async function listSkillSources(context) {
	return await makeRestApiRequest(context, "GET", SOURCES_ENDPOINT);
}
/** Removes a source and optionally keeps its skills. */
async function deleteSkillSource(context, sourceId, query) {
	await makeRestApiRequest(context, "DELETE", `${SOURCES_ENDPOINT}/${sourceId}`, query && { ...query });
}
function sourceCredentialEndpoint(source) {
	return `${source.projectId ? `/projects/${source.projectId}` : ""}${SOURCES_ENDPOINT}/${source.id}`;
}
async function getSkillSourceReplacementCredentials(context, source) {
	return await makeRestApiRequest(context, "GET", `${sourceCredentialEndpoint(source)}/credentials`);
}
async function replaceSkillSourceCredential(context, source, credentialId) {
	await makeRestApiRequest(context, "POST", `${sourceCredentialEndpoint(source)}/credential`, { credentialId });
}
/** Check for updates on one source. */
async function checkSkillSource(context, sourceId) {
	return await makeRestApiRequest(context, "POST", `${SOURCES_ENDPOINT}/${sourceId}/check`);
}
/** Stops syncing one skill: it keeps its versions and becomes a normal, editable skill. */
async function stopSyncingSkill(context, skillId) {
	await makeRestApiRequest(context, "POST", `${SOURCES_ENDPOINT}/skills/${skillId}/stop-syncing`);
}
/** Local validation for a source scope change. */
async function previewSkillSourceMove(context, sourceId, payload) {
	return await makeRestApiRequest(context, "POST", `${SOURCES_ENDPOINT}/${sourceId}/move/preview`, payload);
}
async function moveSkillSource(context, sourceId, payload) {
	await makeRestApiRequest(context, "POST", `${SOURCES_ENDPOINT}/${sourceId}/move`, payload);
}
async function getSkillSourceUpdates(context, sourceId) {
	return await makeRestApiRequest(context, "GET", `${SOURCES_ENDPOINT}/${sourceId}/updates`);
}
async function getSkillSourceUpdate(context, sourceId, skillId, reviewed) {
	return await makeRestApiRequest(context, "GET", `${SOURCES_ENDPOINT}/${sourceId}/updates/${skillId}`, { ...reviewed });
}
async function getSkillSourceCommit(context, sourceId, revision) {
	return await makeRestApiRequest(context, "GET", `${SOURCES_ENDPOINT}/${sourceId}/commit`, { revision });
}
async function acceptSkillSourceUpdates(context, sourceId, payload) {
	return await makeRestApiRequest(context, "POST", `${SOURCES_ENDPOINT}/${sourceId}/updates/accept`, payload);
}
async function updateSkillSyncSettings(context, payload) {
	return await makeRestApiRequest(context, "PUT", "/skill-sync/settings", payload);
}
//#endregion
export { saveSkill as C, replaceSkillSourceCredential as S, updateSkillSyncSettings as T, getSkillSourceUpdates as _, deleteSkill as a, moveSkillSource as b, getNewSkillName as c, getSkillCreators as d, getSkillSourceCommit as f, getSkillSourceUpdate as g, getSkillSourceRepositories as h, createSkill as i, getSkill as l, getSkillSourceReplacementCredentials as m, checkSkillSource as n, deleteSkillSource as o, getSkillSourceCredentials as p, connectSkillSource as r, discoverSkillSource as s, acceptSkillSourceUpdates as t, getSkillAgents as u, getSkills as v, stopSyncingSkill as w, previewSkillSourceMove as x, listSkillSources as y };
