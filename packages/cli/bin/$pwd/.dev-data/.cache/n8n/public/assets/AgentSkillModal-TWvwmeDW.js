import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Aa as require_isEqual, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Jf as toValue, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Od as useCssModule, Of as withDirectives, Pd as Fragment, Rd as computed, Si as require_cloneDeep, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Wf as shallowRef, Xf as unref, Xo as useRouter, _p as normalizeClass, bd as I18nT, ff as openBlock, hf as renderSlot, if as nextTick, ip as init_shared_esm_bundler, jd as vShow, ju as useDropZone, lf as onMounted, mf as renderList, nf as mergeModels, vf as resolveDynamicComponent, xf as useModel, zd as createBaseVNode, zf as reactive } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, GT as skillNameKey, Jg as useUIStore, LM as N8nCallout_default, Mn as convertToDisplayDate, Mo as getSkillDetail, No as getSkillVersion, OA as MarkdownEditor_default, PA as useMessage, Qj as N8nMarkdown_default, Rc as useAgentTelemetry, SN as _plugin_vue_export_helper_default, Wo as listAttachableSkills, XM as N8nActionDropdown_default, _D as AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH, _N as N8nText_default, bC as useRootStore, dC as useToast, dM as N8nSwitch_default, fC as VIEWS, fN as N8nTooltip_default, gD as AGENT_SKILL_DESCRIPTION_MAX_LENGTH, gM as N8nInputLabel_default, jN as useI18n, mM as N8nOption_default, pM as N8nSelect_default, qo as listSkillVersions, uM as N8nFormInput_default, vN as N8nIconButton_default, vm as useProjectsStore, ws as preferenceUserName, xN as N8nIcon_default, yD as AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { r as normalizeAgentSkillForSave, t as agentsLosingSkill } from "./agentSkill-Czni3bZ7.js";
import { r as useAgentSkillImport, t as AgentSkillImportError } from "./useAgentSkillImport-d0K9dNXY.js";
import { c as SkillScopeBadge_default, i as RECOMMENDED_SKILLS, n as useRecommendedSkillLoader, r as useRecommendedSkillsExperiment, s as sourceLineOf, t as RecommendedSkillSource_default, u as parseScope } from "./RecommendedSkillSource-Br4SYoOJ.js";
import { t as ToolsConnectionModal_default } from "./ToolsConnectionModal-Cq-bWNJX.js";
import { t as AgentModalMultiStep_default } from "./AgentModalMultiStep-83xh6J77.js";
//#region ../../@n8n/utils/src/diff-text.ts
var import_isEqual = /* @__PURE__ */ __toESM(require_isEqual(), 1);
var import_cloneDeep = /* @__PURE__ */ __toESM(require_cloneDeep(), 1);
/**
* The largest table the diff fills (about 16 MB). Two long texts with nothing in common
* would need far more, so above it the changed part shows as removed and then added.
*/
var MAX_TABLE_CELLS = 4e6;
function toLines(text) {
	return text === "" ? [] : text.split("\n");
}
/**
* The longest common subsequence of two lists, as pairs of indexes. The common head and
* tail are matched first, so a small edit in a long text stays cheap.
*/
function commonPairs(a, b) {
	let start = 0;
	while (start < a.length && start < b.length && a[start] === b[start]) start++;
	let endA = a.length;
	let endB = b.length;
	while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
		endA--;
		endB--;
	}
	const rows = endA - start;
	const cols = endB - start;
	const pairs = [];
	for (let i = 0; i < start; i++) pairs.push([i, i]);
	const tail = () => {
		for (let k = 0; endA + k < a.length; k++) pairs.push([endA + k, endB + k]);
		return pairs;
	};
	const stride = cols + 1;
	const cells = (rows + 1) * stride;
	if (rows === 0 || cols === 0 || cells > MAX_TABLE_CELLS) return tail();
	const table = new Uint32Array(cells);
	for (let i = rows - 1; i >= 0; i--) for (let j = cols - 1; j >= 0; j--) table[i * stride + j] = a[start + i] === b[start + j] ? table[(i + 1) * stride + j + 1] + 1 : Math.max(table[(i + 1) * stride + j], table[i * stride + j + 1]);
	let i = 0;
	let j = 0;
	while (i < rows && j < cols) if (a[start + i] === b[start + j]) {
		pairs.push([start + i, start + j]);
		i++;
		j++;
	} else if (table[(i + 1) * stride + j] >= table[i * stride + j + 1]) i++;
	else j++;
	return tail();
}
/** Marks the words of `from` and `to` that the other side does not have. */
function diffWords(from, to) {
	const a = from.split(/(\s+)/).filter(Boolean);
	const b = to.split(/(\s+)/).filter(Boolean);
	const pairs = commonPairs(a, b);
	const keptA = new Set(pairs.map(([i]) => i));
	const keptB = new Set(pairs.map(([, j]) => j));
	const segments = (tokens, kept) => tokens.map((text, index) => ({
		text,
		changed: !kept.has(index) && text.trim() !== ""
	}));
	return {
		from: segments(a, keptA),
		to: segments(b, keptB)
	};
}
function diffText(from, to) {
	const a = toLines(from);
	const b = toLines(to);
	const lines = [];
	const count = {
		added: 0,
		removed: 0
	};
	let i = 0;
	let j = 0;
	const flush = (untilA, untilB) => {
		const removed = a.slice(i, untilA);
		const added = b.slice(j, untilB);
		count.removed += removed.length;
		count.added += added.length;
		const words = removed.map((line, index) => index < added.length ? diffWords(line, added[index]) : void 0);
		removed.forEach((text, index) => lines.push({
			type: "removed",
			text,
			segments: words[index]?.from ?? [{
				text,
				changed: true
			}]
		}));
		added.forEach((text, index) => lines.push({
			type: "added",
			text,
			segments: words[index]?.to ?? [{
				text,
				changed: true
			}]
		}));
	};
	for (const [pairA, pairB] of commonPairs(a, b)) {
		flush(pairA, pairB);
		lines.push({
			type: "equal",
			text: a[pairA]
		});
		i = pairA + 1;
		j = pairB + 1;
	}
	flush(a.length, b.length);
	return {
		lines,
		...count
	};
}
//#endregion
//#region src/features/agents/components/skillVersions/skillVersionDiff.ts
/** The SKILL.md file, as the editor names it in the file list. */
var SKILL_FILE$3 = "SKILL.md";
function section$1(key, from, to) {
	return {
		key,
		...diffText(from, to)
	};
}
/** The fields of SKILL.md and every reference file that either version has. */
function diffSkills(from, to) {
	const fromFiles = new Map((from.references ?? []).map((file) => [file.path, file.content]));
	const toFiles = new Map((to.references ?? []).map((file) => [file.path, file.content]));
	const paths = [.../* @__PURE__ */ new Set([...fromFiles.keys(), ...toFiles.keys()])].sort();
	return [
		section$1("name", from.name, to.name),
		section$1("description", from.description, to.description),
		section$1("instructions", from.instructions, to.instructions),
		...paths.map((path) => ({
			...section$1(path, fromFiles.get(path) ?? "", toFiles.get(path) ?? ""),
			...fileStatus(fromFiles.has(path), toFiles.has(path))
		}))
	];
}
function fileStatus(inFrom, inTo) {
	if (!inFrom) return { status: "added" };
	if (!inTo) return { status: "removed" };
	return {};
}
/** Lines added and removed in each file, keyed by path, for the file list. */
function countsByFile(sections) {
	const counts = { [SKILL_FILE$3]: {
		added: 0,
		removed: 0
	} };
	for (const { key, added, removed, status } of sections) {
		const path = key === "name" || key === "description" || key === "instructions" ? SKILL_FILE$3 : key;
		const count = counts[path] ?? {
			added: 0,
			removed: 0
		};
		counts[path] = {
			added: count.added + added,
			removed: count.removed + removed,
			...status ? { status } : {}
		};
	}
	return counts;
}
//#endregion
//#region src/features/agents/composables/useSkillVersions.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* The saved versions of one skill, and the version the user opened. `baseVersion` is the version
* the editor shows: a pinned agent's version in the builder, else the latest.
*/
function useSkillVersions(skillId, baseVersion) {
	const rootStore = useRootStore();
	const i18n = useI18n();
	const { showError } = useToast();
	/** Newest first. Null until the Versions panel opens. */
	const versions = ref(null);
	/** An older version the user opened. Null shows the latest. */
	const viewedVersion = ref(null);
	const fetched = /* @__PURE__ */ new Map();
	function reportLoadError(error) {
		showError(error, i18n.baseText("agents.builder.skills.versions.loadError"));
	}
	/** The skill that `versions` belongs to, so another skill loads its own list. */
	let versionsOf;
	async function loadVersions() {
		const id = toValue(skillId);
		if (!id || versions.value && versionsOf === id) return;
		try {
			const list = await listSkillVersions(rootStore.restApiContext, id);
			if (toValue(skillId) !== id) return;
			versions.value = list;
			versionsOf = id;
		} catch (error) {
			reportLoadError(error);
		}
	}
	/** Loads the list again, for example after a save added a version. */
	async function reloadVersions() {
		versionsOf = void 0;
		await loadVersions();
	}
	async function fetchVersion(version) {
		const id = toValue(skillId);
		if (!id) return void 0;
		const key = `${id}:${version}`;
		const cached = fetched.get(key);
		if (cached) return cached;
		try {
			const detail = await getSkillVersion(rootStore.restApiContext, id, version);
			fetched.set(key, detail);
			return detail;
		} catch (error) {
			reportLoadError(error);
			return;
		}
	}
	/** The version the user asked for last, so a slower earlier answer cannot replace it. */
	let requestedVersion = null;
	/** Shows another version. The base version shows the editor again. */
	async function openVersion(version) {
		requestedVersion = version;
		if (version === (toValue(baseVersion) ?? versions.value?.[0]?.version)) {
			viewedVersion.value = null;
			return;
		}
		const detail = await fetchVersion(version);
		if (detail && requestedVersion === version) viewedVersion.value = detail;
	}
	/** Compare mode: the two versions and their skills, older first. Null outside compare mode. */
	const comparison = shallowRef(null);
	const diffSections = computed(() => comparison.value ? diffSkills(comparison.value.fromSkill, comparison.value.toSkill) : []);
	const diffCounts = computed(() => countsByFile(diffSections.value));
	/** The compared skill with every file either version has, for the file list. */
	const comparedSkill = computed(() => {
		if (!comparison.value) return null;
		const { fromSkill, toSkill } = comparison.value;
		const paths = new Set((toSkill.references ?? []).map((file) => file.path));
		return {
			...toSkill,
			references: [...toSkill.references ?? [], ...(fromSkill.references ?? []).filter((file) => !paths.has(file.path))]
		};
	});
	/** Compares two versions, in either order. */
	let compareRequest = 0;
	async function compareVersions(a, b) {
		const [from, to] = a < b ? [a, b] : [b, a];
		const request = ++compareRequest;
		const [fromDetail, toDetail] = await Promise.all([fetchVersion(from), fetchVersion(to)]);
		if (!fromDetail || !toDetail || request !== compareRequest) return;
		comparison.value = {
			from,
			to,
			fromSkill: fromDetail.skill,
			toSkill: toDetail.skill
		};
	}
	return {
		versions,
		viewedVersion,
		loadVersions,
		reloadVersions,
		fetchVersion,
		openVersion,
		comparison,
		diffSections,
		diffCounts,
		comparedSkill,
		compareVersions
	};
}
//#endregion
//#region src/features/agents/components/skillVersions/SkillDiffCount.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var SkillDiffCount_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SkillDiffCount",
	props: {
		count: {},
		hideZero: { type: Boolean }
	},
	setup(__props) {
		return (_ctx, _cache) => {
			return __props.count && (__props.count.added > 0 || __props.count.removed > 0) ? (openBlock(), createElementBlock("span", {
				key: 0,
				class: normalizeClass(_ctx.$style.counts),
				"data-testid": "skill-diff-count"
			}, [!__props.hideZero || __props.count.removed > 0 ? (openBlock(), createElementBlock("span", {
				key: 0,
				class: normalizeClass(_ctx.$style.removed)
			}, "−" + toDisplayString(__props.count.removed), 3)) : createCommentVNode("", true), !__props.hideZero || __props.count.added > 0 ? (openBlock(), createElementBlock("span", {
				key: 1,
				class: normalizeClass(_ctx.$style.added)
			}, "+" + toDisplayString(__props.count.added), 3)) : createCommentVNode("", true)], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	counts: "_counts_pkrbl_1",
	removed: "_removed_pkrbl_8",
	added: "_added_pkrbl_12"
} }]]);
//#endregion
//#region src/features/agents/components/AgentSkillFileNav.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$5 = ["aria-label"];
var _hoisted_2$2 = ["aria-current"];
var _hoisted_3$1 = [
	"aria-current",
	"aria-label",
	"data-testid",
	"onClick"
];
var SKILL_FILE$2 = "SKILL.md";
var AgentSkillFileNav_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentSkillFileNav",
	props: {
		skill: {},
		selectedPath: {},
		addReferenceDisabled: {
			type: Boolean,
			default: false
		},
		readOnly: {
			type: Boolean,
			default: false
		},
		invalidPaths: { default: () => [] },
		changeCounts: {}
	},
	emits: [
		"select",
		"add-reference",
		"remove-reference"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const references = computed(() => props.skill.references ?? []);
		function isInvalid(path) {
			return props.invalidPaths.includes(path);
		}
		/** The name a screen reader reads for a reference row. The status icon itself is hidden from it. */
		function referenceLabel(path) {
			const label = isInvalid(path) ? i18n.baseText("agents.builder.skills.references.invalidLabel", { interpolate: { path } }) : path;
			const status = props.changeCounts?.[path]?.status;
			if (!status) return label;
			return `${label}, ${i18n.baseText(status === "added" ? "agents.builder.skills.versions.fileAdded" : "agents.builder.skills.versions.fileDeleted")}`;
		}
		function isSelected(path) {
			return props.selectedPath === path;
		}
		function testIdForPath(path) {
			return `agent-skill-reference-nav-item-${path.replace(/[^A-Za-z0-9_-]+/g, "-")}`;
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("nav", {
				class: normalizeClass(_ctx.$style.nav),
				"aria-label": unref(i18n).baseText("agents.builder.skills.filesNav.label"),
				"data-testid": "agent-skill-file-nav"
			}, [createBaseVNode("button", {
				type: "button",
				class: normalizeClass([_ctx.$style.item, isSelected(SKILL_FILE$2) && _ctx.$style.selected]),
				"aria-current": isSelected(SKILL_FILE$2) ? "page" : void 0,
				"data-testid": "agent-skill-file-nav-item",
				onClick: _cache[0] || (_cache[0] = ($event) => emit("select", SKILL_FILE$2))
			}, [
				createVNode(unref(N8nIcon_default), {
					icon: "file-text",
					size: 16,
					class: normalizeClass(_ctx.$style.icon)
				}, null, 8, ["class"]),
				createVNode(unref(N8nText_default), {
					size: "medium",
					class: normalizeClass(_ctx.$style.path)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(SKILL_FILE$2))]),
					_: 1
				}, 8, ["class"]),
				createVNode(SkillDiffCount_default, {
					count: props.changeCounts?.[SKILL_FILE$2],
					class: normalizeClass(_ctx.$style.count)
				}, null, 8, ["count", "class"])
			], 10, _hoisted_2$2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.section) }, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.sectionHeader) }, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light",
					class: normalizeClass(_ctx.$style.sectionTitle)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.references.title")), 1)]),
					_: 1
				}, 8, ["class"]), !props.readOnly ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					class: normalizeClass(_ctx.$style.addReference),
					variant: "ghost",
					size: "xsmall",
					"icon-only": "",
					icon: "plus",
					disabled: props.addReferenceDisabled,
					"aria-label": unref(i18n).baseText("agents.builder.skills.references.add"),
					"data-testid": "agent-skill-add-reference",
					onClick: _cache[1] || (_cache[1] = ($event) => emit("add-reference"))
				}, null, 8, [
					"class",
					"disabled",
					"aria-label"
				])) : createCommentVNode("", true)], 2),
				references.value.length === 0 ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "small",
					color: "text-light",
					class: normalizeClass(_ctx.$style.sectionTitle)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.references.empty")), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true),
				(openBlock(true), createElementBlock(Fragment, null, renderList(references.value, (reference) => {
					return openBlock(), createElementBlock("div", {
						key: reference.path,
						class: normalizeClass([_ctx.$style.referenceRow, isSelected(reference.path) && _ctx.$style.selected])
					}, [createBaseVNode("button", {
						type: "button",
						class: normalizeClass([_ctx.$style.item, _ctx.$style.reference]),
						"aria-current": isSelected(reference.path) ? "page" : void 0,
						"aria-label": referenceLabel(reference.path),
						"data-testid": testIdForPath(reference.path),
						onClick: ($event) => emit("select", reference.path)
					}, [
						createVNode(unref(N8nIcon_default), {
							icon: isInvalid(reference.path) ? "triangle-alert" : "file-text",
							size: 16,
							class: normalizeClass([_ctx.$style.icon, isInvalid(reference.path) && _ctx.$style.invalidIcon]),
							"data-testid": isInvalid(reference.path) ? `${testIdForPath(reference.path)}-invalid` : void 0
						}, null, 8, [
							"icon",
							"class",
							"data-testid"
						]),
						createVNode(unref(N8nText_default), {
							size: "medium",
							class: normalizeClass(_ctx.$style.path)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(reference.path), 1)]),
							_: 2
						}, 1032, ["class"]),
						props.changeCounts?.[reference.path] ? (openBlock(), createElementBlock("span", {
							key: 0,
							class: normalizeClass(_ctx.$style.count)
						}, [props.changeCounts[reference.path].status ? (openBlock(), createBlock(unref(N8nIcon_default), {
							key: 0,
							icon: props.changeCounts[reference.path].status === "added" ? "file-plus" : "file-minus",
							size: "small",
							class: normalizeClass(props.changeCounts[reference.path].status === "added" ? _ctx.$style.fileAdded : _ctx.$style.fileDeleted),
							"data-testid": `${testIdForPath(reference.path)}-${props.changeCounts[reference.path].status}`
						}, null, 8, [
							"icon",
							"class",
							"data-testid"
						])) : createCommentVNode("", true), createVNode(SkillDiffCount_default, {
							count: props.changeCounts[reference.path],
							"hide-zero": !!props.changeCounts[reference.path].status
						}, null, 8, ["count", "hide-zero"])], 2)) : createCommentVNode("", true)
					], 10, _hoisted_3$1), !props.readOnly ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						class: normalizeClass(_ctx.$style.removeReference),
						variant: "ghost",
						size: "xsmall",
						"icon-only": "",
						icon: "trash-2",
						"aria-label": unref(i18n).baseText("agents.builder.skills.references.remove"),
						"data-testid": `${testIdForPath(reference.path)}-remove`,
						onClick: ($event) => emit("remove-reference", reference.path)
					}, null, 8, [
						"class",
						"aria-label",
						"data-testid",
						"onClick"
					])) : createCommentVNode("", true)], 2);
				}), 128))
			], 2)], 10, _hoisted_1$5);
		};
	}
}), [["__cssModules", { "$style": {
	nav: "_nav_9o6h4_1",
	section: "_section_9o6h4_13",
	sectionHeader: "_sectionHeader_9o6h4_19",
	item: "_item_9o6h4_26",
	icon: "_icon_9o6h4_44",
	referenceRow: "_referenceRow_9o6h4_48",
	removeReference: "_removeReference_9o6h4_56",
	reference: "_reference_9o6h4_48",
	sectionTitle: "_sectionTitle_9o6h4_74",
	addReference: "_addReference_9o6h4_78",
	invalidIcon: "_invalidIcon_9o6h4_91",
	selected: "_selected_9o6h4_97",
	path: "_path_9o6h4_103",
	count: "_count_9o6h4_119",
	fileAdded: "_fileAdded_9o6h4_126",
	fileDeleted: "_fileDeleted_9o6h4_130"
} }]]);
//#endregion
//#region src/features/agents/components/AgentSkillInlineShell.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$4 = ["aria-busy"];
var AgentSkillInlineShell_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "AgentSkillInlineShell",
	props: { busy: { type: Boolean } },
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.editor),
				"aria-busy": __props.busy,
				"data-testid": "agent-skill-inline-editor"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.body) }, [renderSlot(_ctx.$slots, "default")], 2), _ctx.$slots.footerActions ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.footer)
			}, [renderSlot(_ctx.$slots, "footerActions")], 2)) : createCommentVNode("", true)], 10, _hoisted_1$4);
		};
	}
}), [["__cssModules", { "$style": {
	editor: "_editor_1su2z_2",
	body: "_body_1su2z_10",
	footer: "_footer_1su2z_19"
} }]]);
//#endregion
//#region src/features/agents/components/AgentSkillUpload.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$3 = ["aria-busy"];
var _hoisted_2$1 = ["disabled"];
var _hoisted_3 = ["disabled"];
var _hoisted_4 = ["disabled"];
var AgentSkillUpload_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentSkillUpload",
	props: {
		"busy": {
			type: Boolean,
			default: false
		},
		"busyModifiers": {}
	},
	emits: /*@__PURE__*/ mergeModels([
		"uploaded",
		"add-manually",
		"import:skill"
	], ["update:busy"]),
	setup(__props, { emit: __emit }) {
		const busy = useModel(__props, "busy");
		const emit = __emit;
		const i18n = useI18n();
		const { importSkillFiles, importSkillEntries } = useAgentSkillImport();
		const skillFileInput = useTemplateRef("skillFileInput");
		const skillFolderInput = useTemplateRef("skillFolderInput");
		const dropZone = useTemplateRef("dropZone");
		const fileError = ref("");
		const { isOverDropZone } = useDropZone(dropZone, onDrop);
		async function importSkill(loadSkill, source) {
			if (busy.value) return;
			busy.value = true;
			fileError.value = "";
			try {
				const skill = await loadSkill();
				emit("import:skill", {
					source,
					status: "success",
					referenceCount: skill.references?.length ?? 0
				});
				emit("uploaded", skill);
			} catch (error) {
				fileError.value = error instanceof AgentSkillImportError ? i18n.baseText(error.i18nKey, { interpolate: error.interpolate }) : i18n.baseText("agents.builder.skills.import.invalidFolder");
				emit("import:skill", {
					source,
					status: "error",
					error: error instanceof AgentSkillImportError ? error.i18nKey : "unknown"
				});
			} finally {
				busy.value = false;
			}
		}
		function onFilesSelected(event, source) {
			const input = event.target;
			if (!(input instanceof HTMLInputElement)) return;
			const files = Array.from(input.files ?? []);
			if (files.length > 0) importSkill(async () => await importSkillFiles(files), source);
			input.value = "";
		}
		function onDrop(files, event) {
			const entries = Array.from(event.dataTransfer?.items ?? []).map((item) => item.webkitGetAsEntry?.()).filter((entry) => entry !== null && entry !== void 0);
			importSkill(async () => {
				if (entries.length > 0) return await importSkillEntries(entries);
				return await importSkillFiles(files ?? []);
			}, entries.some((entry) => entry.isDirectory) ? "folder" : "skill_file");
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.upload),
				"aria-busy": busy.value,
				"data-testid": "agent-skill-upload"
			}, [
				createBaseVNode("div", {
					ref_key: "dropZone",
					ref: dropZone,
					class: normalizeClass([_ctx.$style.dropZone, unref(isOverDropZone) && !busy.value && _ctx.$style.dragOver]),
					"data-testid": "agent-skill-drop-zone"
				}, [
					createVNode(unref(N8nIcon_default), {
						icon: "book-open",
						size: 32,
						color: "text-light",
						"aria-hidden": "true"
					}),
					createBaseVNode("h2", { class: normalizeClass(_ctx.$style.title) }, toDisplayString(unref(i18n).baseText("agents.builder.skills.import.title")), 3),
					createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-base",
						class: normalizeClass(_ctx.$style.description)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.import.description")), 1)]),
						_: 1
					}, 8, ["class"]),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [createVNode(unref(N8nButton_default), {
						variant: "solid",
						loading: busy.value,
						disabled: busy.value,
						"data-testid": "agent-skill-upload-folder",
						onClick: _cache[0] || (_cache[0] = ($event) => skillFolderInput.value?.click())
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.import.folder")), 1)]),
						_: 1
					}, 8, ["loading", "disabled"]), createVNode(unref(N8nButton_default), {
						variant: "outline",
						disabled: busy.value,
						"data-testid": "agent-skill-upload-skill-md",
						onClick: _cache[1] || (_cache[1] = ($event) => skillFileInput.value?.click())
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.import.skillFile")), 1)]),
						_: 1
					}, 8, ["disabled"])], 2),
					fileError.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "small",
						color: "danger",
						role: "alert"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(fileError.value), 1)]),
						_: 1
					})) : createCommentVNode("", true)
				], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.manual) }, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.import.manualPrompt")) + " ", 1), createBaseVNode("button", {
						type: "button",
						class: normalizeClass(_ctx.$style.manualButton),
						disabled: busy.value,
						"data-testid": "agent-skill-add-manually",
						onClick: _cache[2] || (_cache[2] = ($event) => emit("add-manually"))
					}, toDisplayString(unref(i18n).baseText("agents.builder.skills.import.addManually")), 11, _hoisted_2$1)]),
					_: 1
				})], 2),
				createBaseVNode("input", {
					ref_key: "skillFileInput",
					ref: skillFileInput,
					type: "file",
					accept: ".md,text/markdown",
					hidden: "",
					tabindex: "-1",
					disabled: busy.value,
					"data-testid": "agent-skill-skill-md-file-input",
					onChange: _cache[3] || (_cache[3] = ($event) => onFilesSelected($event, "skill_file"))
				}, null, 40, _hoisted_3),
				createBaseVNode("input", {
					ref_key: "skillFolderInput",
					ref: skillFolderInput,
					type: "file",
					webkitdirectory: "",
					multiple: "",
					hidden: "",
					tabindex: "-1",
					disabled: busy.value,
					"data-testid": "agent-skill-folder-file-input",
					onChange: _cache[4] || (_cache[4] = ($event) => onFilesSelected($event, "folder"))
				}, null, 40, _hoisted_4)
			], 10, _hoisted_1$3);
		};
	}
}), [["__cssModules", { "$style": {
	upload: "_upload_5o0ud_2",
	dropZone: "_dropZone_5o0ud_12",
	dragOver: "_dragOver_5o0ud_25",
	title: "_title_5o0ud_30",
	description: "_description_5o0ud_36",
	actions: "_actions_5o0ud_42",
	manual: "_manual_5o0ud_50",
	manualButton: "_manualButton_5o0ud_54"
} }]]);
//#endregion
//#region src/features/agents/components/AgentSkillViewer.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var SKILL_FILE$1 = "SKILL.md";
var AgentSkillViewer_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentSkillViewer",
	props: {
		skill: {},
		disabled: {
			type: Boolean,
			default: false
		},
		readOnly: {
			type: Boolean,
			default: false
		},
		errors: {},
		selectedPath: { default: SKILL_FILE$1 },
		showValidationWarnings: {
			type: Boolean,
			default: false
		}
	},
	emits: [
		"update:skill",
		"update:valid",
		"select:path"
	],
	setup(__props, { emit: __emit }) {
		const READ_ONLY_MARKDOWN_OPTIONS = { tasklists: {
			enabled: false,
			label: true,
			labelAfter: false
		} };
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const description = ref(props.skill.description);
		const referenceFileName = ref("");
		const formValidation = reactive({
			description: false,
			referenceName: true
		});
		const descriptionValidationRules = [{
			name: "MAX_LENGTH",
			config: { maximum: AGENT_SKILL_DESCRIPTION_MAX_LENGTH }
		}];
		const referenceNameValidationRules = [{ name: "referenceFileName" }];
		const referenceNameValidators = { referenceFileName: { validate: (value) => validateReferenceFileName(String(value ?? "")) } };
		const instructionsLength = computed(() => (props.skill.instructions ?? "").length);
		const instructionsError = computed(() => {
			if (!(props.skill.instructions ?? "").trim()) return "";
			if (instructionsLength.value > 65536) return i18n.baseText("agents.builder.skills.validation.instructionsMaxLength", { interpolate: { max: AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH.toLocaleString() } });
			return "";
		});
		const instructionsValid = computed(() => Boolean((props.skill.instructions ?? "").trim()) && !instructionsError.value);
		const referenceLength = (reference) => reference.content.length;
		const invalidReferences = computed(() => (props.skill.references ?? []).filter((reference) => !reference.content.trim() || referenceLength(reference) > 65536));
		const totalReferenceLength = computed(() => (props.skill.references ?? []).reduce((total, reference) => total + referenceLength(reference), 0));
		const referencesTotalError = computed(() => {
			if (totalReferenceLength.value <= 262144) return "";
			return i18n.baseText("agents.builder.skills.import.referencesTooLarge");
		});
		const referencesCountError = computed(() => {
			if ((props.skill.references ?? []).length <= 20) return "";
			return i18n.baseText("agents.builder.skills.references.maxCount", { interpolate: { max: 20 .toLocaleString() } });
		});
		const referencesValid = computed(() => invalidReferences.value.length === 0 && !referencesTotalError.value && !referencesCountError.value);
		const formIsValid = computed(() => formValidation.description && (!selectedReference.value || formValidation.referenceName) && instructionsValid.value && referencesValid.value);
		const instructionsCharacterCount = computed(() => i18n.baseText("agents.builder.skills.instructions.characterCount", { interpolate: {
			count: instructionsLength.value.toLocaleString(),
			max: AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH.toLocaleString()
		} }));
		const isSkillFileSelected = computed(() => props.selectedPath === SKILL_FILE$1);
		const selectedReference = computed(() => (props.skill.references ?? []).find((reference) => reference.path === props.selectedPath));
		const selectedReferenceCharacterCount = computed(() => i18n.baseText("agents.builder.skills.references.characterCount", { interpolate: {
			count: (selectedReference.value ? referenceLength(selectedReference.value) : 0).toLocaleString(),
			max: AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH.toLocaleString()
		} }));
		const selectedReferenceError = computed(() => {
			const reference = selectedReference.value;
			if (!reference) return "";
			if (!reference.content.trim()) return i18n.baseText("agents.builder.skills.references.contentRequired");
			if (referenceLength(reference) > 65536) return i18n.baseText("agents.builder.skills.references.contentMaxLength", { interpolate: { max: AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH.toLocaleString() } });
			return "";
		});
		const referencesError = computed(() => {
			if (referencesCountError.value) return referencesCountError.value;
			if (referencesTotalError.value) return referencesTotalError.value;
			if (referencesValid.value) return "";
			const [first] = invalidReferences.value;
			if (!first) return i18n.baseText("agents.builder.skills.references.invalidSummary");
			if (!first.content.trim()) return i18n.baseText("agents.builder.skills.references.emptyFile", { interpolate: { path: first.path } });
			return i18n.baseText("agents.builder.skills.references.tooLongFile", { interpolate: {
				path: first.path,
				max: AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH.toLocaleString()
			} });
		});
		function onDescriptionInput(value) {
			const next = typeof value === "string" ? value : String(value ?? "");
			description.value = next;
			emit("update:skill", { description: next });
		}
		function onDescriptionValidate(valid) {
			formValidation.description = valid;
		}
		function onReferenceNameValidate(valid) {
			formValidation.referenceName = valid;
		}
		function onInstructionsInput(value) {
			emit("update:skill", { instructions: value });
		}
		function replaceReference(updated, currentPath = updated.path) {
			emit("update:skill", { references: (props.skill.references ?? []).map((reference) => reference.path === currentPath ? updated : reference) });
		}
		function onReferenceInput(value) {
			const reference = selectedReference.value;
			if (!reference) return;
			replaceReference({
				path: reference.path,
				content: value
			});
		}
		function onReferenceNameInput(value) {
			const reference = selectedReference.value;
			if (!reference) return;
			const nextFileName = typeof value === "string" ? value : String(value ?? "");
			referenceFileName.value = nextFileName;
			if (validateReferenceFileName(nextFileName)) return;
			const path = referencePathFromFileName(nextFileName);
			replaceReference({
				path,
				content: reference.content
			}, reference.path);
			emit("select:path", path);
		}
		function validateReferenceFileName(value) {
			const fileName = normalizeReferenceFileName(value);
			if (!fileName) return { messageKey: "agents.builder.skills.references.name.required" };
			if (fileName === "." || fileName === "..") return { messageKey: "agents.builder.skills.references.name.invalid" };
			if (/[\\/]/.test(value)) return { messageKey: "agents.builder.skills.references.name.noPathSeparators" };
			if (!/^[A-Za-z0-9 _-]+$/.test(fileName)) return { messageKey: "agents.builder.skills.references.name.invalidCharacters" };
			const path = referencePathFromFileName(fileName);
			if ((props.skill.references ?? []).some((reference) => reference.path !== selectedReference.value?.path && reference.path === path)) return { messageKey: "agents.builder.skills.references.name.duplicate" };
			return false;
		}
		function fileNameFromReferencePath(path) {
			return path.replace(/^references\//, "").replace(/\.(md|markdown)$/i, "");
		}
		function referencePathFromFileName(value) {
			const fileName = normalizeReferenceFileName(value);
			if (!fileName) return "references/reference.md";
			return `references/${fileName}.md`;
		}
		function normalizeReferenceFileName(value) {
			return value.trim().replace(/\.(md|markdown)$/i, "");
		}
		watch(() => props.skill.description, (value) => {
			if (value !== description.value) description.value = value;
		});
		watch(() => selectedReference.value?.path, (path) => {
			referenceFileName.value = path ? fileNameFromReferencePath(path) : "";
			formValidation.referenceName = true;
		}, { immediate: true });
		watch(formIsValid, (valid) => emit("update:valid", valid), { immediate: true });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.panel),
				"data-testid": "agent-skill-viewer"
			}, [props.readOnly ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [isSkillFileSelected.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nInputLabel_default), {
				class: normalizeClass(_ctx.$style.readOnlyField),
				label: unref(i18n).baseText("agents.builder.skills.description.label"),
				size: "medium",
				color: "text-light"
			}, {
				default: withCtx(() => [createVNode(unref(N8nText_default), {
					tag: "p",
					color: "text-base",
					class: normalizeClass(_ctx.$style.readOnlyText),
					"data-testid": "agent-skill-description-text"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(props.skill.description), 1)]),
					_: 1
				}, 8, ["class"])]),
				_: 1
			}, 8, ["class", "label"]), createVNode(unref(N8nInputLabel_default), {
				class: normalizeClass(_ctx.$style.readOnlyField),
				label: unref(i18n).baseText("agents.builder.skills.instructions.label"),
				size: "medium",
				color: "text-light"
			}, {
				default: withCtx(() => [createVNode(unref(N8nMarkdown_default), {
					class: normalizeClass(_ctx.$style.readOnlyMarkdown),
					options: READ_ONLY_MARKDOWN_OPTIONS,
					content: props.skill.instructions,
					"data-testid": "agent-skill-instructions-text"
				}, null, 8, ["class", "content"])]),
				_: 1
			}, 8, ["class", "label"])], 64)) : selectedReference.value ? (openBlock(), createBlock(unref(N8nInputLabel_default), {
				key: 1,
				class: normalizeClass(_ctx.$style.readOnlyField),
				label: selectedReference.value.path,
				size: "medium",
				color: "text-light"
			}, {
				default: withCtx(() => [createVNode(unref(N8nMarkdown_default), {
					class: normalizeClass(_ctx.$style.readOnlyMarkdown),
					options: READ_ONLY_MARKDOWN_OPTIONS,
					content: selectedReference.value.content,
					"data-testid": "agent-skill-reference-text"
				}, null, 8, ["class", "content"])]),
				_: 1
			}, 8, ["class", "label"])) : createCommentVNode("", true)], 64)) : isSkillFileSelected.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
				referencesError.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "small",
					color: "danger",
					"data-testid": "agent-skill-references-error"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(referencesError.value), 1)]),
					_: 1
				})) : createCommentVNode("", true),
				props.errors?.references && !referencesError.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					size: "small",
					color: "danger"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(props.errors.references), 1)]),
					_: 1
				})) : createCommentVNode("", true),
				renderSlot(_ctx.$slots, "fields-start"),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [createVNode(unref(N8nFormInput_default), {
					"model-value": description.value,
					label: unref(i18n).baseText("agents.builder.skills.description.label"),
					name: "skill-description",
					required: "",
					"label-size": "small",
					placeholder: unref(i18n).baseText("agents.builder.skills.description.placeholder"),
					disabled: props.disabled,
					"show-validation-warnings": props.showValidationWarnings,
					"validation-rules": descriptionValidationRules,
					"data-testid": "agent-skill-description-input",
					"onUpdate:modelValue": onDescriptionInput,
					onValidate: onDescriptionValidate
				}, null, 8, [
					"model-value",
					"label",
					"placeholder",
					"disabled",
					"show-validation-warnings"
				])], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [createVNode(unref(N8nInputLabel_default), {
					class: normalizeClass(_ctx.$style.editorLabel),
					label: unref(i18n).baseText("agents.builder.skills.instructions.label"),
					required: true,
					size: "small"
				}, {
					default: withCtx(() => [createVNode(unref(MarkdownEditor_default), {
						class: normalizeClass(_ctx.$style.editor),
						"container-class": _ctx.$style.resizable,
						"model-value": props.skill.instructions ?? "",
						placeholder: unref(i18n).baseText("agents.builder.skills.instructions.placeholder"),
						"show-toolbar": "floating",
						disabled: props.disabled,
						"max-height": "none",
						"data-testid": "agent-skill-instructions-editor",
						"onUpdate:modelValue": onInstructionsInput
					}, null, 8, [
						"class",
						"container-class",
						"model-value",
						"placeholder",
						"disabled"
					]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.editorMeta) }, [
						instructionsError.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							size: "small",
							color: "danger"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(instructionsError.value), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						props.errors?.instructions ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 1,
							size: "small",
							color: "danger"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(props.errors.instructions), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						createVNode(unref(N8nText_default), {
							size: "xsmall",
							color: "text-light",
							class: normalizeClass(_ctx.$style.characterCount)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(instructionsCharacterCount.value), 1)]),
							_: 1
						}, 8, ["class"])
					], 2)]),
					_: 1
				}, 8, ["class", "label"])], 2)
			], 64)) : selectedReference.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [createVNode(unref(N8nFormInput_default), {
				"model-value": referenceFileName.value,
				label: unref(i18n).baseText("agents.builder.skills.references.name.label"),
				name: "skill-reference-name",
				required: "",
				"focus-initially": "",
				"label-size": "small",
				placeholder: unref(i18n).baseText("agents.builder.skills.references.name.placeholder"),
				disabled: props.disabled,
				"show-validation-warnings": props.showValidationWarnings,
				"validation-rules": referenceNameValidationRules,
				validators: referenceNameValidators,
				"data-testid": "agent-skill-reference-name-input",
				"onUpdate:modelValue": onReferenceNameInput,
				onValidate: onReferenceNameValidate
			}, null, 8, [
				"model-value",
				"label",
				"placeholder",
				"disabled",
				"show-validation-warnings"
			])], 2), createVNode(unref(N8nInputLabel_default), {
				class: normalizeClass(_ctx.$style.editorLabel),
				label: unref(i18n).baseText("agents.builder.skills.references.content.label"),
				required: true,
				size: "small"
			}, {
				default: withCtx(() => [createVNode(unref(MarkdownEditor_default), {
					class: normalizeClass([_ctx.$style.editor, _ctx.$style.referenceEditor]),
					"model-value": selectedReference.value.content,
					placeholder: unref(i18n).baseText("agents.builder.skills.references.content.placeholder"),
					"show-toolbar": "floating",
					disabled: props.disabled,
					"max-height": "none",
					"data-testid": "agent-skill-reference-editor",
					"onUpdate:modelValue": onReferenceInput
				}, null, 8, [
					"class",
					"model-value",
					"placeholder",
					"disabled"
				]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.editorMeta) }, [
					selectedReferenceError.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "small",
						color: "danger"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(selectedReferenceError.value), 1)]),
						_: 1
					})) : createCommentVNode("", true),
					referencesError.value && !selectedReferenceError.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 1,
						size: "small",
						color: "danger"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(referencesError.value), 1)]),
						_: 1
					})) : createCommentVNode("", true),
					createVNode(unref(N8nText_default), {
						size: "xsmall",
						color: "text-light",
						class: normalizeClass(_ctx.$style.characterCount)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(selectedReferenceCharacterCount.value), 1)]),
						_: 1
					}, 8, ["class"])
				], 2)]),
				_: 1
			}, 8, ["class", "label"])], 64)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	panel: "_panel_v5izy_1",
	readOnlyField: "_readOnlyField_v5izy_10",
	readOnlyText: "_readOnlyText_v5izy_16",
	readOnlyMarkdown: "_readOnlyMarkdown_v5izy_22",
	field: "_field_v5izy_52",
	editor: "_editor_v5izy_58",
	resizable: "_resizable_v5izy_65",
	referenceEditor: "_referenceEditor_v5izy_73",
	editorLabel: "_editorLabel_v5izy_77",
	editorMeta: "_editorMeta_v5izy_83",
	characterCount: "_characterCount_v5izy_89"
} }]]);
//#endregion
//#region src/features/agents/components/skillVersions/SkillVersionDiff.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$2 = ["data-testid"];
var _hoisted_2 = ["data-testid"];
var SkillVersionDiff_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SkillVersionDiff",
	props: {
		sections: {},
		selectedPath: {}
	},
	setup(__props) {
		const FIELD_LABELS = {
			name: "agents.builder.skills.name.label",
			description: "agents.builder.skills.description.label",
			instructions: "agents.builder.skills.instructions.label"
		};
		/** Fields whose text is markdown: their unchanged lines render as markdown. */
		const MARKDOWN_FIELDS = /* @__PURE__ */ new Set(["instructions"]);
		const props = __props;
		const i18n = useI18n();
		/** The sections of the selected file, each with its blocks worked out once. */
		const shownSections = computed(() => props.sections.filter((section) => props.selectedPath === "SKILL.md" ? section.key in FIELD_LABELS : section.key === props.selectedPath).map((section) => ({
			...section,
			blocks: blocksOf(section.lines)
		})));
		function blocksOf(lines) {
			const blocks = [];
			for (const line of lines) {
				const last = blocks.at(-1);
				if (line.type === "equal") {
					if (last?.kind === "equal") last.text += `\n${line.text}`;
					else blocks.push({
						kind: "equal",
						text: line.text
					});
				} else blocks.push({
					kind: "change",
					line
				});
			}
			return blocks;
		}
		function labelOf(section) {
			const key = FIELD_LABELS[section.key];
			return key ? i18n.baseText(key) : section.key;
		}
		function isMarkdown(section) {
			return MARKDOWN_FIELDS.has(section.key) || section.key.endsWith(".md");
		}
		/**
		* Whether an unchanged run renders as markdown. A run that opens or closes a code fence
		* without the other half would turn the rest of the run into code, so it stays plain text.
		*/
		function rendersAsMarkdown(section, text) {
			if (!isMarkdown(section)) return false;
			return text.split("\n").filter((line) => /^\s*(```|~~~)/.test(line)).length % 2 === 0;
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.diff),
				"data-testid": "skill-version-diff"
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(shownSections.value, (section) => {
				return openBlock(), createElementBlock("section", {
					key: section.key,
					class: normalizeClass(_ctx.$style.field),
					"data-testid": `skill-version-diff-${section.key}`
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.fieldHeader) }, [createVNode(unref(N8nText_default), {
					size: "small",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(labelOf(section)), 1)]),
					_: 2
				}, 1024), createVNode(SkillDiffCount_default, { count: section }, null, 8, ["count"])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.body) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(section.blocks, (block, index) => {
					return openBlock(), createElementBlock(Fragment, { key: index }, [block.kind === "equal" && rendersAsMarkdown(section, block.text) ? (openBlock(), createBlock(unref(N8nMarkdown_default), {
						key: 0,
						class: normalizeClass(_ctx.$style.equal),
						content: block.text
					}, null, 8, ["class", "content"])) : block.kind === "equal" ? (openBlock(), createElementBlock("p", {
						key: 1,
						class: normalizeClass([_ctx.$style.line, _ctx.$style.equal])
					}, toDisplayString(block.text), 3)) : (openBlock(), createElementBlock("p", {
						key: 2,
						class: normalizeClass([_ctx.$style.line, block.line.type === "added" ? _ctx.$style.added : _ctx.$style.removed]),
						"data-testid": `skill-version-diff-${block.line.type}`
					}, [createBaseVNode("span", {
						class: normalizeClass(_ctx.$style.marker),
						"aria-hidden": "true"
					}, toDisplayString(block.line.type === "added" ? "+" : "−"), 3), (openBlock(true), createElementBlock(Fragment, null, renderList(block.line.segments, (segment, segmentIndex) => {
						return openBlock(), createElementBlock("span", {
							key: segmentIndex,
							class: normalizeClass(segment.changed && _ctx.$style.changedWord)
						}, toDisplayString(segment.text), 3);
					}), 128))], 10, _hoisted_2))], 64);
				}), 128))], 2)], 10, _hoisted_1$2);
			}), 128))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	diff: "_diff_1drwg_1",
	field: "_field_1drwg_9",
	fieldHeader: "_fieldHeader_1drwg_15",
	body: "_body_1drwg_21",
	line: "_line_1drwg_30",
	equal: "_equal_1drwg_39",
	marker: "_marker_1drwg_43",
	removed: "_removed_1drwg_49",
	added: "_added_1drwg_54",
	changedWord: "_changedWord_1drwg_59"
} }]]);
//#endregion
//#region src/features/agents/components/skillVersions/SkillVersionTimeline.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$1 = ["data-testid", "onClick"];
var SkillVersionTimeline_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SkillVersionTimeline",
	props: {
		versions: {},
		shownVersion: {},
		canRestore: { type: Boolean },
		agent: {}
	},
	emits: [
		"open",
		"restore",
		"compare",
		"use",
		"useLatest"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const $style = useCssModule();
		function savedBy(version) {
			const { date, time } = convertToDisplayDate(version.createdAt);
			return i18n.baseText("agents.builder.skills.versions.savedBy", { interpolate: {
				author: preferenceUserName(version.createdBy) || i18n.baseText("agents.builder.skills.versions.unknownUser"),
				date,
				time
			} });
		}
		function actionsFor(index, version) {
			return [...props.agent && version !== props.agent.draft ? [{
				id: "use",
				label: i18n.baseText("agents.builder.skills.versions.useIn", { interpolate: { agent: props.agent.name } }),
				icon: "node-pin"
			}] : [], ...props.canRestore && index > 0 ? [{
				id: "restore",
				label: i18n.baseText("agents.builder.skills.versions.restore"),
				icon: "history"
			}] : []];
		}
		/** The menu items of each row, computed once per render and not per template use. */
		const actionsByVersion = computed(() => new Map(props.versions.map((v, index) => [v.version, actionsFor(index, v.version)])));
		function onAction(version, action) {
			if (action === "use") emit("use", version);
			else emit("restore", version);
		}
		function isShown(version) {
			return version.version === props.shownVersion;
		}
		/** The dot of a row: the draft and the published agent in the builder, the latest in Settings. */
		function dotClass(version, index) {
			if (!props.agent) return index === 0 && $style.latestDot;
			return [version === props.agent.draft && $style.draftDot, version === props.agent.published && $style.publishedDot];
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("aside", {
				class: normalizeClass(unref($style).panel),
				"data-testid": "skill-version-timeline"
			}, [createBaseVNode("div", { class: normalizeClass(unref($style).header) }, [createVNode(unref(N8nText_default), {
				tag: "h3",
				size: "medium",
				bold: "",
				class: normalizeClass(unref($style).title)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.versions.title")), 1)]),
				_: 1
			}, 8, ["class"]), props.agent ? (openBlock(), createBlock(unref(N8nSwitch_default), {
				key: 0,
				"model-value": !props.agent.pinned,
				label: unref(i18n).baseText("agents.builder.skills.versions.useLatest"),
				"data-testid": "skill-version-use-latest",
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $event ? emit("useLatest") : emit("use", props.agent.draft))
			}, null, 8, ["model-value", "label"])) : createCommentVNode("", true)], 2), createBaseVNode("ol", { class: normalizeClass(unref($style).list) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(props.versions, (version, index) => {
				return openBlock(), createElementBlock("li", {
					key: version.id,
					class: normalizeClass([unref($style).row, isShown(version) && unref($style).shown]),
					"data-testid": `skill-version-row-${version.version}`,
					onClick: ($event) => emit("open", version.version)
				}, [
					createBaseVNode("span", {
						class: normalizeClass([unref($style).dot, dotClass(version.version, index)]),
						"aria-hidden": "true"
					}, null, 2),
					createBaseVNode("div", { class: normalizeClass(unref($style).text) }, [createBaseVNode("span", { class: normalizeClass(unref($style).versionLine) }, [
						createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-dark",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.versions.number", { interpolate: { version: version.version } })), 1)]),
							_: 2
						}, 1024),
						index === 0 ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.versions.latest")), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						props.agent && version.version === props.agent.published ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 1,
							size: "small",
							color: "text-light",
							"data-testid": "skill-version-published"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.versions.inPublishedAgent")), 1)]),
							_: 1
						})) : createCommentVNode("", true)
					], 2), createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(savedBy(version)), 1)]),
						_: 2
					}, 1024)], 2),
					createBaseVNode("span", {
						class: normalizeClass(unref($style).actions),
						onClick: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"]))
					}, [createVNode(unref(N8nIconButton_default), {
						class: normalizeClass(isShown(version) && unref($style).placeholder),
						disabled: isShown(version),
						"aria-hidden": isShown(version) || void 0,
						tabindex: isShown(version) ? -1 : void 0,
						variant: "ghost",
						size: "small",
						icon: "file-diff",
						"aria-label": unref(i18n).baseText("agents.builder.skills.versions.compare", { interpolate: {
							from: version.version,
							to: props.shownVersion ?? ""
						} }),
						"data-testid": `skill-version-compare-${version.version}`,
						onClick: ($event) => emit("compare", version.version)
					}, null, 8, [
						"class",
						"disabled",
						"aria-hidden",
						"tabindex",
						"aria-label",
						"data-testid",
						"onClick"
					]), !actionsByVersion.value.get(version.version)?.length ? (openBlock(), createBlock(unref(N8nIconButton_default), {
						key: 0,
						class: normalizeClass(unref($style).placeholder),
						variant: "ghost",
						size: "small",
						icon: "ellipsis",
						disabled: "",
						"aria-hidden": "true",
						tabindex: "-1",
						"data-testid": `skill-version-actions-${version.version}`
					}, null, 8, ["class", "data-testid"])) : (openBlock(), createBlock(unref(N8nActionDropdown_default), {
						key: 1,
						items: actionsByVersion.value.get(version.version) ?? [],
						"activator-icon": "ellipsis",
						"activator-size": "small",
						placement: "bottom-end",
						"data-testid": `skill-version-actions-${version.version}`,
						onSelect: (action) => onAction(version.version, action)
					}, null, 8, [
						"items",
						"data-testid",
						"onSelect"
					]))], 2)
				], 10, _hoisted_1$1);
			}), 128))], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	panel: "_panel_52l9c_1",
	header: "_header_52l9c_8",
	title: "_title_52l9c_14",
	list: "_list_52l9c_18",
	row: "_row_52l9c_28",
	shown: "_shown_52l9c_37",
	dot: "_dot_52l9c_53",
	draftDot: "_draftDot_52l9c_62",
	latestDot: "_latestDot_52l9c_67",
	publishedDot: "_publishedDot_52l9c_72",
	versionLine: "_versionLine_52l9c_83",
	text: "_text_52l9c_89",
	actions: "_actions_52l9c_96",
	placeholder: "_placeholder_52l9c_102"
} }]]);
//#endregion
//#region src/features/agents/components/AgentSkillModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["href"];
var SKILL_FILE = "SKILL.md";
var AgentSkillModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentSkillModal",
	props: {
		modalName: { default: "" },
		data: {},
		inline: {
			type: Boolean,
			default: false
		}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const $style = useCssModule();
		const message = useMessage();
		const uiStore = useUIStore();
		const router = useRouter();
		const rootStore = useRootStore();
		const projectsStore = useProjectsStore();
		const { showError } = useToast();
		const agentTelemetry = useAgentTelemetry();
		const modalOpen = computed(() => props.inline || uiStore.modalsById[props.modalName]?.open === true);
		const existingNameKeys = computed(() => {
			const names = props.data.getAttachedSkills ? props.data.getAttachedSkills().map(({ name }) => name) : props.data.existingSkillNames ?? [];
			return new Set(names.map(skillNameKey));
		});
		function getDefaultSkillName() {
			const baseName = i18n.baseText("agents.builder.skills.defaultName");
			if (!existingNameKeys.value.has(skillNameKey(baseName))) return baseName;
			let suffix = 2;
			while (existingNameKeys.value.has(skillNameKey(`${baseName} ${suffix}`))) suffix += 1;
			return `${baseName} ${suffix}`;
		}
		function toFormSkill(source) {
			return normalizeSkill({
				name: source?.name ?? getDefaultSkillName(),
				description: source?.description ?? "",
				instructions: source?.instructions ?? "",
				...source?.references ? { references: source.references } : {}
			});
		}
		const initialSkill = ref(toFormSkill(props.data.skill));
		const skill = ref((0, import_cloneDeep.default)(initialSkill.value));
		const submitted = ref(false);
		const formIsValid = ref(false);
		const selectedPath = ref(SKILL_FILE);
		const isEditing = computed(() => !!props.data.skillId);
		const createMethod = ref(props.data.initialMethod ?? "manual");
		const hasPicker = !props.data.skillId && !!props.data.skillRefsEnabled && !!props.data.onAttach;
		const startsManual = !props.data.skill && !props.data.skillId && props.data.initialStep === "manual";
		const step = ref(props.data.skill || props.data.skillId ? "edit" : startsManual ? "manual" : hasPicker ? "select" : "upload");
		/** The form steps show the scope badge, the header menu and "Close" instead of "Cancel". */
		const isFormStep = computed(() => step.value === "manual" || step.value === "edit");
		const isImporting = ref(false);
		const isSaving = ref(false);
		/** A name error from the server, such as a taken name. Typing a new name clears it. */
		const serverNameError = ref("");
		const scope = ref(props.data.initialScope ?? props.data.scopeOptions?.[0]?.value ?? "");
		const availableToAssistant = ref(props.data.availableToAssistant ?? false);
		const showAssistantAvailability = computed(() => props.data.availableToAssistant !== void 0 && (scope.value === "instance" || scope.value.startsWith("project:")));
		const assistantAvailabilityChanged = computed(() => showAssistantAvailability.value && availableToAssistant.value !== props.data.availableToAssistant);
		const availableToMCP = ref(props.data.availableToMCP ?? false);
		const showAvailableToMCP = computed(() => props.data.availableToMCP !== void 0 && (scope.value === "instance" || scope.value.startsWith("project:")));
		const availableToMCPChanged = computed(() => showAvailableToMCP.value && availableToMCP.value !== props.data.availableToMCP);
		/** The last default name the server gave. A name the user typed is never replaced. */
		const serverDefaultName = ref(null);
		/** Save waits for the lookup, so a taken local default cannot fail after the modal closes. */
		const defaultNameLoading = ref(false);
		let latestNameRequest = 0;
		async function refreshDefaultName() {
			if (!props.data.getDefaultName || props.data.skillId) return;
			const current = skill.value.name;
			if (current !== getDefaultSkillName() && current !== serverDefaultName.value) return;
			const request = ++latestNameRequest;
			const requestedScope = nameScope.value;
			defaultNameLoading.value = true;
			try {
				const name = await props.data.getDefaultName(requestedScope);
				if (request !== latestNameRequest || nameScope.value !== requestedScope) return;
				if (skill.value.name !== current) return;
				serverDefaultName.value = name;
				skill.value = {
					...skill.value,
					name
				};
			} catch {} finally {
				if (request === latestNameRequest) defaultNameLoading.value = false;
			}
		}
		function onAddManually() {
			createMethod.value = "manual";
			step.value = "manual";
			refreshDefaultName();
		}
		const showScope = computed(() => !!props.data.scopeOptions?.length && step.value !== "preview");
		const canChangeScope = computed(() => showScope.value && !syncedFrom.value && !props.data.scopeLockedReason && !props.data.readOnly);
		const availableTo = ref("project");
		/**
		* Where the new skill goes, for its default name: the scope field in Settings, or
		* "available to" in the agent builder. `getDefaultName` gets this value.
		*/
		const nameScope = computed(() => showScope.value ? scope.value : availableTo.value);
		watch(nameScope, () => {
			if (step.value === "manual") refreshDefaultName();
		});
		const librarySkills = ref([]);
		const libraryLoading = ref(false);
		const attachedSkills = computed(() => props.data.getAttachedSkills?.() ?? []);
		const attachedSkillIds = computed(() => new Set(attachedSkills.value.map(({ id }) => id)));
		const attachingSkillIds = ref(/* @__PURE__ */ new Set());
		const pickerItems = computed(() => librarySkills.value.map((librarySkill) => {
			const attached = attachedSkillIds.value.has(librarySkill.id);
			const attaching = attachingSkillIds.value.has(librarySkill.id);
			const similarNameReason = attached || attaching ? void 0 : getSimilarNameReason(librarySkill.name);
			return {
				id: `skill:${librarySkill.id}`,
				kind: "skill",
				skillId: librarySkill.id,
				title: librarySkill.name,
				description: librarySkill.description,
				category: getPickerCategory(librarySkill),
				status: "none",
				attached: attached || attaching,
				attaching,
				disabled: similarNameReason !== void 0,
				...similarNameReason ? { disabledReason: similarNameReason } : {}
			};
		}));
		const { showRecommendedSkills, trackCardsShown: trackRecommendedSkillsShown, trackSkillAdded: trackRecommendedSkillAdded } = useRecommendedSkillsExperiment();
		const recommendedSkillId = ref();
		const { loadRecommendedSkill } = useRecommendedSkillLoader();
		const pickerCategories = computed(() => showRecommendedSkills.value ? [
			"all",
			"project",
			"global",
			"recommended"
		] : [
			"all",
			"project",
			"global"
		]);
		const recommendedSkillByPickerItemId = new Map(RECOMMENDED_SKILLS.map((recommended) => [`recommended:${recommended.id}`, recommended]));
		const pickerItemsWithRecommended = computed(() => showRecommendedSkills.value ? [...pickerItems.value, ...RECOMMENDED_SKILLS.map((recommended) => {
			const similarNameReason = getSimilarNameReason(recommended.name);
			return {
				id: `recommended:${recommended.id}`,
				kind: "skill",
				skillId: recommended.id,
				title: recommended.name,
				description: i18n.baseText(recommended.cardTextKey),
				category: "recommended",
				status: "none",
				attached: false,
				disabled: similarNameReason !== void 0,
				...similarNameReason ? { disabledReason: similarNameReason } : {}
			};
		})] : pickerItems.value);
		const previewSkill = ref(null);
		const previewPath = ref(SKILL_FILE);
		const previewLoading = ref(false);
		const previewIsAdded = computed(() => !!previewSkill.value && attachedSkillIds.value.has(previewSkill.value.id));
		const showRemove = computed(() => {
			if (!props.data.onRemove) return false;
			if (step.value === "preview") return previewIsAdded.value;
			return isEditing.value && !props.data.skillRefsEnabled;
		});
		const footerPrimaryAction = computed(() => {
			if (step.value === "select") return void 0;
			if (step.value === "preview") return previewIsAdded.value ? void 0 : "add";
			if (viewedVersion.value) return "viewing";
			if (isPinned.value) return "save";
			if (isOutdated.value) return props.data.onUseLatestVersion ? "useLatest" : void 0;
			return isReadOnly.value ? void 0 : "save";
		});
		const modalTitle = computed(() => {
			if (step.value === "select") return i18n.baseText("agents.builder.skills.title");
			if (step.value === "upload") return i18n.baseText("agents.builder.skills.add");
			if (step.value === "preview") return previewSkill.value?.name ?? "";
			return viewedVersion.value?.skill.name ?? skill.value.name;
		});
		const skillAccess = ref(null);
		const skillAccessLoading = ref(false);
		const skillAccessFailed = ref(false);
		/** A pinned skill is read-only in the builder: the agent runs that version, not the latest. */
		const isPinned = computed(() => isEditing.value && !!props.data.agentVersions?.pinned);
		const isOutdated = computed(() => isEditing.value && !!props.data.outdated);
		/**
		* Where a synced skill comes from, for the banner and the source link. The server already
		* marks a synced skill `canEdit: false`, so it does not feed the read-only rule here.
		*/
		const syncedFrom = computed(() => props.data.syncedFrom ?? skillAccess.value?.syncedFrom ?? null);
		const canStopSyncing = computed(() => !!syncedFrom.value?.canStopSyncing && !!props.data.onStopSyncing && !!props.data.skillId);
		/** True while a stop runs, so a second click cannot send it again. */
		const isStoppingSync = ref(false);
		async function onStopSyncing() {
			if (!canStopSyncing.value || !props.data.skillId || !props.data.onStopSyncing || isStoppingSync.value || isSaving.value) return;
			isStoppingSync.value = true;
			try {
				await props.data.onStopSyncing(props.data.skillId);
			} finally {
				isStoppingSync.value = false;
			}
		}
		const isReadOnly = computed(() => props.data.readOnly === true || skillAccessLoading.value || skillAccessFailed.value || skillAccess.value?.canEdit === false || isOutdated.value || isPinned.value);
		const cannotEdit = computed(() => props.data.readOnly === true || skillAccess.value?.canEdit === false || isOutdated.value || isPinned.value);
		/** Save sends a snapshot, so the editor is locked until the answer comes back. */
		const editorLocked = computed(() => isReadOnly.value || isSaving.value);
		const savedTarget = computed(() => skillAccess.value?.scope);
		const showAvailabilitySelect = computed(() => {
			if (!props.data.skillRefsEnabled || step.value === "preview" || syncedFrom.value) return false;
			if (!isEditing.value) return true;
			return !!savedTarget.value && !cannotEdit.value;
		});
		const showInstanceTarget = computed(() => !!props.data.canCreateInstanceSkills || savedTarget.value === "instance");
		const AVAILABILITY_ICONS = {
			project: "layers",
			instance: "globe"
		};
		const availabilityOptions = computed(() => [{
			value: "project",
			label: props.data.projectLabel ?? i18n.baseText("agents.builder.skills.availableTo.project")
		}, ...showInstanceTarget.value ? [{
			value: "instance",
			label: i18n.baseText("agents.builder.skills.availableTo.instance")
		}] : []]);
		const scopeChoices = computed(() => {
			if (showScope.value) return props.data.scopeOptions ?? [];
			return availabilityOptions.value.map((option) => ({
				...option,
				icon: AVAILABILITY_ICONS[option.value],
				projectIcon: option.value === "project" ? builderProjectIcon.value : void 0
			}));
		});
		/** The agent's project icon, so the "Change scope" menu matches the scope badge. */
		const builderProjectIcon = computed(() => {
			const projectId = props.data.projectId;
			if (!projectId) return null;
			if (skillAccess.value?.projectId === projectId && skillAccess.value.projectIcon) return skillAccess.value.projectIcon;
			return [
				projectsStore.personalProject,
				projectsStore.currentProject,
				...projectsStore.myProjects
			].find((candidate) => candidate?.id === projectId)?.icon ?? null;
		});
		const selectedScopeValue = computed(() => showScope.value ? scope.value : availableTo.value);
		const selectedScope = computed(() => scopeChoices.value.find((choice) => choice.value === selectedScopeValue.value));
		const selectedScopeSkill = computed(() => {
			const target = showScope.value ? parseScope(scope.value) : {
				scope: availableTo.value,
				projectId: props.data.projectId
			};
			const saved = showScope.value ? scope.value === props.data.initialScope ? {
				projectType: props.data.projectType,
				projectIcon: props.data.projectIcon
			} : void 0 : availableTo.value === savedTarget.value ? skillAccess.value : void 0;
			return {
				scope: target.scope,
				projectId: target.scope === "project" ? target.projectId ?? null : null,
				projectName: selectedScope.value?.label ?? null,
				projectType: saved?.projectType ?? null,
				projectIcon: selectedScope.value?.projectIcon ?? saved?.projectIcon ?? null
			};
		});
		const showScopeBadge = computed(() => isFormStep.value && (showScope.value || !!props.data.skillRefsEnabled && (!isEditing.value || !!savedTarget.value)));
		const scopeEditable = computed(() => scopeChoices.value.length > 1 && (showScope.value ? canChangeScope.value && !isSaving.value : showAvailabilitySelect.value));
		function onScopeChoice(value) {
			if (!scopeEditable.value) return;
			if (showScope.value) {
				scope.value = value;
				return;
			}
			if (value === "project" || value === "instance") availableTo.value = value;
		}
		/** A project row shows the project's own icon or emoji, as the scope badge does. */
		function scopeItemIcon(choice) {
			const projectIcon = choice.projectIcon;
			if (projectIcon?.type === "emoji") return {
				type: "emoji",
				value: projectIcon.value
			};
			if (projectIcon?.type === "icon") return {
				type: "icon",
				value: projectIcon.value,
				color: projectIcon.color
			};
			return {
				type: "icon",
				value: choice.icon
			};
		}
		function scopeItems(testIdPrefix) {
			return scopeChoices.value.filter((choice) => !isEditing.value || choice.value !== selectedScopeValue.value).map((choice) => ({
				id: `scope:${choice.value}`,
				label: choice.label,
				icon: scopeItemIcon(choice),
				checked: choice.value === selectedScopeValue.value,
				testId: `${testIdPrefix}${choice.value}`
			}));
		}
		/** "Add to <agent>" toggles the attachment of a hub skill to the agent it was opened from. */
		const showAttachToggle = computed(() => step.value === "edit" && isEditing.value && !!props.data.skillRefsEnabled && !!props.data.agentId && !!props.data.onRemove);
		const headerMenuItems = computed(() => {
			const items = [];
			if (showAttachToggle.value) items.push({
				id: "attach",
				label: props.data.agentName ? i18n.baseText("agents.builder.skills.menu.addToAgent", { interpolate: { agent: props.data.agentName } }) : i18n.baseText("agents.builder.skills.menu.addToThisAgent"),
				icon: {
					type: "icon",
					value: "bot"
				},
				checkbox: true,
				checked: true,
				class: $style.menuItem,
				testId: "agent-skill-menu-attach"
			});
			if (showAssistantToggle.value) items.push({
				id: "assistant",
				label: i18n.baseText("settings.context.skills.assistant.toggle"),
				icon: {
					type: "icon",
					value: "sparkles"
				},
				checkbox: true,
				checked: availableToAssistant.value,
				disabled: editorLocked.value,
				class: $style.menuItem,
				testId: "agent-skill-menu-assistant"
			});
			if (showMcpToggle.value) items.push({
				id: "mcp",
				label: i18n.baseText("settings.context.skills.modal.mcp.toggle"),
				icon: {
					type: "icon",
					value: "mcp"
				},
				checkbox: true,
				checked: availableToMCP.value,
				disabled: editorLocked.value,
				class: $style.menuItem,
				testId: "agent-skill-menu-mcp"
			});
			if (showScopeBadge.value && !syncedFrom.value) items.push({
				id: "change-scope",
				label: i18n.baseText("agents.builder.skills.menu.changeScope"),
				icon: {
					type: "icon",
					value: "globe"
				},
				disabled: !scopeEditable.value,
				class: $style.menuItem,
				testId: "agent-skill-menu-change-scope",
				children: scopeItems("agent-skill-menu-scope-option-").map((item) => ({
					...item,
					class: $style.menuItem
				}))
			});
			if (syncedFrom.value) {
				items.push({
					id: "openInGithub",
					label: i18n.baseText("settings.context.skills.synced.openInGithub"),
					icon: {
						type: "icon",
						value: "external-link"
					},
					class: $style.menuItem,
					testId: "agent-skill-open-in-github"
				});
				if (canStopSyncing.value) items.push({
					id: "stopSyncing",
					label: i18n.baseText("settings.context.skills.stopSyncing.action"),
					icon: {
						type: "icon",
						value: "unlink"
					},
					disabled: isSaving.value || isStoppingSync.value,
					class: $style.menuItem,
					testId: "agent-skill-stop-syncing"
				});
			}
			if (isEditing.value && (props.data.onDelete || showAttachToggle.value)) items.push({
				id: "delete",
				label: i18n.baseText("agents.builder.skills.menu.delete"),
				icon: {
					type: "icon",
					value: "trash-2"
				},
				divided: items.length > 0,
				disabled: !props.data.onDelete || !!props.data.deleteDisabledReason || isSaving.value,
				class: [$style.menuItem, $style.deleteItem],
				testId: "agent-skill-menu-delete"
			});
			return items;
		});
		const menuSwitchTestIds = {
			attach: "agent-skill-menu-attach-switch",
			assistant: "skill-assistant-availability",
			mcp: "skill-available-to-mcp"
		};
		function onHeaderMenuSelect(action) {
			if (action === "openInGithub" && syncedFrom.value) {
				window.open(syncedFrom.value.webUrl, "_blank", "noopener,noreferrer");
				return;
			}
			if (action === "stopSyncing") {
				onStopSyncing();
				return;
			}
			if (action === "assistant" && showAssistantToggle.value && !editorLocked.value) {
				availableToAssistant.value = !availableToAssistant.value;
				return;
			}
			if (action === "mcp" && showMcpToggle.value && !editorLocked.value) {
				availableToMCP.value = !availableToMCP.value;
				return;
			}
			if (action.startsWith("scope:")) {
				onScopeChoice(action.slice(6));
				return;
			}
			if (action === "attach") {
				onRemove();
				return;
			}
			if (action === "delete" && props.data.skillId && props.data.onDelete) props.data.onDelete(props.data.skillId);
		}
		/** Where a changed scope or "available to" field moves the skill, with its label and users. */
		const pendingMove = computed(() => {
			if (showScope.value) {
				if (!canChangeScope.value || scope.value === props.data.initialScope) return void 0;
				const option = props.data.scopeOptions?.find(({ value }) => value === scope.value);
				const usage = props.data.usedBy;
				return option?.target && usage ? {
					target: option.target,
					destination: option.label,
					usage
				} : void 0;
			}
			const usage = skillAccess.value?.usedBy;
			if (!showAvailabilitySelect.value || !isEditing.value || !props.data.agentId || !usage) return;
			if (availableTo.value === savedTarget.value) return void 0;
			return {
				target: { projectId: availableTo.value === "project" ? props.data.projectId ?? null : null },
				destination: availabilityOptions.value.find(({ value }) => value === availableTo.value)?.label ?? "",
				usage
			};
		});
		/**
		* The warning for a move that takes the skill from agents that use it, or an empty string.
		* The backend refuses such a move, so Save stays off while the warning shows.
		*/
		const accessWarning = computed(() => {
			if (!pendingMove.value) return "";
			const { target, destination, usage } = pendingMove.value;
			const { names, hidden } = agentsLosingSkill(usage, target, props.data.agentId);
			const parts = [];
			if (names.length > 0) parts.push(i18n.baseText("agents.builder.skills.loseAccess", {
				interpolate: {
					agents: names.join(", "),
					destination
				},
				adjustToNumber: names.length
			}));
			if (hidden > 0) parts.push(i18n.baseText("agents.builder.skills.loseAccess.hidden", {
				interpolate: { count: hidden },
				adjustToNumber: hidden
			}));
			return parts.join(" ");
		});
		const removeLabel = computed(() => props.data.skillRefsEnabled ? i18n.baseText("agents.builder.skills.detach") : i18n.baseText("agents.builder.skills.remove"));
		const footerHint = computed(() => {
			const shownSkill = step.value === "preview" ? previewSkill.value : skillAccess.value;
			if (step.value === "edit" && isOutdated.value) return isPinned.value ? "" : i18n.baseText("agents.builder.skills.hint.outdated");
			if (!shownSkill || step.value !== "preview" && step.value !== "edit") return "";
			if (!shownSkill.canEdit) return shownSkill.scope === "instance" ? i18n.baseText("agents.builder.skills.hint.readOnly.instance") : i18n.baseText("agents.builder.skills.hint.readOnly.project");
			if (step.value !== "preview" || previewIsAdded.value) return "";
			return i18n.baseText("agents.builder.skills.hint.addToEdit");
		});
		const canAddReference = computed(() => (skill.value.references ?? []).length < 20);
		const openedWithMissingContent = computed(() => isEditing.value && !(props.data.skill?.instructions ?? "").trim());
		const validationErrors = computed(() => {
			const errors = {};
			const name = skill.value.name.trim();
			const description = skill.value.description.trim();
			const instructions = skill.value.instructions.trim();
			if (!name) errors.name = i18n.baseText("agents.builder.skills.validation.nameRequired");
			else if (name.length > 128) errors.name = i18n.baseText("agents.builder.skills.validation.nameMaxLength");
			else if (existingNameKeys.value.has(skillNameKey(name))) errors.name = i18n.baseText("agents.builder.skills.validation.nameDuplicate");
			if (!description) errors.description = i18n.baseText("agents.builder.skills.validation.descriptionRequired");
			else if (description.length > 1024) errors.description = i18n.baseText("agents.builder.skills.validation.descriptionMaxLength", { interpolate: { max: AGENT_SKILL_DESCRIPTION_MAX_LENGTH.toLocaleString() } });
			if (!instructions) errors.instructions = i18n.baseText("agents.builder.skills.validation.instructionsRequired");
			else if (skill.value.instructions.length > 65536) errors.instructions = i18n.baseText("agents.builder.skills.validation.instructionsMaxLength", { interpolate: { max: AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH.toLocaleString() } });
			if (skill.value.references?.some((reference) => !reference.content.trim())) errors.references = i18n.baseText("agents.builder.skills.references.invalidSummary");
			return errors;
		});
		/** Reference files that block a save: empty, or longer than the limit. */
		const invalidReferencePaths = computed(() => (skill.value.references ?? []).filter((reference) => !reference.content.trim() || reference.content.length > 65536).map((reference) => reference.path));
		const visibleInvalidReferencePaths = computed(() => submitted.value ? invalidReferencePaths.value : []);
		/**
		* A blocked save must show why. Open the file that holds the problem: the first broken
		* reference, else SKILL.md when its fields are invalid and a reference is open.
		*/
		function showFirstInvalidFile() {
			const [firstInvalidReference] = invalidReferencePaths.value;
			if (firstInvalidReference) {
				selectedPath.value = firstInvalidReference;
				return;
			}
			const { references: _references, ...skillFileErrors } = validationErrors.value;
			if (Object.keys(skillFileErrors).length > 0) selectedPath.value = SKILL_FILE;
		}
		const visibleErrors = computed(() => submitted.value || openedWithMissingContent.value ? validationErrors.value : {});
		const visibleNameError = computed(() => (submitted.value ? validationErrors.value.name : void 0) ?? serverNameError.value);
		const canSave = computed(() => formIsValid.value && !validationErrors.value.name && !isReadOnly.value);
		const hasChanges = computed(() => !isEditing.value || !(0, import_isEqual.default)(skill.value, initialSkill.value) || assistantAvailabilityChanged.value || availableToMCPChanged.value || showAvailabilitySelect.value && availableTo.value !== savedTarget.value || canChangeScope.value && scope.value !== props.data.initialScope);
		function getSimilarNameReason(name) {
			const key = skillNameKey(name);
			const similarNames = attachedSkills.value.map((attachedSkill) => attachedSkill.name).filter((attachedName) => skillNameKey(attachedName) === key);
			if (similarNames.length === 0) return void 0;
			return i18n.baseText("agents.builder.skills.picker.similarName", { interpolate: { names: [...similarNames, name].map((value) => `"${value}"`).join(", ") } });
		}
		function getPickerCategory(librarySkill) {
			return librarySkill.scope === "instance" ? "global" : "project";
		}
		async function loadLibrarySkills() {
			if (!props.data.agentId) return;
			libraryLoading.value = true;
			try {
				librarySkills.value = await listAttachableSkills(rootStore.restApiContext, props.data.agentId);
			} catch (error) {
				showError(error, i18n.baseText("agents.builder.skills.picker.loadError"));
			} finally {
				libraryLoading.value = false;
			}
		}
		function targetForPickerCategory(category) {
			return category === "global" && props.data.canCreateInstanceSkills ? "instance" : "project";
		}
		function onPickerCreate(category) {
			availableTo.value = targetForPickerCategory(category);
			step.value = "upload";
		}
		async function loadSkillAccess(skillId) {
			skillAccessLoading.value = true;
			try {
				skillAccess.value = await getSkillDetail(rootStore.restApiContext, skillId);
				availableTo.value = savedTarget.value ?? "project";
			} catch (error) {
				skillAccess.value = null;
				skillAccessFailed.value = true;
				showError(error, i18n.baseText("agents.builder.skills.accessError"));
			} finally {
				skillAccessLoading.value = false;
			}
		}
		async function selectRecommendedSkill(id) {
			const recommended = RECOMMENDED_SKILLS.find((candidate) => candidate.id === id);
			if (!recommended) return;
			const loadedSkill = await loadRecommendedSkill(recommended);
			if (!loadedSkill || step.value !== "select") return;
			onSkillUploaded(loadedSkill);
			createMethod.value = "manual";
			recommendedSkillId.value = recommended.id;
		}
		function onPickerItemAttach(item) {
			if (item.kind !== "skill" || item.disabled || item.attached) return;
			if (item.category === "recommended") selectRecommendedSkill(item.skillId);
			else attachLibrarySkill(item.skillId);
		}
		async function onPickerItemPreview(item) {
			if (item.kind !== "skill" || item.disabled) return;
			if (item.category === "recommended") return await selectRecommendedSkill(item.skillId);
			previewLoading.value = true;
			try {
				previewSkill.value = await getSkillDetail(rootStore.restApiContext, item.skillId);
				previewPath.value = SKILL_FILE;
				step.value = "preview";
			} catch (error) {
				showError(error, i18n.baseText("agents.builder.skills.picker.previewError"));
			} finally {
				previewLoading.value = false;
			}
		}
		async function attachLibrarySkill(skillId) {
			const librarySkill = librarySkills.value.find((candidate) => candidate.id === skillId);
			if (!librarySkill || !props.data.onAttach) return;
			attachingSkillIds.value = /* @__PURE__ */ new Set([...attachingSkillIds.value, skillId]);
			try {
				await props.data.onAttach(librarySkill);
			} finally {
				const remaining = new Set(attachingSkillIds.value);
				remaining.delete(skillId);
				attachingSkillIds.value = remaining;
			}
		}
		/** Opens Settings > Context > Skills in a new tab, so the agent and the picker stay open. */
		function onManageSkills() {
			window.open(router.resolve({ name: VIEWS.SETTINGS_CONTEXT_SKILLS }).href, "_blank", "noopener");
		}
		function onPreviewAdd() {
			if (!previewSkill.value) return;
			attachLibrarySkill(previewSkill.value.id);
			step.value = "select";
		}
		onMounted(() => {
			if (startsManual) refreshDefaultName();
			if (hasPicker) {
				loadLibrarySkills();
				if (showRecommendedSkills.value) trackRecommendedSkillsShown("agent_skill_modal");
			}
			if (props.data.skillId && props.data.skillRefsEnabled) loadSkillAccess(props.data.skillId);
		});
		const showAssistantToggle = computed(() => showScope.value && showAssistantAvailability.value && !cannotEdit.value);
		const showMcpToggle = computed(() => showScope.value && showAvailableToMCP.value && !cannotEdit.value);
		const versionsOpen = ref(!props.inline && !!props.data.initialVersionsOpen);
		const { versions, viewedVersion, loadVersions, reloadVersions, fetchVersion, openVersion, comparison, diffSections, diffCounts, comparedSkill, compareVersions } = useSkillVersions(() => props.data.skillId, () => baseVersion.value);
		const latestVersion = computed(() => props.data.skillId ? versions.value?.[0]?.version ?? props.data.latestVersion : void 0);
		/** The version the editor shows: the one a pinned agent runs, else the latest. */
		const baseVersion = computed(() => isPinned.value ? props.data.agentVersions?.draft : versions.value?.[0]?.version);
		/** The warning strip of a pinned skill. Compare mode and an opened version have their own bars. */
		const showPinnedBar = computed(() => isPinned.value && !viewedVersion.value && !comparison.value);
		/** The Versions panel shows beside the editor once its list has loaded. Compare mode hides it. */
		const showVersionsPanel = computed(() => isFormStep.value && versionsOpen.value && !!versions.value && !comparison.value);
		watch(versionsOpen, (open) => {
			if (open) loadVersions();
		}, { immediate: true });
		const displayedSkill = computed(() => viewedVersion.value?.skill ?? skill.value);
		const viewingText = computed(() => {
			const viewed = viewedVersion.value;
			if (!viewed) return "";
			const { date, time } = convertToDisplayDate(viewed.createdAt);
			const key = viewed.version === versions.value?.[0]?.version ? "agents.builder.skills.versions.viewingLatest" : "agents.builder.skills.versions.viewing";
			return i18n.baseText(key, { interpolate: {
				version: viewed.version,
				author: preferenceUserName(viewed.createdBy) || i18n.baseText("agents.builder.skills.versions.unknownUser"),
				date,
				time: time.slice(0, 5)
			} });
		});
		const canRestore = computed(() => !isReadOnly.value);
		async function onOpenVersion(version) {
			selectedPath.value = SKILL_FILE;
			await openVersion(version);
		}
		const versionOptions = computed(() => (versions.value ?? []).map(({ version }) => ({
			value: version,
			label: i18n.baseText("agents.builder.skills.versions.number", { interpolate: { version } })
		})));
		/** The agent the builder opened the editor from, for the markers and "Use in <agent>". */
		const timelineAgent = computed(() => props.data.agentVersions && props.data.agentName ? {
			name: props.data.agentName,
			...props.data.agentVersions,
			draft: props.data.agentVersions.pinned ? props.data.agentVersions.draft : latestVersion.value ?? props.data.agentVersions.draft
		} : void 0);
		const versionsButtonLabel = computed(() => {
			const agentVersions = props.data.agentVersions;
			const key = !agentVersions ? "agents.builder.skills.versions.number" : agentVersions.pinned ? "agents.builder.skills.versions.usingVersion" : "agents.builder.skills.versions.usingLatest";
			const version = agentVersions?.pinned ? agentVersions.draft : latestVersion.value;
			return i18n.baseText(key, { interpolate: { version: version ?? "" } });
		});
		async function useVersion(version) {
			const skillId = props.data.skillId;
			if (!skillId || !props.data.onUseVersion) return;
			if (isEditing.value && hasChanges.value) {
				if (await message.confirm(i18n.baseText("agents.builder.skills.versions.discardEdits.message"), i18n.baseText("agents.builder.skills.versions.discardEdits.title"), {
					type: "warning",
					confirmButtonText: i18n.baseText("agents.builder.skills.versions.discardEdits.confirm"),
					cancelButtonText: i18n.baseText("agents.builder.skills.versions.discardEdits.cancel")
				}) !== "confirm" || !modalOpen.value) return;
			}
			const summary = versions.value?.find((item) => item.version === version);
			const detail = summary && version === props.data.agentVersions?.draft && props.data.skill ? {
				...summary,
				skill: props.data.skill
			} : await fetchVersion(version);
			if (!detail || !modalOpen.value) return;
			props.data.onUseVersion(skillId, detail);
		}
		async function onCompare(a, b) {
			selectedPath.value = SKILL_FILE;
			await compareVersions(a, b);
		}
		/** Done leaves compare mode for the latest version, which the user can edit. */
		function leaveCompare() {
			comparison.value = null;
			viewedVersion.value = null;
		}
		/** Saves the content of an older version as the next version and keeps the editor open on it. */
		async function restoreVersion(version) {
			if (!canRestore.value || isSaving.value) return;
			const detail = viewedVersion.value?.version === version ? viewedVersion.value : await fetchVersion(version);
			if (!detail) return;
			const restored = normalizeSkill({ ...detail.skill });
			if (!await submit(restored, { restoredFrom: version })) return;
			showSavedSkill(restored);
			selectedPath.value = SKILL_FILE;
			submitted.value = false;
			serverNameError.value = "";
			await reloadVersions();
		}
		function onSkillUploaded(importedSkill) {
			createMethod.value = "upload";
			skill.value = normalizeSkill(importedSkill);
			serverNameError.value = "";
			selectedPath.value = SKILL_FILE;
			submitted.value = false;
			step.value = "edit";
		}
		function onBack() {
			if (step.value === "upload" || step.value === "preview") {
				step.value = "select";
				return;
			}
			skill.value = {
				name: getDefaultSkillName(),
				description: "",
				instructions: ""
			};
			serverNameError.value = "";
			selectedPath.value = SKILL_FILE;
			submitted.value = false;
			formIsValid.value = false;
			step.value = "upload";
		}
		function onSkillUpdate(updates) {
			if (isReadOnly.value) return;
			if (updates.name !== void 0 && updates.name !== skill.value.name) serverNameError.value = "";
			skill.value = normalizeSkill({
				...skill.value,
				...updates
			});
			if (selectedPath.value !== SKILL_FILE && !skill.value.references?.some((reference) => reference.path === selectedPath.value)) selectedPath.value = SKILL_FILE;
		}
		function normalizeSkill(skill) {
			return normalizeAgentSkillForSave(skill);
		}
		function onAddReference() {
			if (!canAddReference.value) return;
			const path = nextReferencePath(skill.value.references ?? []);
			skill.value = {
				...skill.value,
				references: [...skill.value.references ?? [], {
					path,
					content: ""
				}]
			};
			selectedPath.value = path;
		}
		function onRemoveReference(path) {
			skill.value = {
				...skill.value,
				references: (skill.value.references ?? []).filter((reference) => reference.path !== path)
			};
			if (selectedPath.value === path) selectedPath.value = SKILL_FILE;
		}
		function nextReferencePath(references) {
			const existingPaths = new Set(references.map((reference) => reference.path));
			let index = 1;
			let path = "references/reference.md";
			while (existingPaths.has(path)) {
				index += 1;
				path = `references/reference-${index}.md`;
			}
			return path;
		}
		function onValidUpdate(valid) {
			formIsValid.value = valid;
		}
		function onImportSkill(payload) {
			if (!props.data.agentId) return;
			agentTelemetry.trackImportedSkill({
				agentId: props.data.agentId,
				...payload
			});
		}
		function closeModal() {
			uiStore.closeModal(props.modalName);
		}
		async function onSave() {
			if (defaultNameLoading.value || isSaving.value || accessWarning.value) return;
			submitted.value = true;
			if (!canSave.value) {
				showFirstInvalidFile();
				return;
			}
			const payload = normalizeSkill({
				name: skill.value.name.trim(),
				description: skill.value.description.trim(),
				instructions: skill.value.instructions,
				...skill.value.references ? { references: skill.value.references } : {}
			});
			const targetChanged = !isEditing.value || availableTo.value !== savedTarget.value;
			if (await submit(payload, {
				...showAvailabilitySelect.value && targetChanged ? { availableTo: availableTo.value } : {},
				...canChangeScope.value ? { scope: scope.value } : {},
				...assistantAvailabilityChanged.value ? { availableToAssistant: availableToAssistant.value } : {},
				...availableToMCPChanged.value ? { availableToMCP: availableToMCP.value } : {},
				...isEditing.value ? {} : { method: createMethod.value }
			})) {
				if (recommendedSkillId.value) trackRecommendedSkillAdded(recommendedSkillId.value, void 0, "agent_skill_modal");
				if (props.inline) showSavedSkill(payload);
				else closeModal();
			}
		}
		/** Hands the skill to the caller. A refused save keeps the modal open with the user's edits. */
		async function submit(payload, extras) {
			isSaving.value = true;
			let result;
			try {
				result = await props.data.onConfirm({
					id: props.data.skillId,
					skill: payload,
					...extras
				});
			} catch {
				return false;
			} finally {
				isSaving.value = false;
			}
			if (result?.saved === false) {
				if (result.nameError) {
					serverNameError.value = result.nameError;
					await focusName();
				}
				return false;
			}
			return true;
		}
		const nameField = useTemplateRef("nameField");
		async function focusName() {
			await nextTick();
			nameField.value?.querySelector("input")?.focus();
		}
		watch(step, async (next) => {
			if ((next === "manual" || next === "edit") && !isEditing.value && !isReadOnly.value) await focusName();
		});
		function onUseLatestVersion() {
			if (!props.data.skillId) return;
			props.data.onUseLatestVersion?.(props.data.skillId);
		}
		/** Shows a saved skill in place of the editor content, as the state to compare edits with. */
		function showSavedSkill(saved) {
			initialSkill.value = toFormSkill(saved);
			skill.value = (0, import_cloneDeep.default)(initialSkill.value);
			viewedVersion.value = null;
			comparison.value = null;
			if (!(saved.references ?? []).some((file) => file.path === selectedPath.value)) selectedPath.value = SKILL_FILE;
		}
		watch(() => props.data.skill, (next) => {
			if (!next || !isEditing.value) return;
			showSavedSkill(next);
			if (!props.inline && props.data.initialVersionsOpen) versionsOpen.value = true;
		});
		function onRemove() {
			if (step.value === "preview") {
				if (previewSkill.value) props.data.onRemove?.(previewSkill.value.id);
				step.value = "select";
				return;
			}
			if (!props.data.skillId) return;
			props.data.onRemove?.(props.data.skillId);
			closeModal();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(resolveDynamicComponent(__props.inline ? AgentSkillInlineShell_default : AgentModalMultiStep_default), {
				open: modalOpen.value,
				step: step.value,
				title: modalTitle.value,
				"show-back": step.value === "manual" && !unref(startsManual) || step.value === "preview" || step.value === "upload" && unref(hasPicker),
				"show-footer": !unref(comparison) && (step.value === "select" || step.value === "manual" || step.value === "edit" || step.value === "preview"),
				"show-cancel": step.value !== "select" && !unref(viewedVersion),
				"cancel-label": isFormStep.value ? unref(i18n).baseText("generic.close") : void 0,
				"header-divider": isFormStep.value,
				"header-divider-tone": showPinnedBar.value ? "warning" : "default",
				"body-flush": isFormStep.value,
				"fixed-size": isFormStep.value,
				busy: isImporting.value || previewLoading.value || isSaving.value,
				size: "fit",
				"data-testid": "agent-skill-modal",
				"onUpdate:open": _cache[14] || (_cache[14] = ($event) => !$event && closeModal()),
				onBack
			}, createSlots({
				default: withCtx(() => [unref(hasPicker) ? withDirectives((openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(unref($style).picker)
				}, [createVNode(ToolsConnectionModal_default, {
					open: modalOpen.value && step.value === "select",
					items: pickerItemsWithRecommended.value,
					categories: pickerCategories.value,
					"category-labels": __props.data.projectLabel ? { project: __props.data.projectLabel } : void 0,
					"detail-item": null,
					"search-placeholder": unref(i18n).baseText("agents.builder.skills.picker.search.placeholder"),
					"empty-message": libraryLoading.value ? unref(i18n).baseText("agents.builder.skills.picker.loading") : unref(i18n).baseText("agents.builder.skills.picker.empty"),
					"no-results-message": unref(i18n).baseText("agents.builder.skills.picker.noResults"),
					"create-action": {
						label: unref(i18n).baseText("agents.builder.skills.picker.create"),
						description: unref(i18n).baseText("agents.builder.skills.picker.create.description"),
						testId: "agent-skill-picker-create"
					},
					"connect-label": (item) => unref(i18n).baseText(item.category === "recommended" ? "experiments.recommendedSkills.use" : "agents.builder.skills.picker.add"),
					"connect-aria-label": (item) => unref(i18n).baseText(item.category === "recommended" ? "experiments.recommendedSkills.useAriaLabel" : "agents.builder.skills.picker.addAriaLabel", { interpolate: { name: item.title } }),
					embedded: "",
					"show-connect-actions": "",
					"hide-empty-categories": "",
					"iconless-rows": "",
					"persistent-scrollbar": "",
					"data-testid": "agent-skill-picker",
					onConnect: onPickerItemAttach,
					onOpenDetail: onPickerItemPreview,
					onCreate: onPickerCreate
				}, {
					"row-footer": withCtx(({ item }) => [createVNode(RecommendedSkillSource_default, {
						skill: unref(recommendedSkillByPickerItemId).get(item.id),
						class: normalizeClass(unref($style).recommendedSkillSource)
					}, null, 8, ["skill", "class"])]),
					_: 1
				}, 8, [
					"open",
					"items",
					"categories",
					"category-labels",
					"search-placeholder",
					"empty-message",
					"no-results-message",
					"create-action",
					"connect-label",
					"connect-aria-label"
				])], 2)), [[vShow, step.value === "select"]]) : createCommentVNode("", true), step.value === "preview" && previewSkill.value ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(unref($style).content),
					"data-testid": "agent-skill-preview"
				}, [createVNode(AgentSkillFileNav_default, {
					skill: previewSkill.value.skill,
					"selected-path": previewPath.value,
					"read-only": "",
					onSelect: _cache[1] || (_cache[1] = ($event) => previewPath.value = $event)
				}, null, 8, ["skill", "selected-path"]), createVNode(AgentSkillViewer_default, {
					skill: previewSkill.value.skill,
					"selected-path": previewPath.value,
					"read-only": "",
					"onSelect:path": _cache[2] || (_cache[2] = ($event) => previewPath.value = $event)
				}, null, 8, ["skill", "selected-path"])], 2)) : step.value !== "select" ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
					syncedFrom.value && step.value === "edit" ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(unref($style).syncedBar),
						"data-testid": "agent-skill-synced-banner"
					}, [createVNode(unref(N8nText_default), {
						size: "small",
						class: normalizeClass(unref($style).syncedInfo)
					}, {
						default: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "git-branch",
							size: 14
						}), createVNode(unref(I18nT), {
							keypath: "settings.context.skills.synced.banner",
							scope: "global",
							tag: "span"
						}, {
							repo: withCtx(() => [createBaseVNode("a", {
								href: syncedFrom.value.webUrl,
								target: "_blank",
								rel: "noopener noreferrer",
								class: normalizeClass(unref($style).sourceLink),
								"data-testid": "agent-skill-source-link"
							}, toDisplayString(unref(sourceLineOf)(syncedFrom.value)), 11, _hoisted_1)]),
							_: 1
						})]),
						_: 1
					}, 8, ["class"])], 2)) : __props.data.readOnly ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 1,
						theme: "info",
						class: normalizeClass([unref($style).callout, isFormStep.value && unref($style).calloutInset]),
						"data-testid": "agent-skill-read-only-callout"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.readOnly")), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true),
					openedWithMissingContent.value && !isReadOnly.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 2,
						theme: "warning",
						class: normalizeClass([unref($style).callout, isFormStep.value && unref($style).calloutInset]),
						"data-testid": "agent-skill-missing-content-callout"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.missingContent.callout")), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true),
					accessWarning.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 3,
						theme: "warning",
						class: normalizeClass([unref($style).callout, isFormStep.value && unref($style).calloutInset]),
						"data-testid": "agent-skill-access-warning"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(accessWarning.value), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true),
					unref(comparison) ? (openBlock(), createElementBlock("div", {
						key: 4,
						class: normalizeClass(unref($style).compareBar),
						"data-testid": "agent-skill-compare-bar"
					}, [
						createVNode(unref(N8nIcon_default), {
							icon: "file-diff",
							size: 14
						}),
						createVNode(unref(N8nText_default), { size: "small" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.versions.compare.from")), 1)]),
							_: 1
						}),
						createVNode(unref(N8nSelect_default), {
							"model-value": unref(comparison).from,
							size: "small",
							teleported: false,
							class: normalizeClass(unref($style).compareSelect),
							"data-testid": "agent-skill-compare-from",
							"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => onCompare(Number($event), unref(comparison).to))
						}, {
							default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(versionOptions.value, (option) => {
								return openBlock(), createBlock(unref(N8nOption_default), {
									key: option.value,
									value: option.value,
									label: option.label
								}, null, 8, ["value", "label"]);
							}), 128))]),
							_: 1
						}, 8, ["model-value", "class"]),
						createVNode(unref(N8nText_default), { size: "small" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.versions.compare.to")), 1)]),
							_: 1
						}),
						createVNode(unref(N8nSelect_default), {
							"model-value": unref(comparison).to,
							size: "small",
							teleported: false,
							class: normalizeClass(unref($style).compareSelect),
							"data-testid": "agent-skill-compare-to",
							"onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => onCompare(unref(comparison).from, Number($event)))
						}, {
							default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(versionOptions.value, (option) => {
								return openBlock(), createBlock(unref(N8nOption_default), {
									key: option.value,
									value: option.value,
									label: option.label
								}, null, 8, ["value", "label"]);
							}), 128))]),
							_: 1
						}, 8, ["model-value", "class"]),
						createVNode(unref(N8nButton_default), {
							variant: "outline",
							size: "small",
							class: normalizeClass(unref($style).compareDone),
							"data-testid": "agent-skill-compare-done",
							onClick: leaveCompare
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.versions.done")), 1)]),
							_: 1
						}, 8, ["class"])
					], 2)) : showPinnedBar.value && __props.data.agentVersions ? (openBlock(), createElementBlock("div", {
						key: 5,
						class: normalizeClass(unref($style).pinnedBar),
						"data-testid": "agent-skill-pinned-bar"
					}, [
						createVNode(unref(N8nIcon_default), {
							icon: "pin",
							size: 14,
							class: normalizeClass(unref($style).pinnedIcon)
						}, null, 8, ["class"]),
						createVNode(unref(N8nText_default), {
							size: "small",
							class: normalizeClass(unref($style).pinnedText)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.versions.pinned", { interpolate: {
								agent: __props.data.agentName ?? "",
								version: __props.data.agentVersions.draft
							} })), 1)]),
							_: 1
						}, 8, ["class"]),
						__props.data.onUseLatestVersion && !versionsOpen.value ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 0,
							variant: "outline",
							size: "small",
							class: normalizeClass(unref($style).barAction),
							"data-testid": "agent-skill-pinned-use-latest",
							onClick: onUseLatestVersion
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.versions.useLatest")), 1)]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true)
					], 2)) : unref(viewedVersion) ? (openBlock(), createElementBlock("div", {
						key: 6,
						class: normalizeClass(unref($style).viewingBar),
						"data-testid": "agent-skill-viewing-version"
					}, [createVNode(unref(N8nIcon_default), {
						icon: "history",
						size: 14
					}), createVNode(unref(N8nText_default), { size: "small" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(viewingText.value), 1)]),
						_: 1
					})], 2)) : createCommentVNode("", true),
					createBaseVNode("div", { class: normalizeClass([
						unref($style).content,
						isFormStep.value && unref($style).contentFlush,
						__props.inline && unref($style).inlineContent
					]) }, [step.value === "upload" ? (openBlock(), createBlock(AgentSkillUpload_default, {
						key: 0,
						busy: isImporting.value,
						"onUpdate:busy": _cache[5] || (_cache[5] = ($event) => isImporting.value = $event),
						onUploaded: onSkillUploaded,
						onAddManually,
						"onImport:skill": onImportSkill
					}, null, 8, ["busy"])) : unref(comparison) && unref(comparedSkill) ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [createVNode(AgentSkillFileNav_default, {
						class: normalizeClass(unref($style).fileColumn),
						skill: unref(comparedSkill),
						"selected-path": selectedPath.value,
						"change-counts": unref(diffCounts),
						"read-only": "",
						onSelect: _cache[6] || (_cache[6] = ($event) => selectedPath.value = $event)
					}, null, 8, [
						"class",
						"skill",
						"selected-path",
						"change-counts"
					]), createVNode(SkillVersionDiff_default, {
						class: normalizeClass(unref($style).formColumn),
						sections: unref(diffSections),
						"selected-path": selectedPath.value
					}, null, 8, [
						"class",
						"sections",
						"selected-path"
					])], 64)) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [createVNode(AgentSkillFileNav_default, {
						class: normalizeClass(isFormStep.value && unref($style).fileColumn),
						skill: displayedSkill.value,
						"selected-path": selectedPath.value,
						"add-reference-disabled": !canAddReference.value,
						"read-only": editorLocked.value || !!unref(viewedVersion),
						"invalid-paths": visibleInvalidReferencePaths.value,
						onAddReference,
						onRemoveReference,
						onSelect: _cache[7] || (_cache[7] = ($event) => selectedPath.value = $event)
					}, null, 8, [
						"class",
						"skill",
						"selected-path",
						"add-reference-disabled",
						"read-only",
						"invalid-paths"
					]), (openBlock(), createBlock(AgentSkillViewer_default, {
						key: unref(viewedVersion)?.version ?? "latest",
						class: normalizeClass(isFormStep.value && unref($style).formColumn),
						skill: displayedSkill.value,
						"selected-path": selectedPath.value,
						disabled: editorLocked.value,
						"read-only": cannotEdit.value && !isPinned.value || !!unref(viewedVersion),
						errors: visibleErrors.value,
						"show-validation-warnings": submitted.value || openedWithMissingContent.value,
						"onSelect:path": _cache[9] || (_cache[9] = ($event) => selectedPath.value = $event),
						"onUpdate:skill": onSkillUpdate,
						"onUpdate:valid": onValidUpdate
					}, {
						"fields-start": withCtx(() => [createBaseVNode("div", {
							ref_key: "nameField",
							ref: nameField
						}, [createVNode(unref(N8nFormInput_default), {
							"model-value": skill.value.name,
							label: unref(i18n).baseText("agents.builder.skills.name.label"),
							name: "skill-name",
							required: "",
							"label-size": "small",
							maxlength: 128,
							placeholder: unref(i18n).baseText("agents.builder.skills.name.placeholder"),
							disabled: editorLocked.value,
							"data-testid": "agent-skill-name-input",
							"onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => onSkillUpdate({ name: String($event ?? "") }))
						}, null, 8, [
							"model-value",
							"label",
							"placeholder",
							"disabled"
						]), visibleNameError.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							size: "small",
							color: "danger",
							"data-testid": "agent-skill-name-error"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(visibleNameError.value), 1)]),
							_: 1
						})) : createCommentVNode("", true)], 512)]),
						_: 1
					}, 8, [
						"class",
						"skill",
						"selected-path",
						"disabled",
						"read-only",
						"errors",
						"show-validation-warnings"
					]))], 64))], 2)
				], 64)) : createCommentVNode("", true)]),
				_: 2
			}, [
				showScopeBadge.value && selectedScope.value ? {
					name: "titlePrefix",
					fn: withCtx(() => [createVNode(unref(N8nTooltip_default), {
						disabled: scopeEditable.value || !__props.data.scopeLockedReason,
						content: __props.data.scopeLockedReason,
						placement: "bottom"
					}, {
						default: withCtx(() => [createVNode(SkillScopeBadge_default, {
							skill: selectedScopeSkill.value,
							label: selectedScope.value.label,
							"data-testid": "agent-skill-scope-badge"
						}, null, 8, ["skill", "label"])]),
						_: 1
					}, 8, ["disabled", "content"])]),
					key: "0"
				} : void 0,
				isFormStep.value && headerMenuItems.value.length > 0 ? {
					name: "titleSuffix",
					fn: withCtx(() => [createVNode(unref(DropdownMenu_default), {
						items: headerMenuItems.value,
						placement: "bottom-start",
						teleported: false,
						onSelect: onHeaderMenuSelect
					}, {
						trigger: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							variant: "ghost",
							size: "small",
							icon: "ellipsis",
							"aria-label": unref(i18n).baseText("generic.more"),
							"data-testid": "agent-skill-header-menu"
						}, null, 8, ["aria-label"])]),
						"item-label": withCtx(({ item, ui }) => [item.checkbox ? (openBlock(), createElementBlock("span", {
							key: 0,
							class: normalizeClass([ui.class, unref($style).menuSwitchRow])
						}, [createBaseVNode("span", null, [createTextVNode(toDisplayString(item.label) + " ", 1), item.id === "mcp" ? (openBlock(), createBlock(unref(N8nTooltip_default), {
							key: 0,
							content: unref(i18n).baseText("settings.context.skills.modal.mcp.tooltip")
						}, {
							default: withCtx(() => [createVNode(unref(N8nIcon_default), {
								icon: "circle-help",
								size: "small",
								"data-testid": "skill-available-to-mcp-help"
							})]),
							_: 1
						}, 8, ["content"])) : createCommentVNode("", true)])], 2)) : item.id === "delete" && __props.data.deleteDisabledReason ? (openBlock(), createBlock(unref(N8nTooltip_default), {
							key: 1,
							content: __props.data.deleteDisabledReason,
							placement: "right"
						}, {
							default: withCtx(() => [createBaseVNode("span", {
								class: normalizeClass(ui.class),
								"data-testid": "agent-skill-menu-delete-reason"
							}, toDisplayString(item.label), 3)]),
							_: 2
						}, 1032, ["content"])) : (openBlock(), createElementBlock("span", {
							key: 2,
							class: normalizeClass(ui.class)
						}, toDisplayString(item.label), 3))]),
						"item-trailing": withCtx(({ item }) => [item.checkbox ? (openBlock(), createBlock(unref(N8nSwitch_default), {
							key: 0,
							"model-value": item.checked,
							disabled: item.disabled,
							class: normalizeClass(unref($style).menuSwitch),
							tabindex: "-1",
							"aria-hidden": "true",
							"data-testid": menuSwitchTestIds[item.id]
						}, null, 8, [
							"model-value",
							"disabled",
							"class",
							"data-testid"
						])) : createCommentVNode("", true)]),
						_: 1
					}, 8, ["items"])]),
					key: "1"
				} : void 0,
				isFormStep.value && latestVersion.value ? {
					name: "headerActions",
					fn: withCtx(() => [latestVersion.value ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						variant: "ghost",
						size: "small",
						class: normalizeClass(versionsOpen.value && unref($style).versionsButtonActive),
						"aria-pressed": versionsOpen.value,
						"aria-label": unref(i18n).baseText("agents.builder.skills.versions.toggle"),
						"data-testid": "agent-skill-versions-button",
						onClick: _cache[0] || (_cache[0] = ($event) => versionsOpen.value = !versionsOpen.value)
					}, {
						icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "history",
							size: 16
						})]),
						default: withCtx(() => [createTextVNode(" " + toDisplayString(versionsButtonLabel.value), 1)]),
						_: 1
					}, 8, [
						"class",
						"aria-pressed",
						"aria-label"
					])) : createCommentVNode("", true)]),
					key: "2"
				} : void 0,
				showVersionsPanel.value && unref(versions) ? {
					name: "sidePanel",
					fn: withCtx(() => [createVNode(SkillVersionTimeline_default, {
						versions: unref(versions),
						"shown-version": unref(viewedVersion)?.version ?? baseVersion.value,
						"can-restore": canRestore.value,
						onOpen: onOpenVersion,
						onRestore: restoreVersion,
						onCompare: _cache[10] || (_cache[10] = ($event) => onCompare($event, unref(viewedVersion)?.version ?? baseVersion.value ?? versionOptions.value[0].value)),
						agent: timelineAgent.value,
						onUse: useVersion,
						onUseLatest: onUseLatestVersion
					}, null, 8, [
						"versions",
						"shown-version",
						"can-restore",
						"agent"
					])]),
					key: "3"
				} : void 0,
				showRemove.value ? {
					name: "footerLeft",
					fn: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "ghost",
						"data-testid": "agent-skill-remove",
						onClick: onRemove
					}, {
						icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: __props.data.skillRefsEnabled ? "unlink" : "trash-2",
							size: 16
						}, null, 8, ["icon"])]),
						default: withCtx(() => [createTextVNode(" " + toDisplayString(removeLabel.value), 1)]),
						_: 1
					})]),
					key: "4"
				} : step.value === "select" ? {
					name: "footerLeft",
					fn: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "ghost",
						"data-testid": "agent-skill-picker-manage",
						onClick: onManageSkills
					}, {
						icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "settings",
							size: 16
						})]),
						default: withCtx(() => [createTextVNode(" " + toDisplayString(unref(i18n).baseText("agents.builder.skills.picker.manage")), 1)]),
						_: 1
					})]),
					key: "5"
				} : void 0,
				footerHint.value ? {
					name: "footerBeforeCancel",
					fn: withCtx(() => [createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-light",
						class: normalizeClass(unref($style).footerHint),
						"data-testid": "agent-skill-footer-hint"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(footerHint.value), 1)]),
						_: 1
					}, 8, ["class"])]),
					key: "6"
				} : void 0,
				footerPrimaryAction.value ? {
					name: "footerActions",
					fn: withCtx(() => [footerPrimaryAction.value === "add" ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						variant: "solid",
						"data-testid": "agent-skill-preview-add",
						onClick: onPreviewAdd
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.picker.add")), 1)]),
						_: 1
					})) : footerPrimaryAction.value === "viewing" && unref(viewedVersion) ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
						createVNode(unref(N8nButton_default), {
							variant: "outline",
							"data-testid": "agent-skill-version-done",
							onClick: _cache[11] || (_cache[11] = ($event) => viewedVersion.value = null)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.versions.done")), 1)]),
							_: 1
						}),
						timelineAgent.value && unref(viewedVersion).version !== timelineAgent.value.draft ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 0,
							variant: "outline",
							"data-testid": "agent-skill-version-use",
							onClick: _cache[12] || (_cache[12] = ($event) => useVersion(unref(viewedVersion).version))
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.versions.useVersionIn", { interpolate: {
								version: unref(viewedVersion).version,
								agent: timelineAgent.value.name
							} })), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						canRestore.value && unref(viewedVersion).version !== unref(versions)?.[0]?.version ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 1,
							variant: "solid",
							loading: isSaving.value,
							"data-testid": "agent-skill-version-restore",
							onClick: _cache[13] || (_cache[13] = ($event) => restoreVersion(unref(viewedVersion).version))
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.versions.restore")), 1)]),
							_: 1
						}, 8, ["loading"])) : createCommentVNode("", true)
					], 64)) : footerPrimaryAction.value === "useLatest" ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 2,
						variant: "solid",
						"data-testid": "agent-skill-use-latest",
						onClick: onUseLatestVersion
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.useLatest")), 1)]),
						_: 1
					})) : (openBlock(), createBlock(unref(N8nButton_default), {
						key: 3,
						variant: "solid",
						disabled: !hasChanges.value || defaultNameLoading.value || !!accessWarning.value || isPinned.value,
						loading: isSaving.value,
						"data-testid": "agent-skill-create-save",
						onClick: onSave
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.skills.save")), 1)]),
						_: 1
					}, 8, ["disabled", "loading"]))]),
					key: "7"
				} : void 0
			]), 1064, [
				"open",
				"step",
				"title",
				"show-back",
				"show-footer",
				"show-cancel",
				"cancel-label",
				"header-divider",
				"header-divider-tone",
				"body-flush",
				"fixed-size",
				"busy"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_1w7o3_2",
	picker: "_picker_1w7o3_9",
	callout: "_callout_1w7o3_14",
	menuItem: "_menuItem_1w7o3_19",
	deleteItem: "_deleteItem_1w7o3_23",
	menuSwitchRow: "_menuSwitchRow_1w7o3_31",
	menuSwitch: "_menuSwitch_1w7o3_31",
	pinnedBar: "_pinnedBar_1w7o3_46",
	pinnedIcon: "_pinnedIcon_1w7o3_56",
	pinnedText: "_pinnedText_1w7o3_61",
	barAction: "_barAction_1w7o3_65",
	viewingBar: "_viewingBar_1w7o3_70",
	compareBar: "_compareBar_1w7o3_80",
	syncedBar: "_syncedBar_1w7o3_81",
	syncedInfo: "_syncedInfo_1w7o3_94",
	sourceLink: "_sourceLink_1w7o3_102",
	compareSelect: "_compareSelect_1w7o3_108",
	compareDone: "_compareDone_1w7o3_112",
	versionsButtonActive: "_versionsButtonActive_1w7o3_116",
	calloutInset: "_calloutInset_1w7o3_121",
	contentFlush: "_contentFlush_1w7o3_127",
	fileColumn: "_fileColumn_1w7o3_135",
	formColumn: "_formColumn_1w7o3_139",
	footerHint: "_footerHint_1w7o3_144",
	inlineContent: "_inlineContent_1w7o3_149",
	recommendedSkillSource: "_recommendedSkillSource_1w7o3_160"
} }]]);
//#endregion
export { AgentSkillModal_default as t };
