const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/humanizer-DGFiSwse.js","assets/useAgentSkillImport-d0K9dNXY.js","assets/app-D5flEmb-.js","assets/rolldown-runtime-EITvVbkG.js","assets/vendor-Hx42-oQF.js","assets/vendor-CB64RKTG.css","assets/app-jHnVG3bN.css","assets/coldEmail-Cc5gcCXs.js","assets/research-D7dDnqYs.js"])))=>i.map(i=>d[i]);
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Vu as useLocalStorage, Xf as unref, _p as normalizeClass, bd as I18nT, ff as openBlock, ip as init_shared_esm_bundler } from "./vendor-Hx42-oQF.js";
import { Ax as LOCAL_STORAGE_ADDED_RECOMMENDED_SKILLS, DN as __vitePreload, FS as RECOMMENDED_SKILLS_EXPERIMENT, SN as _plugin_vue_export_helper_default, _N as N8nText_default, cd as getExperimentTelemetryPayload, dC as useToast, hC as useTelemetry, hM as N8nLink_default, hm as splitName, jN as useI18n, nN as N8nBadge_default, vm as useProjectsStore, vy as usePostHog, wy as TELEMETRY_EVENT, xN as N8nIcon_default } from "./app-D5flEmb-.js";
import { t as ProjectIcon_default } from "./ProjectIcon-Dl4TMfdP.js";
//#region src/features/settings/context/skills.utils.ts
var PROJECT_SCOPE_PREFIX = "project:";
/** The scope and project of a scope picker value. */
function parseScope(value) {
	if (value.startsWith("project:")) return {
		scope: "project",
		projectId: value.slice(8)
	};
	return { scope: "instance" };
}
/** How the badge and the modal name the scope of a skill. */
function useSkillScopeDisplay() {
	const i18n = useI18n();
	const projectsStore = useProjectsStore();
	function projectLabel(projectId, projectName, projectType) {
		if (projectId === projectsStore.personalProject?.id) return i18n.baseText("settings.context.skills.scope.personalProject");
		if (projectType === "personal" && projectName) {
			const { name, email } = splitName(projectName);
			return name ?? email ?? projectName;
		}
		return projectName ?? i18n.baseText("settings.context.skills.scope.project");
	}
	function scopeDisplay(skill) {
		switch (skill.scope) {
			case "instance": return {
				icon: "globe",
				label: i18n.baseText("settings.context.skills.scope.instance")
			};
			case "project":
				if (!skill.projectId) return {
					icon: "layers",
					label: i18n.baseText("settings.context.skills.scope.project")
				};
				return {
					icon: skill.projectType === "personal" ? "user" : "layers",
					label: projectLabel(skill.projectId, skill.projectName, skill.projectType)
				};
		}
	}
	return { scopeDisplay };
}
/**
* Why a skill cannot be deleted now, or undefined when it can. The backend refuses to
* delete a skill that an agent uses, so the action is off before the user tries.
*/
function useSkillDeleteRule() {
	const i18n = useI18n();
	function deleteBlockedReason(skill) {
		if (!skill.canDelete) return i18n.baseText("settings.context.skills.readOnly");
		if (skill.usedByAgents === 0) return void 0;
		return i18n.baseText("settings.context.skills.delete.inUse", {
			interpolate: { count: skill.usedByAgents },
			adjustToNumber: skill.usedByAgents
		});
	}
	return { deleteBlockedReason };
}
/** The text for each reason code. A code that the editor does not know gets the generic text. */
var SKILL_SOURCE_REASON_KEYS = {
	invalid_url: "settings.context.skills.connect.error.invalidUrl",
	unsupported_provider: "settings.context.skills.connect.error.unsupportedProvider",
	not_found: "settings.context.skills.connect.error.notFound",
	rate_limited: "settings.context.skills.connect.error.rateLimited",
	unreachable: "settings.context.skills.connect.error.unreachable",
	no_skills_found: "settings.context.skills.connect.error.noSkillsFound",
	too_many_skills: "settings.context.skills.connect.error.tooManySkills",
	too_deep: "settings.context.skills.connect.error.tooDeep",
	archive_too_large: "settings.context.skills.connect.error.archiveTooLarge",
	parse_error: "settings.context.skills.connect.error.parseError",
	blocked_by_check: "settings.context.skills.connect.error.blockedByCheck",
	review_required: "settings.context.skills.connect.error.reviewRequired",
	name_taken: "settings.context.skills.connect.error.nameTaken",
	stale: "settings.context.skills.updates.stale",
	name_clash: "settings.context.skills.updates.nameClash",
	duplicate_source: "settings.context.skills.connect.error.duplicateSource",
	credential_invalid: "settings.context.skills.connect.error.credentialInvalid",
	credential_missing: "settings.context.skills.connect.error.credentialMissing",
	credential_out_of_scope: "settings.context.skills.connect.error.credentialOutOfScope",
	host_blocked: "settings.context.skills.connect.error.hostBlocked"
};
/** The short form in the import toast, as in "Could not add seo-check (reason)". */
var FAILED_SKILL_REASON_KEYS = {
	name_taken: "settings.context.skills.connect.failed.reason.nameTaken",
	not_found: "settings.context.skills.connect.failed.reason.notFound",
	parse_error: "settings.context.skills.connect.failed.reason.parseError",
	blocked_by_check: "settings.context.skills.connect.failed.reason.blockedByCheck",
	review_required: "settings.context.skills.connect.failed.reason.reviewRequired",
	rate_limited: "settings.context.skills.connect.failed.reason.rateLimited",
	unreachable: "settings.context.skills.connect.failed.reason.unreachable"
};
/** The text for each rule of the security check. The server text is English only. */
var SKILL_SCAN_RULE_KEYS = {
	invalid_skill: "settings.context.skills.connect.check.rule.invalidSkill",
	over_limit: "settings.context.skills.connect.check.rule.overLimit",
	file_skipped: "settings.context.skills.connect.check.rule.fileSkipped",
	file_unstorable: "settings.context.skills.connect.check.rule.fileUnstorable",
	hidden_unicode: "settings.context.skills.connect.check.rule.hiddenUnicode",
	new_url: "settings.context.skills.connect.check.rule.newUrl",
	permission_change: "settings.context.skills.connect.check.rule.permissionChange",
	lossy_conversion: "settings.context.skills.connect.check.rule.lossyConversion"
};
/** A link to a branch, a folder on a branch, or a file on a branch. */
var GITHUB_BRANCH_LINK = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/(tree|blob)\/[^/?#]+/i;
function isKnownReason(reason) {
	return typeof reason === "string" && reason in SKILL_SOURCE_REASON_KEYS;
}
/** Translated text for the reason codes of Skill Sync, for the link, the picker and the toast. */
function useSkillSourceReasons() {
	const i18n = useI18n();
	/**
	* A full sentence for why n8n cannot read a link or one skill in it. `link` is the link the
	* user pasted: a well-formed branch link with `invalid_url` means the branch is missing.
	* `withCredential` says that the read used a credential.
	*/
	function reasonText(reason, link, { withCredential = false } = {}) {
		if (!isKnownReason(reason)) return i18n.baseText("settings.context.skills.connect.error.discover");
		if (reason === "not_found" && withCredential) return i18n.baseText("settings.context.skills.connect.error.notFoundWithCredential");
		if (reason === "invalid_url" && link && GITHUB_BRANCH_LINK.test(link)) return i18n.baseText("settings.context.skills.connect.error.branchNotFound");
		if (reason === "too_many_skills") return i18n.baseText("settings.context.skills.connect.error.tooManySkills", { interpolate: { count: 200 } });
		return i18n.baseText(SKILL_SOURCE_REASON_KEYS[reason]);
	}
	/** The short reason for a picked skill that did not come in. */
	function failedSkillReason(reason) {
		return i18n.baseText(FAILED_SKILL_REASON_KEYS[reason] ?? "settings.context.skills.connect.failed.reason.other");
	}
	/**
	* The findings that need review or block the skill, each rule and file one time. `info`
	* findings change nothing, and the picker lists skipped files on their own line.
	*/
	function findingsText(findings) {
		const texts = findings.filter((finding) => finding.severity !== "info").map(({ rule, file }) => {
			const finding = i18n.baseText(SKILL_SCAN_RULE_KEYS[rule]);
			return file ? i18n.baseText("settings.context.skills.connect.check.findingInFile", { interpolate: {
				finding,
				file
			} }) : finding;
		});
		return [...new Set(texts)].join(". ");
	}
	/**
	* The domains that a skill links to. At import a link needs no review, but the user still
	* sees where the skill can send an agent.
	*/
	function linkedDomainsText(findings) {
		const domains = new Set(findings.flatMap((finding) => finding.rule === "new_url" && finding.domain ? [finding.domain] : []));
		if (domains.size === 0) return "";
		return i18n.baseText("settings.context.skills.connect.check.linksTo", { interpolate: { domains: [...domains].join(", ") } });
	}
	/** The translated name of one rule of the security check. */
	function ruleText(rule) {
		return i18n.baseText(SKILL_SCAN_RULE_KEYS[rule]);
	}
	return {
		reasonText,
		failedSkillReason,
		findingsText,
		linkedDomainsText,
		ruleText
	};
}
//#endregion
//#region src/features/settings/context/components/SkillScopeBadge.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var SkillScopeBadge_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SkillScopeBadge",
	props: {
		skill: {},
		projectIcon: {},
		label: {}
	},
	setup(__props) {
		const props = __props;
		const { scopeDisplay } = useSkillScopeDisplay();
		const projectsStore = useProjectsStore();
		const project = computed(() => {
			if (props.skill.projectId === projectsStore.personalProject?.id) return projectsStore.personalProject;
			if (props.skill.projectId === projectsStore.currentProject?.id) return projectsStore.currentProject;
			return projectsStore.myProjects.find((project) => project.id === props.skill.projectId) ?? projectsStore.projects.find((project) => project.id === props.skill.projectId);
		});
		const display = computed(() => scopeDisplay({
			...props.skill,
			projectType: props.skill.projectType ?? (project.value?.type === "personal" || project.value?.type === "team" ? project.value.type : null)
		}));
		const projectIcon = computed(() => props.projectIcon ?? props.skill.projectIcon ?? project.value?.icon);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nBadge_default), {
				variant: "outline",
				class: normalizeClass(_ctx.$style.badge),
				"data-test-id": "skill-scope-badge"
			}, {
				leading: withCtx(() => [props.skill.scope === "project" && projectIcon.value ? (openBlock(), createBlock(ProjectIcon_default, {
					key: 0,
					class: normalizeClass(_ctx.$style.icon),
					icon: projectIcon.value,
					size: "mini",
					"border-less": ""
				}, null, 8, ["class", "icon"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 1,
					class: normalizeClass(_ctx.$style.icon),
					icon: display.value.icon,
					size: "small"
				}, null, 8, ["class", "icon"]))]),
				default: withCtx(() => [createTextVNode(" " + toDisplayString(__props.label ?? display.value.label), 1)]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	badge: "_badge_rs0ww_1",
	icon: "_icon_rs0ww_9"
} }]]);
//#endregion
//#region src/features/settings/context/skillSourceReview.utils.ts
/** The parent of a skill folder. A skill at the root, or in a top-level folder, is under `/`. */
function parentOf(location) {
	const segments = location.split("/").filter(Boolean);
	return segments.length > 1 ? segments.slice(0, -1).join("/") : "/";
}
/**
* The skills of a source by the folder that holds their skill folders, in the order of the
* source. The review shows one group for each folder, with a checkbox for the group.
*/
function groupByFolder(skills) {
	const groups = /* @__PURE__ */ new Map();
	for (const skill of skills) {
		const folder = parentOf(skill.location);
		const group = groups.get(folder) ?? {
			folder,
			skills: []
		};
		group.skills.push(skill);
		groups.set(folder, group);
	}
	return [...groups.values()];
}
/** A skill that the user can tick: n8n can read it, its name is free, and the check did not block it. */
function isSelectableSkill(skill) {
	return !skill.nameTaken && !skill.error && skill.check?.verdict !== "blocked";
}
/** The repository and branch of a source, such as `acme/skills · main`. */
function sourceLineOf(source) {
	return [source.label, source.ref].filter(Boolean).join(" · ");
}
//#endregion
//#region src/experiments/recommendedSkills/recommendedSkills.ts
var RECOMMENDED_SKILLS = [
	{
		id: "humanizer",
		name: "humanizer",
		icon: "pen",
		cardTextKey: "experiments.recommendedSkills.humanizer.cardText",
		source: {
			label: "blader/humanizer",
			url: "https://github.com/blader/humanizer"
		},
		load: async () => (await __vitePreload(async () => {
			const { humanizerSkill } = await import("./humanizer-DGFiSwse.js");
			return { humanizerSkill };
		}, __vite__mapDeps([0,1,2,3,4,5,6]))).humanizerSkill
	},
	{
		id: "cold-email",
		name: "cold-email",
		icon: "mail",
		cardTextKey: "experiments.recommendedSkills.coldEmail.cardText",
		source: {
			label: "coreyhaines31/marketingskills",
			url: "https://github.com/coreyhaines31/marketingskills/tree/main/skills/cold-email"
		},
		load: async () => (await __vitePreload(async () => {
			const { coldEmailSkill } = await import("./coldEmail-Cc5gcCXs.js");
			return { coldEmailSkill };
		}, __vite__mapDeps([7,1,2,3,4,5,6]))).coldEmailSkill
	},
	{
		id: "research",
		name: "research",
		icon: "search",
		cardTextKey: "experiments.recommendedSkills.research.cardText",
		source: {
			label: "mattpocock/skills",
			url: "https://github.com/mattpocock/skills/tree/main/skills/engineering/research"
		},
		load: async () => (await __vitePreload(async () => {
			const { researchSkill } = await import("./research-D7dDnqYs.js");
			return { researchSkill };
		}, __vite__mapDeps([8,1,2,3,4,5,6]))).researchSkill
	}
];
//#endregion
//#region src/experiments/recommendedSkills/useRecommendedSkillsExperiment.ts
init_runtime_core_esm_bundler();
function useRecommendedSkillsExperiment() {
	const posthogStore = usePostHog();
	const telemetry = useTelemetry();
	const addedSkillIds = useLocalStorage(LOCAL_STORAGE_ADDED_RECOMMENDED_SKILLS, [], { flush: "sync" });
	const showRecommendedSkills = computed(() => posthogStore.isVariantEnabled(RECOMMENDED_SKILLS_EXPERIMENT.name, RECOMMENDED_SKILLS_EXPERIMENT.variant));
	const hasVariant = computed(() => Boolean(posthogStore.getVariant(RECOMMENDED_SKILLS_EXPERIMENT.name)));
	function trackExposure() {
		posthogStore.trackExposure(RECOMMENDED_SKILLS_EXPERIMENT.name);
	}
	function trackCardsShown(entryPoint) {
		telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_VIEWED_RECOMMENDED_SKILLS, getExperimentTelemetryPayload(RECOMMENDED_SKILLS_EXPERIMENT, RECOMMENDED_SKILLS_EXPERIMENT.variant, { entry_point: entryPoint }));
	}
	function trackSkillAdded(recommendedSkillId, skillId, entryPoint) {
		if (!addedSkillIds.value.includes(recommendedSkillId)) addedSkillIds.value = [...addedSkillIds.value, recommendedSkillId];
		telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_ADDED_RECOMMENDED_SKILL, getExperimentTelemetryPayload(RECOMMENDED_SKILLS_EXPERIMENT, RECOMMENDED_SKILLS_EXPERIMENT.variant, {
			recommended_skill_id: recommendedSkillId,
			...skillId ? { skill_id: skillId } : {},
			entry_point: entryPoint
		}));
	}
	return {
		showRecommendedSkills,
		hasVariant,
		addedSkillIds,
		trackExposure,
		trackCardsShown,
		trackSkillAdded
	};
}
//#endregion
//#region src/experiments/recommendedSkills/useRecommendedSkillLoader.ts
init_reactivity_esm_bundler();
function useRecommendedSkillLoader() {
	const i18n = useI18n();
	const { showError } = useToast();
	const loadingId = ref();
	async function loadRecommendedSkill(recommended) {
		if (loadingId.value) return void 0;
		loadingId.value = recommended.id;
		try {
			return await recommended.load();
		} catch (error) {
			showError(error, i18n.baseText("experiments.recommendedSkills.loadError"));
			return;
		} finally {
			loadingId.value = void 0;
		}
	}
	return {
		loadingId,
		loadRecommendedSkill
	};
}
//#endregion
//#region src/experiments/recommendedSkills/components/RecommendedSkillSource.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var RecommendedSkillSource_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RecommendedSkillSource",
	props: { skill: {} },
	setup(__props) {
		return (_ctx, _cache) => {
			return __props.skill ? (openBlock(), createBlock(unref(N8nText_default), {
				key: 0,
				tag: "p",
				size: "small",
				color: "text-light",
				class: normalizeClass(_ctx.$style.source),
				"data-test-id": "recommended-skill-source"
			}, {
				default: withCtx(() => [createVNode(unref(I18nT), {
					keypath: "experiments.recommendedSkills.basedOn",
					scope: "global",
					tag: "span"
				}, {
					source: withCtx(() => [createVNode(unref(N8nLink_default), {
						to: __props.skill.source.url,
						"new-window": "",
						rel: "noopener noreferrer",
						theme: "text",
						size: "small",
						"data-test-id": "recommended-skill-source-link",
						"data-attr": `recommended-skill-source-${__props.skill.id}`
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.skill.source.label), 1)]),
						_: 1
					}, 8, ["to", "data-attr"])]),
					_: 1
				})]),
				_: 1
			}, 8, ["class"])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": { source: "_source_1cpfk_1" } }]]);
//#endregion
export { groupByFolder as a, SkillScopeBadge_default as c, useSkillDeleteRule as d, useSkillScopeDisplay as f, RECOMMENDED_SKILLS as i, PROJECT_SCOPE_PREFIX as l, useRecommendedSkillLoader as n, isSelectableSkill as o, useSkillSourceReasons as p, useRecommendedSkillsExperiment as r, sourceLineOf as s, RecommendedSkillSource_default as t, parseScope as u };
