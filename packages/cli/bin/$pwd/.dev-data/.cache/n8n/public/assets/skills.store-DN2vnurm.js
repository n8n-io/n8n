import { Nf as init_reactivity_esm_bundler, Vf as ref, lo as defineStore } from "./vendor-Hx42-oQF.js";
import { bC as useRootStore, yC as useSettingsStore } from "./app-D5flEmb-.js";
import { t as useLatestFetch } from "./useLatestFetch-Bxfz-zbp.js";
import { C as saveSkill, S as replaceSkillSourceCredential, T as updateSkillSyncSettings, _ as getSkillSourceUpdates, a as deleteSkill, b as moveSkillSource, c as getNewSkillName, d as getSkillCreators, f as getSkillSourceCommit, g as getSkillSourceUpdate, h as getSkillSourceRepositories, i as createSkill, l as getSkill, m as getSkillSourceReplacementCredentials, n as checkSkillSource, o as deleteSkillSource, p as getSkillSourceCredentials, r as connectSkillSource, s as discoverSkillSource, t as acceptSkillSourceUpdates, u as getSkillAgents, v as getSkills, w as stopSyncingSkill, x as previewSkillSourceMove, y as listSkillSources } from "./skills.api-DItBsz5w.js";
//#region src/features/settings/context/skills.store.ts
init_reactivity_esm_bundler();
/** The skills list in Settings > Context > Skills. */
var useSkillsStore = defineStore("contextSkills", () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const skills = ref([]);
	const count = ref(0);
	const pageCount = ref();
	const page = ref();
	/** The folded sources of the current page, with grouped lists. */
	const collapsedSources = ref([]);
	const sourceRanges = ref([]);
	const loading = ref(false);
	/** Current names for skill artifact tabs, including renames made in the editor. */
	const skillNames = ref(/* @__PURE__ */ new Map());
	let latestRead = 0;
	async function fetchSkills(query = {}) {
		const read = ++latestRead;
		loading.value = true;
		try {
			const response = await getSkills(rootStore.restApiContext, query);
			if (read === latestRead) {
				skills.value = response.data;
				count.value = response.count;
				pageCount.value = response.pageCount;
				page.value = response.page;
				collapsedSources.value = response.collapsedSources ?? [];
				sourceRanges.value = response.sourceRanges ?? [];
			}
			return response;
		} finally {
			if (read === latestRead) loading.value = false;
		}
	}
	/** The overview card needs the total only, so it asks for a single row. */
	async function fetchSkillCount() {
		await fetchSkills({ take: 1 });
	}
	/** For the creator filter of the skills list. */
	async function fetchCreators() {
		return await getSkillCreators(rootStore.restApiContext);
	}
	/** For the agent filter of the skills list. */
	async function fetchAgents(query = {}) {
		return await getSkillAgents(rootStore.restApiContext, query);
	}
	/** A default name that no skill in the scope has yet. */
	async function fetchNewSkillName(query) {
		return await getNewSkillName(rootStore.restApiContext, query);
	}
	const latestNameRequest = /* @__PURE__ */ new Map();
	let nameRequests = 0;
	function startNameRequest(id) {
		const request = ++nameRequests;
		latestNameRequest.set(id, request);
		return request;
	}
	function setSkillName(id, request, name) {
		if (latestNameRequest.get(id) === request) skillNames.value.set(id, name);
	}
	function updateSkillName(id, name) {
		setSkillName(id, startNameRequest(id), name);
	}
	async function fetchSkill(id) {
		const request = startNameRequest(id);
		const detail = await getSkill(rootStore.restApiContext, id);
		setSkillName(id, request, detail.name);
		return detail;
	}
	async function createSkill$1(payload) {
		return await createSkill(rootStore.restApiContext, payload);
	}
	async function saveSkill$1(id, payload) {
		const request = startNameRequest(id);
		const saved = await saveSkill(rootStore.restApiContext, id, payload);
		setSkillName(id, request, saved.skill.name);
		return saved;
	}
	async function deleteSkill$1(id) {
		await deleteSkill(rootStore.restApiContext, id);
	}
	/** The credentials that can read a private source in the scope. */
	async function fetchSourceCredentials(query) {
		return await getSkillSourceCredentials(rootStore.restApiContext, query);
	}
	/** The repositories that a credential can read, to pick one in place of a link. */
	async function fetchSourceRepositories(query) {
		return await getSkillSourceRepositories(rootStore.restApiContext, query);
	}
	/** Lists the skills that a GitHub link holds, for the "Choose skills" picker. */
	async function discoverSource(payload) {
		return await discoverSkillSource(rootStore.restApiContext, payload);
	}
	/** Connects a GitHub link and imports the picked skills. The caller reloads the list. */
	async function connectSource(payload) {
		return await connectSkillSource(rootStore.restApiContext, payload);
	}
	/** Stops syncing one skill, which makes it editable. The caller reloads the list. */
	async function stopSyncingSkill$1(id) {
		await stopSyncingSkill(rootStore.restApiContext, id);
	}
	const sources = ref([]);
	const { next: nextSourcesRead } = useLatestFetch();
	/** The sources that the user can see. A newer read wins, as for skills. */
	async function fetchSources() {
		const isLatest = nextSourcesRead();
		const response = await listSkillSources(rootStore.restApiContext);
		if (!isLatest()) return void 0;
		sources.value = response;
		return response;
	}
	/** Removes a source and optionally keeps its skills. The caller reloads the lists. */
	async function deleteSource(sourceId, query) {
		await deleteSkillSource(rootStore.restApiContext, sourceId, query);
	}
	async function fetchReplacementCredentials(source) {
		return await getSkillSourceReplacementCredentials(rootStore.restApiContext, source);
	}
	async function replaceSourceCredential(source, credentialId) {
		await replaceSkillSourceCredential(rootStore.restApiContext, source, credentialId);
	}
	/** Check for updates on one source. The caller reloads the lists. */
	async function checkSource(sourceId) {
		return await checkSkillSource(rootStore.restApiContext, sourceId);
	}
	async function previewSourceMove(sourceId, payload) {
		return await previewSkillSourceMove(rootStore.restApiContext, sourceId, payload);
	}
	async function moveSource(sourceId, payload) {
		await moveSkillSource(rootStore.restApiContext, sourceId, payload);
	}
	async function fetchSourceUpdates(sourceId) {
		return await getSkillSourceUpdates(rootStore.restApiContext, sourceId);
	}
	async function fetchSourceUpdate(sourceId, skillId, reviewed) {
		return await getSkillSourceUpdate(rootStore.restApiContext, sourceId, skillId, reviewed);
	}
	async function fetchSourceCommit(sourceId, revision) {
		return await getSkillSourceCommit(rootStore.restApiContext, sourceId, revision);
	}
	async function acceptSourceUpdates(sourceId, payload) {
		return await acceptSkillSourceUpdates(rootStore.restApiContext, sourceId, payload);
	}
	async function setSkillSyncEnabled(enabled) {
		const saved = await updateSkillSyncSettings(rootStore.restApiContext, { enabled });
		if (settingsStore.moduleSettings.skills) settingsStore.moduleSettings.skills.skillSyncEnabled = saved.enabled;
	}
	return {
		setSkillSyncEnabled,
		previewSourceMove,
		moveSource,
		skills,
		count,
		pageCount,
		page,
		loading,
		skillNames,
		updateSkillName,
		fetchSkills,
		fetchSkillCount,
		fetchCreators,
		fetchAgents,
		fetchSkill,
		fetchNewSkillName,
		createSkill: createSkill$1,
		saveSkill: saveSkill$1,
		deleteSkill: deleteSkill$1,
		fetchSourceCredentials,
		fetchSourceRepositories,
		discoverSource,
		connectSource,
		stopSyncingSkill: stopSyncingSkill$1,
		sources,
		collapsedSources,
		sourceRanges,
		fetchSources,
		checkSource,
		fetchSourceUpdates,
		fetchSourceUpdate,
		fetchSourceCommit,
		acceptSourceUpdates,
		deleteSource,
		fetchReplacementCredentials,
		replaceSourceCredential
	};
});
//#endregion
export { useSkillsStore as t };
