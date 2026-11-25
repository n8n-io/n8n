import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, If as isRef, Iu as useEventListener, Jd as defineComponent, Kd as createVNode, Md as withKeys, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Od as useCssModule, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Vu as useLocalStorage, Xf as unref, Xo as useRouter, Yo as useRoute, Zd as h, _p as normalizeClass, bf as useId, ff as openBlock, hf as renderSlot, if as nextTick, ip as init_shared_esm_bundler, ka as validate, lf as onMounted, mf as renderList, nf as mergeModels, of as onBeforeUnmount, pd as useDebounceFn, xf as useModel, xr as require_FileSaver_min, zd as createBaseVNode, zu as useFocus } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, CT as skillSourceDeleteBlockSchema, Cm as useRBACStore, DN as __vitePreload, EM as Select_default, Hj as SettingsPageHeader_default, JA as DialogHeader_default, Jg as useUIStore, KA as Dialog_default, KT as MCP_SKILLS_EXTENSION_FLAG, Kd as useDocumentTitle, LM as N8nCallout_default, Mp as useCredentialsStore, Mw as ResponseError, NM as N8nCard_default, Nj as N8nPopover_default, Or as useCredentialOAuth, Os as toSortOption, PA as useMessage, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, ST as isGitHubSkillSourceCredentialType, UA as DialogFooter_default, Uj as SettingsLayout_default, WA as DialogBody_default, XM as N8nActionDropdown_default, XT as skillScopeSchema, YM as N8nActionToggle_default, YT as SKILL_SYNC_FLAG, ZA as isRecord, _C as useUsersStore, _M as Checkbox_default, _N as N8nText_default, bN as N8nSpinner_default, cN as Input_default, dC as useToast, dM as N8nSwitch_default, eC as DEBOUNCE_TIME, ej as N8nDataTableServer_default, fC as VIEWS, fN as N8nTooltip_default, gM as N8nInputLabel_default, gs as canWriteInstanceSkillScope, hC as useTelemetry, hM as N8nLink_default, jN as useI18n, js as PREFERENCES_PAGE_SIZES, kA as Combobox_default, kh as AGENT_BUILDER_VIEW, ks as CONTEXT_DEFAULT_SORT_BY, mM as N8nOption_default, nD as getResourcePermissions, nN as N8nBadge_default, oh as AGENT_SKILL_MODAL_KEY, oj as N8nUserInfo_default, pM as N8nSelect_default, qA as DialogTitle_default, qT as SKILLS_SORT_OPTIONS, vm as useProjectsStore, vs as canWriteProjectSkillScope, vy as usePostHog, wT as skillSourceMovePreviewSchema, wj as N8nStatusDot_default, ws as preferenceUserName, wy as TELEMETRY_EVENT, xN as N8nIcon_default, xs as keepSortOnClear, yC as useSettingsStore, yN as N8nButton_default, yj as Tabs_default, yu as TimeAgo_default, yy as getDebounceTime, zj as EnterpriseReadinessBadge_default } from "./app-D5flEmb-.js";
import { t as ResourceFiltersDropdown_default } from "./ResourceFiltersDropdown-BQigtASg.js";
import { t as useLatestFetch } from "./useLatestFetch-Bxfz-zbp.js";
import { t as NodeDiff_default } from "./NodeDiff-Bzmpe6a_.js";
import { n as isSkillNameTakenError } from "./agentSkill-Czni3bZ7.js";
import { i as stringify, r as useAgentSkillImport, t as AgentSkillImportError } from "./useAgentSkillImport-d0K9dNXY.js";
import { a as groupByFolder, c as SkillScopeBadge_default, d as useSkillDeleteRule, f as useSkillScopeDisplay, i as RECOMMENDED_SKILLS, l as PROJECT_SCOPE_PREFIX, n as useRecommendedSkillLoader, o as isSelectableSkill, p as useSkillSourceReasons, r as useRecommendedSkillsExperiment, s as sourceLineOf, t as RecommendedSkillSource_default, u as parseScope } from "./RecommendedSkillSource-Br4SYoOJ.js";
import { t as useAssistantSkillsExperiment } from "./useAssistantSkillsExperiment-BQ2ngIhp.js";
import { t as useSkillsStore } from "./skills.store-DN2vnurm.js";
//#region src/experiments/recommendedSkills/components/RecommendedSkillCards.vue?vue&type=script&setup=true&lang.ts
var import_FileSaver_min = /* @__PURE__ */ __toESM(require_FileSaver_min(), 1);
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var RecommendedSkillCards_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RecommendedSkillCards",
	props: { entryPoint: {} },
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const { addedSkillIds, trackCardsShown } = useRecommendedSkillsExperiment();
		const { loadingId, loadRecommendedSkill } = useRecommendedSkillLoader();
		async function selectSkill(recommended) {
			const skill = await loadRecommendedSkill(recommended);
			if (skill) emit("select", {
				id: recommended.id,
				skill
			});
		}
		onMounted(() => {
			trackCardsShown(props.entryPoint);
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("ul", {
				class: normalizeClass(_ctx.$style.grid),
				"data-test-id": "recommended-skill-cards"
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(RECOMMENDED_SKILLS), (recommended) => {
				return openBlock(), createElementBlock("li", { key: recommended.id }, [createVNode(unref(N8nCard_default), {
					class: normalizeClass(_ctx.$style.card),
					"data-test-id": `recommended-skill-${recommended.id}`
				}, {
					header: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.name) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.icon) }, [createVNode(unref(N8nIcon_default), {
						icon: recommended.icon,
						size: "small"
					}, null, 8, ["icon"])], 2), createVNode(unref(N8nText_default), {
						bold: "",
						color: "text-dark"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(recommended.name), 1)]),
						_: 2
					}, 1024)], 2), __props.entryPoint === "create_menu" && unref(addedSkillIds).includes(recommended.id) ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						class: normalizeClass(_ctx.$style.added),
						size: "small",
						color: "success",
						"data-test-id": "recommended-skill-added"
					}, {
						default: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "check",
							size: "small"
						}), createTextVNode(" " + toDisplayString(unref(i18n).baseText("tools.connection.action.added")), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)]),
					footer: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "outline",
						size: "small",
						loading: unref(loadingId) === recommended.id,
						"data-test-id": "recommended-skill-use-button",
						"data-attr": `recommended-skill-use-${recommended.id}`,
						onClick: ($event) => selectSkill(recommended)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("experiments.recommendedSkills.use")), 1)]),
						_: 1
					}, 8, [
						"loading",
						"data-attr",
						"onClick"
					])]),
					default: withCtx(() => [createVNode(unref(N8nText_default), {
						tag: "p",
						size: "small",
						color: "text-base",
						class: normalizeClass(_ctx.$style.cardText)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(recommended.cardTextKey)), 1)]),
						_: 2
					}, 1032, ["class"]), createVNode(RecommendedSkillSource_default, {
						skill: recommended,
						class: normalizeClass(_ctx.$style.source)
					}, null, 8, ["skill", "class"])]),
					_: 2
				}, 1032, ["class", "data-test-id"])]);
			}), 128))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	grid: "_grid_vr17z_1",
	card: "_card_vr17z_12",
	name: "_name_vr17z_17",
	icon: "_icon_vr17z_23",
	added: "_added_vr17z_34",
	cardText: "_cardText_vr17z_41",
	source: "_source_vr17z_46"
} }]]);
//#endregion
//#region src/experiments/recommendedSkills/components/RecommendedSkillsDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var RecommendedSkillsDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RecommendedSkillsDialog",
	props: {
		"open": {
			type: Boolean,
			required: true
		},
		"openModifiers": {}
	},
	emits: /*@__PURE__*/ mergeModels(["select"], ["update:open"]),
	setup(__props, { emit: __emit }) {
		const open = useModel(__props, "open");
		const emit = __emit;
		const i18n = useI18n();
		function onSelect(recommended) {
			open.value = false;
			emit("select", recommended);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: open.value,
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => open.value = $event),
				size: "full",
				"container-class": _ctx.$style.dialog,
				header: unref(i18n).baseText("experiments.recommendedSkills.dialog.title"),
				"data-test-id": "recommended-skills-dialog"
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), { class: normalizeClass(_ctx.$style.body) }, {
					default: withCtx(() => [createVNode(unref(N8nText_default), {
						tag: "p",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("experiments.recommendedSkills.description")), 1)]),
						_: 1
					}), open.value ? (openBlock(), createBlock(RecommendedSkillCards_default, {
						key: 0,
						"entry-point": "create_menu",
						onSelect
					})) : createCommentVNode("", true)]),
					_: 1
				}, 8, ["class"])]),
				_: 1
			}, 8, [
				"open",
				"container-class",
				"header"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	dialog: "_dialog_rnt5e_2",
	body: "_body_rnt5e_6"
} }]]);
//#endregion
//#region src/features/agents/utils/agentSkillExport.ts
var SKILL_FILE_NAME = "SKILL.md";
/** The SKILL.md text that the skill upload reads back: YAML frontmatter, then the instructions. */
function agentSkillToMarkdown(skill) {
	return `---\n${stringify({
		name: skill.name,
		description: skill.description
	})}---\n\n${skill.instructions.trim()}\n`;
}
/**
* A lone SKILL.md, or a zip with a `<name>/` folder when the skill has reference files.
* The upload reads the SKILL.md, or the folder once the zip is unzipped.
*/
async function exportAgentSkill(skill) {
	const markdown = agentSkillToMarkdown(skill);
	const safeName = skill.name.trim().replace(/[\\/:*?"<>|]+/g, "-");
	const baseName = /^\.*$/.test(safeName) ? "skill" : safeName;
	const references = skill.references ?? [];
	if (references.length === 0) return {
		blob: new Blob([markdown], { type: "text/markdown" }),
		fileName: SKILL_FILE_NAME,
		format: "markdown"
	};
	const { strToU8, zipSync } = await __vitePreload(async () => {
		const { strToU8, zipSync } = await import("./browser-CGZJ8s6i.js");
		return {
			strToU8,
			zipSync
		};
	}, []);
	const files = { [`${baseName}/${SKILL_FILE_NAME}`]: strToU8(markdown) };
	for (const reference of references) files[`${baseName}/${reference.path}`] = strToU8(reference.content);
	return {
		blob: new Blob([zipSync(files)], { type: "application/zip" }),
		fileName: `${baseName}.zip`,
		format: "zip"
	};
}
//#endregion
//#region src/features/settings/context/components/SkillSourceMoveDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$7 = ["id", "for"];
var _hoisted_2$3 = ["id", "for"];
var _hoisted_3$3 = ["href"];
var NONE = "__none__";
var SkillSourceMoveDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SkillSourceMoveDialog",
	props: {
		open: { type: Boolean },
		source: {},
		scopeOptions: {}
	},
	emits: ["update:open", "moved"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const router = useRouter();
		const skillsStore = useSkillsStore();
		const scope = ref("");
		const credentialId = ref("");
		const credentials = ref([]);
		const preview = ref(null);
		const checking = ref(false);
		const loadingCredentials = ref(false);
		const moving = ref(false);
		const error = ref("");
		const credentialError = ref(false);
		const previewFetch = useLatestFetch();
		const credentialsFetch = useLatestFetch();
		const scopeLabelId = useId();
		const credentialLabelId = useId();
		const scopeItems = computed(() => props.scopeOptions.filter((option) => option.value !== (props.source.projectId ? `${PROJECT_SCOPE_PREFIX}${props.source.projectId}` : "instance")));
		const destinationLabel = computed(() => scopeItems.value.find(({ value }) => value === scope.value)?.label ?? scope.value);
		const currentScope = computed(() => ({
			scope: props.source.projectId ? "project" : "instance",
			projectId: props.source.projectId,
			projectName: props.source.projectName,
			projectType: props.source.projectType,
			projectIcon: props.source.projectIcon
		}));
		const credentialItems = computed(() => [{
			value: NONE,
			label: i18n.baseText("settings.context.skills.moveSource.credential.none")
		}, ...credentials.value.map(({ id, name }) => ({
			value: id,
			label: name
		}))]);
		const canMove = computed(() => !!scope.value && preview.value?.canMove && !checking.value && !moving.value);
		function payload() {
			return {
				...parseScope(scope.value),
				fromProjectId: props.source.projectId,
				...credentialId.value ? { credentialId: credentialId.value } : {}
			};
		}
		async function validate() {
			const isLatest = previewFetch.next();
			preview.value = null;
			if (!props.open || !scope.value) {
				checking.value = false;
				return;
			}
			checking.value = true;
			error.value = "";
			try {
				const result = await skillsStore.previewSourceMove(props.source.id, payload());
				if (isLatest() && props.open) preview.value = result;
			} catch (cause) {
				if (isLatest() && props.open) error.value = cause instanceof Error ? cause.message : i18n.baseText("settings.context.skills.moveSource.error");
			} finally {
				if (isLatest()) checking.value = false;
			}
		}
		async function loadCredentials() {
			const isLatest = credentialsFetch.next();
			if (!props.open || !scope.value) {
				loadingCredentials.value = false;
				return;
			}
			loadingCredentials.value = true;
			credentialError.value = false;
			try {
				const result = await skillsStore.fetchSourceCredentials(parseScope(scope.value));
				if (isLatest() && props.open) credentials.value = result;
			} catch {
				if (isLatest() && props.open) credentialError.value = true;
			} finally {
				if (isLatest()) loadingCredentials.value = false;
			}
		}
		watch(() => [props.open, props.source.id], () => {
			previewFetch.invalidate();
			credentialsFetch.invalidate();
			scope.value = "";
			credentialId.value = "";
			preview.value = null;
			credentials.value = [];
			error.value = "";
			credentialError.value = false;
			checking.value = false;
			loadingCredentials.value = false;
		}, { immediate: true });
		watch(scope, () => {
			credentialId.value = "";
			credentials.value = [];
			loadCredentials();
		});
		watch([scope, credentialId], () => {
			validate();
		});
		function recheck() {
			if (!props.open || moving.value) return;
			loadCredentials();
			validate();
		}
		useEventListener(window, "focus", recheck);
		function skillHref(skillId) {
			return router.resolve({ query: { skillId } }).href;
		}
		async function move() {
			if (!canMove.value) return;
			moving.value = true;
			error.value = "";
			try {
				await skillsStore.moveSource(props.source.id, payload());
				emit("moved", props.source.id);
				emit("update:open", false);
			} catch (cause) {
				const submitted = skillSourceMovePreviewSchema.safeParse(cause instanceof ResponseError ? cause.meta?.preview : void 0);
				if (submitted.success) {
					previewFetch.invalidate();
					preview.value = submitted.data;
				} else await validate();
				if (!preview.value || preview.value.canMove) error.value = cause instanceof Error ? cause.message : i18n.baseText("settings.context.skills.moveSource.error");
			} finally {
				moving.value = false;
			}
		}
		function focusSelect(id) {
			document.getElementById(id)?.focus();
		}
		function close(open) {
			if (!moving.value) emit("update:open", open);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.open,
				header: unref(i18n).baseText("settings.context.skills.moveSource.action"),
				size: "large",
				"data-test-id": "skill-source-move-dialog",
				"onUpdate:open": close
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), { class: normalizeClass(_ctx.$style.body) }, {
					default: withCtx(() => [
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.sourceSummary) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.entity) }, [createVNode(unref(N8nIcon_default), {
							icon: "git-branch",
							size: "medium"
						}), createVNode(unref(N8nText_default), {
							bold: true,
							class: normalizeClass(_ctx.$style.entityName)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(__props.source.label), 1)]),
							_: 1
						}, 8, ["class"])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.currentScope) }, [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.currentScope")), 1)]),
							_: 1
						}), createVNode(SkillScopeBadge_default, { skill: currentScope.value }, null, 8, ["skill"])], 2)], 2),
						createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.description")), 1)]),
							_: 1
						}),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [createBaseVNode("label", {
							id: unref(scopeLabelId),
							for: `${unref(scopeLabelId)}-select`,
							onClick: _cache[0] || (_cache[0] = withModifiers(($event) => focusSelect(`${unref(scopeLabelId)}-select`), ["prevent"]))
						}, [createVNode(unref(N8nText_default), { bold: true }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.connect.scope.label")), 1)]),
							_: 1
						})], 8, _hoisted_1$7), createVNode(unref(Select_default), {
							id: `${unref(scopeLabelId)}-select`,
							"aria-labelledby": unref(scopeLabelId),
							"model-value": scope.value,
							"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => scope.value = String($event ?? "")),
							items: scopeItems.value,
							disabled: moving.value,
							placeholder: unref(i18n).baseText("settings.context.skills.moveSource.scope.placeholder"),
							"data-test-id": "source-move-scope"
						}, null, 8, [
							"id",
							"aria-labelledby",
							"model-value",
							"items",
							"disabled",
							"placeholder"
						])], 2),
						scopeItems.value.length === 0 ? (openBlock(), createBlock(unref(N8nText_default), { key: 0 }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.noScopes")), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						scope.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
							createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [createBaseVNode("label", {
								id: unref(credentialLabelId),
								for: `${unref(credentialLabelId)}-select`,
								onClick: _cache[2] || (_cache[2] = withModifiers(($event) => focusSelect(`${unref(credentialLabelId)}-select`), ["prevent"]))
							}, [createVNode(unref(N8nText_default), { bold: true }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.connect.credential.label")), 1)]),
								_: 1
							})], 8, _hoisted_2$3), createVNode(unref(Select_default), {
								id: `${unref(credentialLabelId)}-select`,
								"aria-labelledby": unref(credentialLabelId),
								"model-value": credentialId.value || NONE,
								items: credentialItems.value,
								disabled: moving.value || loadingCredentials.value,
								"data-test-id": "source-move-credential",
								"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => credentialId.value = $event === NONE ? "" : String($event ?? ""))
							}, null, 8, [
								"id",
								"aria-labelledby",
								"model-value",
								"items",
								"disabled"
							])], 2),
							checking.value ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 0,
								role: "status"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.checking")), 1)]),
								_: 1
							})) : createCommentVNode("", true),
							credentialError.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
								key: 1,
								theme: "danger"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.credential.error")), 1)]),
								_: 1
							})) : createCommentVNode("", true),
							preview.value ? (openBlock(), createElementBlock("div", {
								key: 2,
								"aria-live": "polite",
								class: normalizeClass(_ctx.$style.results)
							}, [
								preview.value.credential.reason ? (openBlock(), createBlock(unref(N8nCallout_default), {
									key: 0,
									theme: "warning",
									icon: "key-round"
								}, {
									default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.message) }, [createBaseVNode("strong", null, toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.credential.title")), 1), createBaseVNode("span", null, toDisplayString(unref(i18n).baseText(preview.value.credential.reason === "credential_missing" ? "settings.context.skills.moveSource.credential.required" : "settings.context.skills.moveSource.credential.ineligible")), 1)], 2)]),
									_: 1
								})) : createCommentVNode("", true),
								preview.value.duplicate.kind === "blocked" ? (openBlock(), createBlock(unref(N8nCallout_default), {
									key: 1,
									theme: "danger",
									icon: "git-branch"
								}, {
									default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.message) }, [createBaseVNode("strong", null, toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.duplicateTitle")), 1), createBaseVNode("span", null, toDisplayString(unref(i18n).baseText(preview.value.duplicate.where === "global" ? "settings.context.skills.moveSource.duplicateGlobal" : "settings.context.skills.moveSource.duplicate", { interpolate: {
										source: __props.source.label,
										scope: preview.value.duplicate.where === "global" ? unref(i18n).baseText("settings.context.skills.scope.instance") : destinationLabel.value
									} })), 1)], 2)]),
									_: 1
								})) : createCommentVNode("", true),
								preview.value.duplicate.kind === "warning" ? (openBlock(), createBlock(unref(N8nCallout_default), {
									key: 2,
									theme: "warning",
									icon: "git-branch"
								}, {
									default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.message) }, [createBaseVNode("strong", null, toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.duplicateWarning")), 1), createBaseVNode("div", { class: normalizeClass(_ctx.$style.entities) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(preview.value.duplicate.projects, (project) => {
										return openBlock(), createBlock(unref(N8nBadge_default), {
											key: project.id,
											"leading-icon": "layers"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(project.name), 1)]),
											_: 2
										}, 1024);
									}), 128))], 2)], 2)]),
									_: 1
								})) : createCommentVNode("", true),
								preview.value.nameConflicts.length ? (openBlock(), createElementBlock("section", {
									key: 3,
									class: normalizeClass(_ctx.$style.conflict),
									"data-test-id": "source-move-name-conflicts"
								}, [
									createVNode(unref(N8nCallout_default), {
										theme: "danger",
										"round-corners": false,
										"only-bottom-border": ""
									}, {
										default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.message) }, [createBaseVNode("strong", null, toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.nameConflicts.title")), 1), createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.nameConflicts")), 1)], 2)]),
										_: 1
									}),
									createBaseVNode("ul", { class: normalizeClass(_ctx.$style.conflictList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(preview.value.nameConflicts, (conflict, index) => {
										return openBlock(), createElementBlock("li", {
											key: index,
											class: normalizeClass(_ctx.$style.conflictRow)
										}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.conflictEntity) }, [createVNode(unref(N8nText_default), {
											size: "small",
											color: "text-light"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.movingSkill")), 1)]),
											_: 1
										}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.entity) }, [createVNode(unref(N8nIcon_default), {
											icon: "book-open",
											size: "small"
										}), createVNode(unref(N8nText_default), { class: normalizeClass(_ctx.$style.entityName) }, {
											default: withCtx(() => [createTextVNode(toDisplayString(conflict.moving.name ?? unref(i18n).baseText("settings.context.skills.moveSource.hiddenSkill")), 1)]),
											_: 2
										}, 1032, ["class"])], 2)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.conflictEntity) }, [createVNode(unref(N8nText_default), {
											size: "small",
											color: "text-light"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.existingSkill", { interpolate: { scope: destinationLabel.value } })), 1)]),
											_: 1
										}), conflict.existing ? (openBlock(), createElementBlock("a", {
											key: 0,
											href: skillHref(conflict.existing.id),
											target: "_blank",
											rel: "noopener noreferrer",
											class: normalizeClass([_ctx.$style.entity, _ctx.$style.skillLink]),
											"data-test-id": "source-move-existing-skill"
										}, [
											createVNode(unref(N8nIcon_default), {
												icon: "book-open",
												size: "small"
											}),
											createBaseVNode("span", { class: normalizeClass(_ctx.$style.entityName) }, toDisplayString(conflict.existing.name), 3),
											createVNode(unref(N8nIcon_default), {
												icon: "external-link",
												size: "small"
											})
										], 10, _hoisted_3$3)) : (openBlock(), createBlock(unref(N8nText_default), { key: 1 }, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.hiddenSkill")), 1)]),
											_: 1
										}))], 2)], 2);
									}), 128))], 2),
									createVNode(unref(N8nText_default), {
										class: normalizeClass(_ctx.$style.conflictHint),
										size: "small",
										color: "text-light"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.syncedNames")), 1)]),
										_: 1
									}, 8, ["class"])
								], 2)) : createCommentVNode("", true),
								preview.value.usageConflicts.length ? (openBlock(), createElementBlock("section", {
									key: 4,
									class: normalizeClass(_ctx.$style.conflict),
									"data-test-id": "source-move-agent-conflicts"
								}, [createVNode(unref(N8nCallout_default), {
									theme: "danger",
									"round-corners": false,
									"only-bottom-border": ""
								}, {
									default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.message) }, [createBaseVNode("strong", null, toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.agentConflicts.title")), 1), createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.agentConflicts")), 1)], 2)]),
									_: 1
								}), createBaseVNode("ul", { class: normalizeClass(_ctx.$style.conflictList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(preview.value.usageConflicts, (conflict) => {
									return openBlock(), createElementBlock("li", {
										key: conflict.skill.id,
										class: normalizeClass(_ctx.$style.conflictRow)
									}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.conflictEntity) }, [createVNode(unref(N8nText_default), {
										size: "small",
										color: "text-light"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.movingSkill")), 1)]),
										_: 1
									}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.entity) }, [createVNode(unref(N8nIcon_default), {
										icon: "book-open",
										size: "small"
									}), createVNode(unref(N8nText_default), { class: normalizeClass(_ctx.$style.entityName) }, {
										default: withCtx(() => [createTextVNode(toDisplayString(conflict.skill.name ?? unref(i18n).baseText("settings.context.skills.moveSource.hiddenSkill")), 1)]),
										_: 2
									}, 1032, ["class"])], 2)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.conflictEntity) }, [createVNode(unref(N8nText_default), {
										size: "small",
										color: "text-light"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.usedBy")), 1)]),
										_: 1
									}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.entities) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(conflict.agents, (agent) => {
										return openBlock(), createBlock(unref(N8nBadge_default), {
											key: agent.id,
											"leading-icon": "bot"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(agent.name), 1)]),
											_: 2
										}, 1024);
									}), 128)), conflict.hiddenAgents ? (openBlock(), createBlock(unref(N8nText_default), {
										key: 0,
										size: "small",
										color: "text-light"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.hiddenAgents", {
											interpolate: { count: conflict.hiddenAgents },
											adjustToNumber: conflict.hiddenAgents
										})), 1)]),
										_: 2
									}, 1024)) : createCommentVNode("", true)], 2)], 2)], 2);
								}), 128))], 2)], 2)) : createCommentVNode("", true)
							], 2)) : createCommentVNode("", true)
						], 64)) : createCommentVNode("", true),
						error.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 2,
							theme: "danger",
							role: "alert"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(error.value), 1)]),
							_: 1
						})) : createCommentVNode("", true)
					]),
					_: 1
				}, 8, ["class"]), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [
						createVNode(unref(N8nButton_default), {
							variant: "ghost",
							disabled: moving.value,
							onClick: _cache[4] || (_cache[4] = ($event) => close(false))
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.cancel")), 1)]),
							_: 1
						}, 8, ["disabled"]),
						scope.value ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 0,
							variant: "ghost",
							disabled: moving.value || checking.value,
							"data-test-id": "source-move-recheck",
							onClick: recheck
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.recheck")), 1)]),
							_: 1
						}, 8, ["disabled"])) : createCommentVNode("", true),
						createVNode(unref(N8nButton_default), {
							disabled: !canMove.value,
							loading: moving.value,
							"data-test-id": "source-move-submit",
							"data-attr": "source-move-submit",
							onClick: move
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.moveSource.action")), 1)]),
							_: 1
						}, 8, ["disabled", "loading"])
					]),
					_: 1
				})]),
				_: 1
			}, 8, ["open", "header"]);
		};
	}
}), [["__cssModules", { "$style": {
	body: "_body_1uqbt_113",
	results: "_results_1uqbt_114",
	field: "_field_1uqbt_120",
	sourceSummary: "_sourceSummary_1uqbt_126",
	conflict: "_conflict_1uqbt_127",
	currentScope: "_currentScope_1uqbt_142",
	entity: "_entity_1uqbt_143",
	entities: "_entities_1uqbt_144",
	entityName: "_entityName_1uqbt_164",
	message: "_message_1uqbt_169",
	conflictEntity: "_conflictEntity_1uqbt_170",
	conflictList: "_conflictList_1uqbt_177",
	conflictRow: "_conflictRow_1uqbt_183",
	skillLink: "_skillLink_1uqbt_202",
	conflictHint: "_conflictHint_1uqbt_208"
} }]]);
//#endregion
//#region src/features/settings/context/components/SkillSourceFilesView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$6 = ["aria-label"];
var _hoisted_2$2 = ["id", "aria-label"];
var _hoisted_3$2 = ["aria-hidden"];
var _hoisted_4$2 = ["title"];
var SkillSourceFilesView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SkillSourceFilesView",
	props: {
		skill: {},
		diffFiles: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const { ruleText } = useSkillSourceReasons();
		const findings = computed(() => props.skill.check?.findings ?? []);
		const fileSections = useTemplateRef("fileSections");
		const fileIdPrefix = useId();
		function fileId(path) {
			return `${fileIdPrefix}-${encodeURIComponent(path)}`;
		}
		function goToFile(path) {
			const section = fileSections.value?.find((element) => element.id === fileId(path));
			section?.scrollIntoView({
				block: "start",
				inline: "nearest"
			});
			section?.focus({ preventScroll: true });
		}
		/** The full path of a file in the source, as the user knows it from GitHub. */
		function pathInSource(path) {
			const folder = props.skill.location.replace(/^\/+|\/+$/g, "");
			return folder ? `${folder}/${path}` : path;
		}
		/** The page of a file on GitHub. The skill links to its folder (`tree`), a file uses `blob`. */
		function fileUrl(path) {
			const encoded = path.split("/").map(encodeURIComponent).join("/");
			return `${props.skill.webUrl.replace(/\/$/, "").replace("/tree/", "/blob/")}/${encoded}`;
		}
		/** The skipped files, each with why n8n leaves it out. */
		const skippedFiles = computed(() => props.skill.skippedFiles.map((path) => {
			const unstorable = findings.value.some((finding) => finding.rule === "file_unstorable" && finding.file === path);
			const reason = ruleText(unstorable ? "file_unstorable" : "file_skipped");
			return `${pathInSource(path)} · ${reason}`;
		}));
		function unplacedText(finding) {
			const text = ruleText(finding.rule);
			return finding.file ? i18n.baseText("settings.context.skills.connect.check.findingInFile", { interpolate: {
				finding: text,
				file: finding.file
			} }) : text;
		}
		const SEVERITY_ORDER = {
			blocked: 0,
			needs_review: 1,
			info: 2
		};
		/**
		* Splits one line at the marks of its findings. Where marks start at the same place, the most
		* severe one shows. A mark that overlaps an earlier one is dropped.
		*/
		function segmentsOf(text, marks) {
			const sorted = [...marks].sort((a, b) => (a.location?.start ?? 0) - (b.location?.start ?? 0) || SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
			const segments = [];
			let at = 0;
			for (const finding of sorted) {
				const start = Math.min(finding.location?.start ?? 0, text.length);
				const end = Math.min(finding.location?.end ?? 0, text.length);
				if (start < at || end <= start) continue;
				if (start > at) segments.push({ text: text.slice(at, start) });
				segments.push({
					text: text.slice(start, end),
					finding
				});
				at = end;
			}
			if (at < text.length || segments.length === 0) segments.push({ text: text.slice(at) });
			return segments;
		}
		const reviewFiles = computed(() => props.diffFiles ?? props.skill.previewFiles.map((file) => ({
			path: file.path,
			before: file.text,
			after: file.text
		})));
		const files = computed(() => reviewFiles.value.map((file) => {
			const marks = findings.value.filter((finding) => finding.file === file.path && finding.location);
			const lines = file.after.split("\n").map((text, index) => ({
				number: index + 1,
				segments: segmentsOf(text, marks.filter((finding) => finding.location?.line === index + 1))
			}));
			return {
				...file,
				lines: props.diffFiles ? lines.filter((line) => line.segments.some((segment) => segment.finding)) : lines
			};
		}));
		/**
		* Warnings and errors that the files do not mark: a finding that marks no text, such as a size
		* limit, a finding in a part that the preview leaves out, and a finding under a mark that shows
		* first. They show above the files.
		*/
		const unplacedFindings = computed(() => {
			const marked = new Set(files.value.flatMap(({ lines }) => lines.flatMap(({ segments }) => segments.flatMap(({ finding }) => finding ?? []))));
			return findings.value.filter((finding) => finding.severity !== "info" && !marked.has(finding));
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.pane),
				"data-test-id": "skill-source-preview"
			}, [files.value.length > 1 ? (openBlock(), createElementBlock("nav", {
				key: 0,
				class: normalizeClass(_ctx.$style.fileIndex),
				"aria-label": unref(i18n).baseText("settings.context.skills.connect.review.files"),
				"data-test-id": "skill-source-file-index"
			}, [createVNode(unref(N8nText_default), {
				size: "small",
				bold: ""
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.connect.review.files")), 1)]),
				_: 1
			}), createBaseVNode("ul", { class: normalizeClass(_ctx.$style.fileList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(files.value, (file) => {
				return openBlock(), createElementBlock("li", { key: file.path }, [createVNode(unref(N8nLink_default), {
					href: `#${encodeURIComponent(fileId(file.path))}`,
					target: "_self",
					class: normalizeClass(_ctx.$style.fileLink),
					size: "small",
					theme: "text",
					underline: false,
					onClick: withModifiers(($event) => goToFile(file.path), ["prevent"])
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(file.path), 1)]),
					_: 2
				}, 1032, [
					"href",
					"class",
					"onClick"
				])]);
			}), 128))], 2)], 10, _hoisted_1$6)) : createCommentVNode("", true), createBaseVNode("div", {
				class: normalizeClass(_ctx.$style.content),
				"data-test-id": "skill-source-file-content"
			}, [
				unplacedFindings.value.length > 0 ? (openBlock(), createElementBlock("ul", {
					key: 0,
					class: normalizeClass(_ctx.$style.findings)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(unplacedFindings.value, (finding, index) => {
					return openBlock(), createElementBlock("li", { key: index }, [createVNode(unref(N8nText_default), {
						size: "small",
						color: finding.severity === "blocked" ? "danger" : "warning",
						"data-test-id": "skill-source-unplaced-finding"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unplacedText(finding)), 1)]),
						_: 2
					}, 1032, ["color"])]);
				}), 128))], 2)) : createCommentVNode("", true),
				skippedFiles.value.length > 0 ? (openBlock(), createElementBlock("section", {
					key: 1,
					class: normalizeClass(_ctx.$style.skipped)
				}, [createVNode(unref(N8nText_default), {
					size: "small",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.connect.review.skippedFiles")), 1)]),
					_: 1
				}), createBaseVNode("ul", null, [(openBlock(true), createElementBlock(Fragment, null, renderList(skippedFiles.value, (line) => {
					return openBlock(), createElementBlock("li", {
						key: line,
						class: normalizeClass(_ctx.$style.skippedFile),
						"data-test-id": "skill-source-skipped-file"
					}, toDisplayString(line), 3);
				}), 128))])], 2)) : createCommentVNode("", true),
				(openBlock(true), createElementBlock(Fragment, null, renderList(files.value, (file) => {
					return openBlock(), createElementBlock("section", {
						id: fileId(file.path),
						key: file.path,
						ref_for: true,
						ref_key: "fileSections",
						ref: fileSections,
						class: normalizeClass(_ctx.$style.file),
						"aria-label": pathInSource(file.path),
						tabindex: "-1",
						"data-test-id": "skill-source-file"
					}, [
						createBaseVNode("header", { class: normalizeClass(_ctx.$style.fileHeader) }, [
							createVNode(unref(N8nIcon_default), {
								icon: "file-text",
								size: "small",
								color: "text-light"
							}),
							createVNode(unref(N8nText_default), {
								size: "small",
								class: normalizeClass(_ctx.$style.path),
								"data-test-id": "skill-source-file-path"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(pathInSource(file.path)), 1)]),
								_: 2
							}, 1032, ["class"]),
							file.status ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 0,
								size: "small"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(file.status === "added" ? "settings.context.skills.updates.fileAdded" : "settings.context.skills.updates.fileRemoved")), 1)]),
								_: 2
							}, 1024)) : createCommentVNode("", true),
							file.status !== "removed" ? (openBlock(), createBlock(unref(N8nLink_default), {
								key: 1,
								href: fileUrl(file.path),
								"new-window": "",
								size: "small"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.synced.openInGithub")), 1)]),
								_: 1
							}, 8, ["href"])) : createCommentVNode("", true)
						], 2),
						__props.diffFiles && file.lines.length ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							size: "small",
							class: normalizeClass(_ctx.$style.findingsTitle)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.updates.flaggedLines")), 1)]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true),
						file.lines.length ? (openBlock(), createElementBlock("pre", {
							key: 1,
							class: normalizeClass(_ctx.$style.text)
						}, [createBaseVNode("code", null, [(openBlock(true), createElementBlock(Fragment, null, renderList(file.lines, (line) => {
							return openBlock(), createElementBlock("span", {
								key: line.number,
								class: normalizeClass(_ctx.$style.line)
							}, [createBaseVNode("span", {
								class: normalizeClass(_ctx.$style.number),
								"aria-hidden": !__props.diffFiles
							}, toDisplayString(line.number), 11, _hoisted_3$2), createBaseVNode("span", null, [(openBlock(true), createElementBlock(Fragment, null, renderList(line.segments, (segment, index) => {
								return openBlock(), createElementBlock(Fragment, { key: index }, [segment.finding ? (openBlock(), createElementBlock("mark", {
									key: 0,
									class: normalizeClass(segment.finding.severity === "blocked" ? _ctx.$style.blocked : segment.finding.severity === "needs_review" ? _ctx.$style.warning : _ctx.$style.info),
									title: unref(ruleText)(segment.finding.rule),
									"data-test-id": "skill-source-finding-mark"
								}, toDisplayString(segment.text), 11, _hoisted_4$2)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createTextVNode(toDisplayString(segment.text), 1)], 64))], 64);
							}), 128))])], 2);
						}), 128))])], 2)) : createCommentVNode("", true),
						__props.diffFiles ? (openBlock(), createBlock(NodeDiff_default, {
							key: 2,
							"old-string": file.before,
							"new-string": file.after,
							language: "plaintext",
							context: Math.max(file.before.split("\n").length, file.after.split("\n").length),
							"data-test-id": "skill-source-file-diff"
						}, null, 8, [
							"old-string",
							"new-string",
							"context"
						])) : createCommentVNode("", true)
					], 10, _hoisted_2$2);
				}), 128)),
				__props.skill.previewTruncated ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 2,
					size: "small",
					color: "text-light",
					"data-test-id": "skill-source-preview-truncated"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.connect.review.truncated")), 1)]),
					_: 1
				})) : createCommentVNode("", true)
			], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	pane: "_pane_hji3y_1",
	fileIndex: "_fileIndex_hji3y_8",
	fileList: "_fileList_hji3y_18",
	fileLink: "_fileLink_hji3y_26",
	content: "_content_hji3y_37",
	findings: "_findings_hji3y_47",
	skipped: "_skipped_hji3y_48",
	skippedFile: "_skippedFile_hji3y_59",
	file: "_file_hji3y_8",
	fileHeader: "_fileHeader_hji3y_71",
	path: "_path_hji3y_79",
	findingsTitle: "_findingsTitle_hji3y_86",
	text: "_text_hji3y_91",
	line: "_line_hji3y_102",
	number: "_number_hji3y_108",
	warning: "_warning_hji3y_116",
	blocked: "_blocked_hji3y_121",
	info: "_info_hji3y_126"
} }]]);
//#endregion
//#region src/features/settings/context/components/SkillSourceReview.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$5 = ["data-folder"];
var _hoisted_2$1 = ["data-skill-key"];
var _hoisted_3$1 = ["onClick"];
var _hoisted_4$1 = { key: 0 };
var SkillSourceReview_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SkillSourceReview",
	props: /*@__PURE__*/ mergeModels({
		discovery: {},
		disabled: { type: Boolean },
		disabledSkillKeys: {},
		scopeLabel: {}
	}, {
		"selected": { required: true },
		"selectedModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels(["preview"], ["update:selected"]),
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		/** The keys of the ticked skills. */
		const selected = useModel(__props, "selected");
		const i18n = useI18n();
		const { reasonText, findingsText, linkedDomainsText } = useSkillSourceReasons();
		const TABS = [
			"warning",
			"passed",
			"blocked"
		];
		const TAB_LABELS = {
			warning: "settings.context.skills.connect.tab.warning",
			passed: "settings.context.skills.connect.tab.passed",
			blocked: "settings.context.skills.connect.tab.blocked"
		};
		/** A skill that the user cannot tick is in Blocked, whatever the reason. */
		function tabOf(skill) {
			if (!canSelectSkill(skill)) return "blocked";
			return skill.check?.verdict === "needs_review" ? "warning" : "passed";
		}
		const skillsByTab = computed(() => {
			const tabs = {
				warning: [],
				passed: [],
				blocked: []
			};
			for (const skill of props.discovery.skills) tabs[tabOf(skill)].push(skill);
			return tabs;
		});
		const tabOptions = computed(() => TABS.map((tab) => ({
			value: tab,
			label: i18n.baseText(TAB_LABELS[tab], { interpolate: { count: skillsByTab.value[tab].length } })
		})));
		const activeTab = ref("warning");
		const search = ref("");
		const searchOpen = ref(false);
		const searchInput = useTemplateRef("searchInput");
		const searchToggle = useTemplateRef("searchToggle");
		const { focused: searchToggleFocused } = useFocus(searchToggle);
		/** The skill that the right pane shows. */
		const previewKey = ref(null);
		async function toggleSearch() {
			searchOpen.value = !searchOpen.value;
			search.value = "";
			await nextTick();
			if (searchOpen.value) searchInput.value?.focus();
			else searchToggleFocused.value = true;
		}
		/** A new tab shows its first skill, so the right pane is never empty when a tab has skills. */
		function selectTab(tab) {
			activeTab.value = tab;
			previewKey.value = visibleSkills.value[0]?.key ?? null;
		}
		function matches(skill, term) {
			return [
				skill.name,
				skill.description,
				skill.location
			].some((text) => text?.toLowerCase().includes(term));
		}
		const visibleSkills = computed(() => {
			const term = search.value.trim().toLowerCase();
			const skills = skillsByTab.value[activeTab.value];
			return term ? skills.filter((skill) => matches(skill, term)) : skills;
		});
		const groups = computed(() => groupByFolder(visibleSkills.value));
		watch(() => props.discovery, () => {
			search.value = "";
			searchOpen.value = false;
			selectTab(TABS.find((tab) => skillsByTab.value[tab].length > 0) ?? "warning");
		}, { immediate: true });
		watch(previewKey, (key) => emit("preview", key), { immediate: true });
		const previewSkill = computed(() => props.discovery.skills.find((skill) => skill.key === previewKey.value) ?? null);
		function canSelectSkill(skill) {
			return isSelectableSkill(skill) && !props.disabledSkillKeys?.includes(skill.key);
		}
		/** The state of a checkbox that ticks every selectable skill of a list. */
		function stateOf(skills) {
			const keys = skills.filter(canSelectSkill).map((skill) => skill.key);
			const picked = keys.filter((key) => selected.value.includes(key)).length;
			return {
				keys,
				checked: keys.length > 0 && picked === keys.length,
				indeterminate: picked > 0 && picked < keys.length
			};
		}
		const selectAll = computed(() => stateOf(visibleSkills.value));
		/** Ticks every skill of the list, or none when all are ticked already. */
		function toggleAll(skills) {
			const { keys, checked } = stateOf(skills);
			selected.value = checked ? selected.value.filter((key) => !keys.includes(key)) : [.../* @__PURE__ */ new Set([...selected.value, ...keys])];
		}
		function toggle(key, checked) {
			selected.value = checked ? [...selected.value, key] : selected.value.filter((selectedKey) => selectedKey !== key);
		}
		/** A skill that n8n cannot read has no name, so the row names its folder. */
		function titleOf(skill) {
			return skill.name ?? skill.location.split("/").filter(Boolean).pop() ?? skill.location;
		}
		/**
		* Why a skill cannot be ticked, in translated text. The check names the cause of a SKILL.md
		* that n8n cannot read, so its findings come before the read error.
		*/
		function blockedReason(skill) {
			if (skill.nameTaken) return i18n.baseText("settings.context.skills.connect.nameTaken.reason", { interpolate: {
				name: titleOf(skill),
				scope: props.scopeLabel
			} });
			if (skill.error?.reason === "name_clash") return i18n.baseText("settings.context.skills.updates.agentNameClash", { interpolate: { name: titleOf(skill) } });
			const findings = skill.check ? findingsText(skill.check.findings) : "";
			if (findings) return findings;
			if (props.disabledSkillKeys?.includes(skill.key)) return i18n.baseText("settings.context.skills.updates.importNotAllowed");
			return skill.error ? reasonText(skill.error.reason) : "";
		}
		const warningsByKey = computed(() => Object.fromEntries(props.discovery.skills.map((skill) => [skill.key, skill.check?.findings.filter((finding) => finding.severity === "needs_review") ?? []])));
		function warningLabel(key) {
			const count = warningsByKey.value[key].length;
			return i18n.baseText("settings.context.skills.connect.review.warnings", {
				interpolate: { count },
				adjustToNumber: count
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.review),
				"data-test-id": "skill-source-review"
			}, [createVNode(unref(Tabs_default), {
				"model-value": activeTab.value,
				options: tabOptions.value,
				"data-test-id": "skill-source-tabs",
				"onUpdate:modelValue": selectTab
			}, null, 8, ["model-value", "options"]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.panes) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.left) }, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.listHeader) }, [
					createVNode(unref(Checkbox_default), {
						"model-value": selectAll.value.checked,
						indeterminate: selectAll.value.indeterminate,
						disabled: __props.disabled || selectAll.value.keys.length === 0,
						label: searchOpen.value ? void 0 : unref(i18n).baseText("settings.context.skills.columns.skill"),
						"aria-label": unref(i18n).baseText("settings.context.skills.connect.review.selectAll"),
						"data-test-id": "skill-source-select-all",
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => toggleAll(visibleSkills.value))
					}, null, 8, [
						"model-value",
						"indeterminate",
						"disabled",
						"label",
						"aria-label"
					]),
					searchOpen.value ? (openBlock(), createBlock(unref(Input_default), {
						key: 0,
						ref_key: "searchInput",
						ref: searchInput,
						modelValue: search.value,
						"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => search.value = $event),
						size: "small",
						class: normalizeClass(_ctx.$style.search),
						placeholder: unref(i18n).baseText("settings.context.skills.connect.review.search"),
						"aria-label": unref(i18n).baseText("settings.context.skills.connect.review.search"),
						"data-test-id": "skill-source-search",
						onKeydown: withKeys(withModifiers(toggleSearch, ["stop", "prevent"]), ["esc"])
					}, null, 8, [
						"modelValue",
						"class",
						"placeholder",
						"aria-label",
						"onKeydown"
					])) : createCommentVNode("", true),
					createVNode(unref(N8nTooltip_default), {
						"as-child": "",
						placement: "bottom",
						enterable: false,
						content: unref(i18n).baseText(searchOpen.value ? "generic.close" : "settings.context.skills.connect.review.search")
					}, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							ref_key: "searchToggle",
							ref: searchToggle,
							variant: "ghost",
							size: "small",
							"icon-only": "",
							icon: searchOpen.value ? "x" : "search",
							"aria-label": unref(i18n).baseText(searchOpen.value ? "generic.close" : "settings.context.skills.connect.review.search"),
							"aria-expanded": searchOpen.value,
							"data-test-id": "skill-source-search-toggle",
							onClick: toggleSearch
						}, null, 8, [
							"icon",
							"aria-label",
							"aria-expanded"
						])]),
						_: 1
					}, 8, ["content"])
				], 2),
				createBaseVNode("ul", {
					class: normalizeClass(_ctx.$style.list),
					"data-test-id": "skill-source-skills"
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(groups.value, (group) => {
					return openBlock(), createElementBlock("li", {
						key: group.folder,
						"data-folder": group.folder,
						"data-test-id": "skill-source-group"
					}, [groups.value.length > 1 ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.groupHeader)
					}, [createVNode(unref(Checkbox_default), {
						"model-value": stateOf(group.skills).checked,
						indeterminate: stateOf(group.skills).indeterminate,
						disabled: __props.disabled || stateOf(group.skills).keys.length === 0,
						"aria-label": group.folder,
						"data-test-id": "skill-source-group-checkbox",
						"onUpdate:modelValue": ($event) => toggleAll(group.skills)
					}, null, 8, [
						"model-value",
						"indeterminate",
						"disabled",
						"aria-label",
						"onUpdate:modelValue"
					]), createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-light",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(group.folder), 1)]),
						_: 2
					}, 1024)], 2)) : createCommentVNode("", true), createBaseVNode("ul", { class: normalizeClass(_ctx.$style.groupSkills) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(group.skills, (item) => {
						return openBlock(), createElementBlock("li", {
							key: item.key,
							class: normalizeClass([_ctx.$style.item, item.key === previewKey.value && _ctx.$style.active]),
							"data-skill-key": item.key,
							"data-test-id": "skill-source-skill"
						}, [
							createVNode(unref(Checkbox_default), {
								"model-value": canSelectSkill(item) && selected.value.includes(item.key),
								disabled: __props.disabled || !canSelectSkill(item),
								"aria-label": titleOf(item),
								"data-test-id": "skill-source-skill-checkbox",
								"onUpdate:modelValue": ($event) => toggle(item.key, $event)
							}, null, 8, [
								"model-value",
								"disabled",
								"aria-label",
								"onUpdate:modelValue"
							]),
							createBaseVNode("button", {
								type: "button",
								class: normalizeClass(_ctx.$style.itemText),
								onClick: ($event) => previewKey.value = item.key
							}, [
								createVNode(unref(N8nText_default), {
									bold: "",
									size: "small"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(titleOf(item)), 1)]),
									_: 2
								}, 1024),
								renderSlot(_ctx.$slots, "row-details", { skill: item }),
								activeTab.value === "blocked" ? (openBlock(), createBlock(unref(N8nText_default), {
									key: 0,
									size: "small",
									color: "danger",
									"data-test-id": "skill-source-skill-reason"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(blockedReason(item)), 1)]),
									_: 2
								}, 1024)) : activeTab.value === "passed" && unref(linkedDomainsText)(item.check?.findings ?? []) ? (openBlock(), createBlock(unref(N8nText_default), {
									key: 1,
									size: "small",
									color: "text-light",
									"data-test-id": "skill-source-skill-findings"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(linkedDomainsText)(item.check?.findings ?? [])), 1)]),
									_: 2
								}, 1024)) : createCommentVNode("", true)
							], 10, _hoisted_3$1),
							activeTab.value === "warning" && warningsByKey.value[item.key].length ? (openBlock(), createBlock(unref(N8nTooltip_default), {
								key: 0,
								"as-child": "",
								placement: "right"
							}, {
								content: withCtx(() => [createBaseVNode("div", null, [
									createTextVNode(toDisplayString(warningLabel(item.key)) + " ", 1),
									createBaseVNode("ul", { class: normalizeClass(_ctx.$style.warningList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(warningsByKey.value[item.key], (finding, index) => {
										return openBlock(), createElementBlock("li", { key: index }, toDisplayString(unref(findingsText)([finding])), 1);
									}), 128))], 2),
									createTextVNode(" " + toDisplayString(unref(linkedDomainsText)(item.check?.findings ?? [])), 1)
								])]),
								default: withCtx(() => [createVNode(unref(N8nButton_default), {
									variant: "ghost",
									size: "small",
									class: normalizeClass(_ctx.$style.warning),
									"aria-label": warningLabel(item.key),
									"data-test-id": "skill-source-skill-warnings"
								}, {
									default: withCtx(() => [warningsByKey.value[item.key].length > 1 ? (openBlock(), createElementBlock("span", _hoisted_4$1, toDisplayString(warningsByKey.value[item.key].length), 1)) : createCommentVNode("", true), createVNode(unref(N8nIcon_default), {
										icon: "triangle-alert",
										size: "small"
									})]),
									_: 2
								}, 1032, ["class", "aria-label"])]),
								_: 2
							}, 1024)) : createCommentVNode("", true)
						], 10, _hoisted_2$1);
					}), 128))], 2)], 8, _hoisted_1$5);
				}), 128))], 2),
				visibleSkills.value.length === 0 ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(search.value ? unref(i18n).baseText("settings.context.skills.connect.review.noMatch") : unref(i18n).baseText("settings.context.skills.connect.review.empty")), 1)]),
					_: 1
				})) : createCommentVNode("", true),
				__props.discovery.truncated ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					size: "small",
					color: "text-light",
					"data-test-id": "skill-source-truncated"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(reasonText)("too_many_skills")), 1)]),
					_: 1
				})) : createCommentVNode("", true),
				__props.discovery.tooDeep ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 2,
					size: "small",
					color: "text-light",
					"data-test-id": "skill-source-too-deep"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(reasonText)("too_deep")), 1)]),
					_: 1
				})) : createCommentVNode("", true)
			], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.right) }, [previewSkill.value ? renderSlot(_ctx.$slots, "preview", {
				key: 0,
				skill: previewSkill.value
			}, () => [(openBlock(), createBlock(SkillSourceFilesView_default, {
				key: previewSkill.value.key,
				skill: previewSkill.value
			}, null, 8, ["skill"]))]) : createCommentVNode("", true)], 2)], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	review: "_review_1g1tv_1",
	panes: "_panes_1g1tv_8",
	left: "_left_1g1tv_15",
	listHeader: "_listHeader_1g1tv_23",
	search: "_search_1g1tv_32",
	right: "_right_1g1tv_37",
	list: "_list_1g1tv_23",
	groupHeader: "_groupHeader_1g1tv_52",
	groupSkills: "_groupSkills_1g1tv_61",
	item: "_item_1g1tv_67",
	active: "_active_1g1tv_75",
	warning: "_warning_1g1tv_79",
	warningList: "_warningList_1g1tv_84",
	itemText: "_itemText_1g1tv_89"
} }]]);
//#endregion
//#region src/features/settings/context/components/SkillSourceUpdatesDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var SkillSourceUpdatesDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SkillSourceUpdatesDialog",
	props: { source: {} },
	emits: ["close", "changed"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const store = useSkillsStore();
		const { showMessage } = useToast();
		const { reasonText } = useSkillSourceReasons();
		const updates = ref([]);
		const selected = ref([]);
		const reviewed = ref(false);
		const loading = ref(true);
		const saving = ref(false);
		const error = ref("");
		/** Why the new skills did not load. The stored updates still show. */
		const newSkillsError = ref("");
		const previewKey = ref(null);
		const detail = ref(null);
		const detailLoading = ref(false);
		const detailError = ref("");
		const commit = ref(null);
		let previewRequest = 0;
		let listRequest = 0;
		let loaded = false;
		let closed = false;
		const acceptable = (update) => update.check.verdict !== "blocked" && !update.nameClash && (!update.newSkill || props.source.canImport);
		const disabledImportKeys = computed(() => props.source.canImport ? [] : updates.value.filter((update) => update.newSkill).map(({ skillId }) => skillId));
		const selectedUpdates = computed(() => updates.value.filter((update) => selected.value.includes(update.skillId) && acceptable(update)));
		const selectedNew = computed(() => selectedUpdates.value.filter((update) => update.newSkill));
		const needsReview = computed(() => selectedUpdates.value.some((update) => update.check.verdict === "needs_review"));
		const focused = computed(() => updates.value.find((update) => update.skillId === previewKey.value));
		const byId = computed(() => new Map(updates.value.map((update) => [update.skillId, update])));
		const discovery = computed(() => ({
			skills: updates.value.map((update) => ({
				key: update.skillId,
				name: update.name,
				description: update.newSkill?.description ?? null,
				location: update.location,
				webUrl: update.webUrl,
				check: update.check,
				skippedFiles: update.check.findings.flatMap((finding) => (finding.rule === "file_skipped" || finding.rule === "file_unstorable") && finding.file ? [finding.file] : []),
				previewFiles: update.newSkill?.previewFiles ?? [],
				previewTruncated: update.newSkill?.previewTruncated ?? false,
				nameTaken: update.nameClash?.where === "scope",
				error: update.nameClash?.where === "agent" ? {
					reason: "name_clash",
					message: ""
				} : null
			})),
			truncated: false
		}));
		const scopeLabel = computed(() => props.source.projectName ?? i18n.baseText("settings.context.skills.scope.instance"));
		const commitDate = computed(() => {
			if (!commit.value?.date) return "";
			const date = new Date(commit.value.date);
			return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(i18n.locale, {
				dateStyle: "medium",
				timeStyle: "short"
			});
		});
		const commitTitle = computed(() => commit.value?.message?.split("\n")[0] || commit.value?.revision.slice(0, 12));
		const sourceLine = computed(() => [props.source.label, props.source.ref].filter(Boolean).join(" · "));
		const impact = computed(() => detail.value ? impactText(detail.value) : "");
		function impactText({ agents, hiddenAgentCount }) {
			if (!agents.length && !hiddenAgentCount) return i18n.baseText("settings.context.skills.updates.noFollowers");
			return [agents.length ? i18n.baseText("settings.context.skills.updates.followers", { interpolate: { agents: agents.map(({ name }) => name).join(", ") } }) : "", hiddenAgentCount ? i18n.baseText("settings.context.skills.updates.hiddenFollowers", {
				interpolate: { count: hiddenAgentCount },
				adjustToNumber: hiddenAgentCount
			}) : ""].filter(Boolean).join(" ");
		}
		function isStale(cause) {
			return cause instanceof ResponseError && cause.meta?.reason === "stale";
		}
		function errorText(cause) {
			if (cause instanceof ResponseError && typeof cause.meta?.reason === "string") return reasonText(cause.meta.reason) || i18n.baseText("settings.context.skills.updates.error");
			return i18n.baseText("settings.context.skills.updates.error");
		}
		async function load() {
			const request = ++listRequest;
			++previewRequest;
			loading.value = true;
			detail.value = null;
			reviewed.value = false;
			try {
				const result = await store.fetchSourceUpdates(props.source.id);
				if (closed || request !== listRequest) return;
				updates.value = [...result.updates, ...(result.newSkills ?? []).map((skill) => ({
					skillId: skill.key,
					name: skill.name ?? skill.location,
					location: skill.location,
					webUrl: skill.webUrl,
					contentHash: skill.contentHash,
					baseVersionId: "",
					revision: skill.revision,
					revisionUrl: null,
					check: skill.check ?? {
						verdict: "blocked",
						findings: []
					},
					nameClash: skill.nameTaken ? {
						name: skill.name ?? "",
						where: "scope"
					} : null,
					changes: {
						added: 0,
						removed: 0
					},
					nextVersion: 1,
					newSkill: skill
				}))];
				selected.value = updates.value.filter((update) => acceptable(update) && (!loaded && !update.newSkill || selected.value.includes(update.skillId))).map(({ skillId }) => skillId);
				loaded = true;
				newSkillsError.value = result.newSkillsError ? [i18n.baseText("settings.context.skills.updates.newSkillsError"), result.newSkillsError.reason ? reasonText(result.newSkillsError.reason) : ""].filter(Boolean).join(" ") : "";
				if (commit.value?.revision !== result.commit?.revision) commit.value = result.commit;
			} catch (cause) {
				if (!closed && request === listRequest) error.value = errorText(cause);
			} finally {
				if (request === listRequest) loading.value = false;
			}
		}
		async function loadPreview() {
			const update = focused.value;
			const request = ++previewRequest;
			detail.value = null;
			detailError.value = "";
			detailLoading.value = false;
			if (!update) return;
			if (update.check.verdict === "blocked") return;
			if (update.newSkill) {
				detail.value = {
					files: update.newSkill.previewFiles.map(({ path, text }) => ({
						path,
						before: "",
						after: text,
						status: "added"
					})),
					agents: [],
					hiddenAgentCount: 0
				};
				return;
			}
			detailLoading.value = true;
			try {
				const result = await store.fetchSourceUpdate(props.source.id, update.skillId, {
					contentHash: update.contentHash,
					baseVersionId: update.baseVersionId
				});
				if (!closed && request === previewRequest) detail.value = result;
			} catch (cause) {
				if (closed || request !== previewRequest) return;
				if (isStale(cause)) {
					error.value = reasonText("stale");
					await load();
				} else detailError.value = errorText(cause);
			} finally {
				if (request === previewRequest) detailLoading.value = false;
			}
		}
		watch(focused, loadPreview);
		watch(() => focused.value?.revision, async (revision) => {
			if (!revision) return;
			commit.value = {
				revision,
				webUrl: focused.value?.revisionUrl ?? null,
				message: null,
				author: null,
				date: null
			};
			try {
				const result = await store.fetchSourceCommit(props.source.id, revision);
				if (!closed && focused.value?.revision === revision) commit.value = result;
			} catch {}
		});
		watch(selected, () => {
			reviewed.value = false;
		}, { deep: true });
		function close() {
			if (saving.value) return;
			closed = true;
			++previewRequest;
			++listRequest;
			emit("close");
		}
		async function accept() {
			if (saving.value || !selectedUpdates.value.length || needsReview.value && !reviewed.value) return;
			saving.value = true;
			error.value = "";
			try {
				const result = await store.acceptSourceUpdates(props.source.id, {
					updates: selectedUpdates.value.filter((update) => !update.newSkill).map(({ skillId, contentHash, baseVersionId }) => ({
						skillId,
						contentHash,
						baseVersionId
					})),
					newSkills: selectedNew.value.flatMap(({ newSkill, contentHash }) => newSkill ? [{
						key: newSkill.key,
						contentHash
					}] : []),
					skippedNewSkills: [],
					reviewedWarnings: reviewed.value
				});
				const description = result.updatedCount ? [impactText(result), i18n.baseText("settings.context.skills.updates.publishedUnchanged")].join(" ") : "";
				showMessage({
					type: "success",
					dangerouslyUseHTMLString: false,
					title: [result.importedCount ? i18n.baseText("settings.context.skills.updates.imported", {
						interpolate: { count: result.importedCount },
						adjustToNumber: result.importedCount
					}) : "", result.updatedCount ? i18n.baseText("settings.context.skills.updates.success", {
						interpolate: { count: result.updatedCount },
						adjustToNumber: result.updatedCount
					}) : ""].filter(Boolean).join("; "),
					message: description
				});
				emit("changed");
				saving.value = false;
				close();
			} catch (cause) {
				error.value = errorText(cause);
				if (cause instanceof ResponseError && cause.httpStatusCode === 409) await load();
			} finally {
				saving.value = false;
			}
		}
		async function hideNewSkill() {
			const update = focused.value;
			if (!update?.newSkill || saving.value) return;
			saving.value = true;
			error.value = "";
			try {
				await store.acceptSourceUpdates(props.source.id, {
					updates: [],
					newSkills: [],
					skippedNewSkills: [{
						key: update.newSkill.key,
						contentHash: update.contentHash
					}],
					reviewedWarnings: false
				});
				selected.value = selected.value.filter((id) => id !== update.skillId);
				emit("changed");
				await load();
			} catch (cause) {
				error.value = errorText(cause);
				if (cause instanceof ResponseError && cause.httpStatusCode === 409) await load();
			} finally {
				saving.value = false;
			}
		}
		load();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: true,
				"aria-description": unref(i18n).baseText("settings.context.skills.updates.description"),
				size: "full",
				"container-class": _ctx.$style.wide,
				"data-test-id": "skill-source-updates-dialog",
				"onUpdate:open": _cache[4] || (_cache[4] = ($event) => !$event && close())
			}, {
				default: withCtx(() => [
					createVNode(unref(DialogHeader_default), { class: normalizeClass(_ctx.$style.header) }, {
						default: withCtx(() => [createVNode(unref(DialogTitle_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.updates.title")), 1)]),
							_: 1
						}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.metadata) }, [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light",
							class: normalizeClass(_ctx.$style.source)
						}, {
							default: withCtx(() => [createVNode(unref(N8nIcon_default), {
								icon: "git-branch",
								size: "small"
							}), createTextVNode(" " + toDisplayString(sourceLine.value), 1)]),
							_: 1
						}, 8, ["class"]), commit.value ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.commit),
							"data-test-id": "skill-update-commit"
						}, [
							_cache[5] || (_cache[5] = createBaseVNode("span", { "aria-hidden": "true" }, "·", -1)),
							commit.value.webUrl ? (openBlock(), createBlock(unref(N8nLink_default), {
								key: 0,
								href: commit.value.webUrl,
								title: commitTitle.value,
								size: "small",
								theme: "text",
								underline: false,
								class: normalizeClass(_ctx.$style.commitLink),
								"new-window": ""
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(commitTitle.value), 1)]),
								_: 1
							}, 8, [
								"href",
								"title",
								"class"
							])) : (openBlock(), createBlock(unref(N8nText_default), {
								key: 1,
								size: "small",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(commitTitle.value), 1)]),
								_: 1
							})),
							commit.value.author || commitDate.value ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 2,
								size: "small",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(" · " + toDisplayString([commit.value.author, commitDate.value].filter(Boolean).join(" · ")), 1)]),
								_: 1
							})) : createCommentVNode("", true)
						], 2)) : createCommentVNode("", true)], 2)]),
						_: 1
					}, 8, ["class"]),
					createVNode(unref(DialogBody_default), { class: normalizeClass(_ctx.$style.body) }, {
						default: withCtx(() => [
							error.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
								key: 0,
								theme: "warning",
								"data-test-id": "skill-updates-error"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(error.value), 1)]),
								_: 1
							})) : createCommentVNode("", true),
							newSkillsError.value && !loading.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
								key: 1,
								theme: "warning",
								"data-test-id": "skill-updates-new-error"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(newSkillsError.value), 1)]),
								_: 1
							})) : createCommentVNode("", true),
							loading.value ? (openBlock(), createBlock(unref(N8nText_default), { key: 2 }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.loading")), 1)]),
								_: 1
							})) : updates.value.length ? (openBlock(), createBlock(SkillSourceReview_default, {
								key: 3,
								selected: selected.value,
								"onUpdate:selected": _cache[0] || (_cache[0] = ($event) => selected.value = $event),
								discovery: discovery.value,
								"scope-label": scopeLabel.value,
								disabled: saving.value,
								"disabled-skill-keys": disabledImportKeys.value,
								onPreview: _cache[1] || (_cache[1] = ($event) => previewKey.value = $event)
							}, {
								"row-details": withCtx(({ skill }) => [byId.value.get(skill.key)?.newSkill ? (openBlock(), createBlock(unref(N8nBadge_default), {
									key: 0,
									variant: "secondary",
									"data-test-id": "skill-update-new"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.updates.new")), 1)]),
									_: 1
								})) : (openBlock(), createBlock(unref(N8nText_default), {
									key: 1,
									size: "small",
									color: "text-light",
									"data-test-id": "skill-update-counts"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.updates.lines", { interpolate: {
										added: byId.value.get(skill.key)?.changes.added ?? 0,
										removed: byId.value.get(skill.key)?.changes.removed ?? 0
									} })), 1)]),
									_: 2
								}, 1024))]),
								preview: withCtx(({ skill }) => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.detailHeader) }, [
									createVNode(unref(N8nText_default), {
										size: "small",
										bold: ""
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.updates.nextVersion", { interpolate: {
											name: skill.name ?? "",
											version: byId.value.get(skill.key)?.nextVersion ?? ""
										} })), 1)]),
										_: 2
									}, 1024),
									detail.value && !focused.value?.newSkill ? (openBlock(), createBlock(unref(N8nText_default), {
										key: 0,
										size: "small",
										color: "text-light"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(impact.value) + " " + toDisplayString(unref(i18n).baseText("settings.context.skills.updates.publishedUnchanged")), 1)]),
										_: 1
									})) : createCommentVNode("", true),
									focused.value?.newSkill ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
										!__props.source.canImport ? (openBlock(), createBlock(unref(N8nText_default), {
											key: 0,
											size: "small",
											color: "text-light"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.updates.importNotAllowed")), 1)]),
											_: 1
										})) : createCommentVNode("", true),
										createVNode(unref(N8nText_default), {
											size: "small",
											color: "text-light"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.updates.newHint")), 1)]),
											_: 1
										}),
										createVNode(unref(N8nButton_default), {
											variant: "ghost",
											disabled: saving.value || focused.value.newSkill.skipped,
											label: unref(i18n).baseText(focused.value.newSkill.skipped ? "settings.context.skills.updates.hiddenNew" : "settings.context.skills.updates.hideNew"),
											"data-test-id": "skill-new-hide",
											"data-attr": "skill-new-hide",
											onClick: hideNewSkill
										}, null, 8, ["disabled", "label"])
									], 64)) : createCommentVNode("", true)
								], 2), detailLoading.value ? (openBlock(), createBlock(unref(N8nText_default), {
									key: 0,
									class: normalizeClass(_ctx.$style.detailNotice)
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.loading")), 1)]),
									_: 1
								}, 8, ["class"])) : detailError.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
									key: 1,
									theme: "warning",
									class: normalizeClass(_ctx.$style.detailNotice)
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(detailError.value) + " ", 1), createVNode(unref(N8nButton_default), {
										variant: "ghost",
										label: unref(i18n).baseText("generic.retry"),
										onClick: loadPreview
									}, null, 8, ["label"])]),
									_: 1
								}, 8, ["class"])) : skill.check?.verdict === "blocked" ? (openBlock(), createBlock(unref(N8nCallout_default), {
									key: 2,
									theme: "danger",
									class: normalizeClass(_ctx.$style.detailNotice),
									"data-test-id": "skill-update-blocked"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.updates.blocked")), 1)]),
									_: 1
								}, 8, ["class"])) : detail.value ? (openBlock(), createBlock(SkillSourceFilesView_default, {
									key: 3,
									skill,
									"diff-files": detail.value.files
								}, null, 8, ["skill", "diff-files"])) : createCommentVNode("", true)]),
								_: 1
							}, 8, [
								"selected",
								"discovery",
								"scope-label",
								"disabled",
								"disabled-skill-keys"
							])) : !error.value ? (openBlock(), createBlock(unref(N8nText_default), { key: 4 }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.updates.empty")), 1)]),
								_: 1
							})) : (openBlock(), createBlock(unref(N8nButton_default), {
								key: 5,
								variant: "ghost",
								label: unref(i18n).baseText("generic.retry"),
								onClick: _cache[2] || (_cache[2] = ($event) => {
									error.value = "";
									load();
								})
							}, null, 8, ["label"]))
						]),
						_: 1
					}, 8, ["class"]),
					createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [
							needsReview.value ? (openBlock(), createBlock(unref(Checkbox_default), {
								key: 0,
								modelValue: reviewed.value,
								"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => reviewed.value = $event),
								disabled: saving.value,
								label: unref(i18n).baseText("settings.context.skills.connect.check.reviewed"),
								"data-test-id": "skill-update-reviewed-warnings"
							}, null, 8, [
								"modelValue",
								"disabled",
								"label"
							])) : createCommentVNode("", true),
							createVNode(unref(N8nButton_default), {
								variant: "outline",
								disabled: saving.value,
								label: unref(i18n).baseText("generic.cancel"),
								onClick: close
							}, null, 8, ["disabled", "label"]),
							createVNode(unref(N8nButton_default), {
								loading: saving.value,
								disabled: loading.value || saving.value || selectedUpdates.value.length === 0 || needsReview.value && !reviewed.value,
								label: unref(i18n).baseText(selectedNew.value.length ? selectedNew.value.length === selectedUpdates.value.length ? "settings.context.skills.updates.import" : "settings.context.skills.updates.apply" : "settings.context.skills.updates.accept", {
									interpolate: { count: selectedUpdates.value.length },
									adjustToNumber: selectedUpdates.value.length
								}),
								"data-test-id": "skill-updates-accept",
								onClick: accept
							}, null, 8, [
								"loading",
								"disabled",
								"label"
							])
						]),
						_: 1
					})
				]),
				_: 1
			}, 8, ["aria-description", "container-class"]);
		};
	}
}), [["__cssModules", { "$style": {
	body: "_body_rxs9u_1",
	detailHeader: "_detailHeader_rxs9u_2",
	header: "_header_rxs9u_8",
	metadata: "_metadata_rxs9u_15",
	commit: "_commit_rxs9u_16",
	source: "_source_rxs9u_17",
	commitLink: "_commitLink_rxs9u_31",
	detailNotice: "_detailNotice_rxs9u_48",
	wide: "_wide_rxs9u_52"
} }]]);
//#endregion
//#region src/features/settings/context/components/SkillSourceConnectDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$4 = { key: 1 };
var OAUTH2_CREDENTIAL_TYPE = "githubOAuth2Api";
/** The options of the credential select that create a credential instead of picking one. */
var NEW_CREDENTIAL_PREFIX = "__new__:";
var NO_CREDENTIAL = "__none__";
var SkillSourceConnectDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SkillSourceConnectDialog",
	props: {
		open: { type: Boolean },
		scopeOptions: {}
	},
	emits: [
		"update:open",
		"connected",
		"openSource"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		/** A loose check only: the server reads the link and answers with the exact reason. */
		const GITHUB_LINK = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+([/?#].*)?$/i;
		/** A web link to another host, such as GitLab. */
		const OTHER_HOST_LINK = /^https?:\/\/(?!(www\.)?github\.com([/?#:]|$))[^\s/?#]+/i;
		/** GitHub OAuth2 has a fixed scope with write access to the repositories of the account. */
		const newCredentialValue = (type) => `${NEW_CREDENTIAL_PREFIX}${type}`;
		const NEW_OAUTH2_CREDENTIAL = newCredentialValue(OAUTH2_CREDENTIAL_TYPE);
		/** "None, the repository is public". The select needs a value for it. */
		function parseCredentialSelect(value) {
			if (value === NO_CREDENTIAL) return { kind: "none" };
			if (!value.startsWith(NEW_CREDENTIAL_PREFIX)) return {
				kind: "pick",
				id: value
			};
			const type = value.slice(8);
			return isGitHubSkillSourceCredentialType(type) ? {
				kind: "new",
				type
			} : { kind: "none" };
		}
		/** The repository field also takes a link. `github.com/…` without a protocol gets one. */
		function asLink(text) {
			const value = text.trim();
			if (/^https?:\/\//i.test(value)) return value;
			if (/^(www\.)?github\.com\//i.test(value)) return `https://${value}`;
			return null;
		}
		function repositoryKey(repository) {
			return `${repository.owner}/${repository.name}`;
		}
		const i18n = useI18n();
		const { showError } = useToast();
		const skillsStore = useSkillsStore();
		const { reasonText } = useSkillSourceReasons();
		const projectsStore = useProjectsStore();
		const uiStore = useUIStore();
		const credentialsStore = useCredentialsStore();
		const credentialOAuth = useCredentialOAuth();
		const step = ref("repository");
		const scope = ref("");
		const discovering = ref(false);
		const connecting = ref(false);
		const linkError = ref("");
		const discovery = ref(null);
		const selected = ref([]);
		/** The link and credential that the shown discovery read, which connect sends again. */
		const discovered = ref(null);
		/** `''` is "None, the repository is public". */
		const credentialId = ref("");
		const credentials = ref([]);
		const credentialsLoading = ref(false);
		/** The credential that the user created from this dialog, for the success box. */
		const createdCredential = ref(null);
		const repositories = ref([]);
		const repositoriesTruncated = ref(false);
		const repositoriesLoading = ref(false);
		/** `owner/name` of a listed repository, or a link. */
		const repository = ref("");
		/** The text in the repository field, to offer a typed link as an option. */
		const repositorySearch = ref("");
		/** "I have reviewed the warnings", for the picked skills that need review. */
		const reviewed = ref(false);
		/** Counts the reads, so the answer of a read from before a change or a close is dropped. */
		let discoverRun = 0;
		let credentialsRun = 0;
		let repositoriesRun = 0;
		/** Counts the opens and closes, so a credential made for an earlier session is dropped. */
		let dialogSession = 0;
		/** A GitHub sign-in is open. The OAuth helper holds one at a time, so the select waits. */
		const signingIn = ref(false);
		function resetRepositories() {
			repositoriesRun += 1;
			repositories.value = [];
			repositoriesTruncated.value = false;
			repositoriesLoading.value = false;
		}
		/** A repository picked from the list stays only while the list of the credential has it. */
		function keepRepositoryIn(list) {
			if (asLink(repository.value)) return;
			if (!list.some((option) => repositoryKey(option) === repository.value)) repository.value = "";
		}
		/**
		* The quick-connect check reads the credential types, which the settings page may not have.
		* The credential select waits for them, so "Sign in with GitHub" never opens the form by mistake.
		*/
		const credentialTypesLoading = ref(false);
		async function loadCredentialTypes() {
			credentialTypesLoading.value = true;
			try {
				await credentialsStore.fetchCredentialTypes(false);
			} catch {} finally {
				credentialTypesLoading.value = false;
			}
		}
		watch(() => props.open, (open) => {
			dialogSession += 1;
			signingIn.value = false;
			if (!open) {
				credentialOAuth.cancelAuthorize();
				return;
			}
			loadCredentialTypes();
			discoverRun += 1;
			credentialsRun += 1;
			discovering.value = false;
			step.value = "repository";
			scope.value = props.scopeOptions[0]?.value ?? "";
			linkError.value = "";
			discovery.value = null;
			discovered.value = null;
			selected.value = [];
			credentialId.value = "";
			credentials.value = [];
			credentialsLoading.value = false;
			createdCredential.value = null;
			repository.value = "";
			repositorySearch.value = "";
			resetRepositories();
			reviewed.value = false;
			loadCredentials();
		}, { immediate: true });
		onBeforeUnmount(() => credentialOAuth.cancelAuthorize());
		watch([
			scope,
			credentialId,
			repository
		], () => {
			linkError.value = "";
			discovery.value = null;
		});
		const selectedScope = computed(() => props.scopeOptions.find((option) => option.value === scope.value));
		const scopeSkill = computed(() => {
			const target = parseScope(scope.value);
			return {
				scope: target.scope,
				projectId: target.projectId ?? null,
				projectName: selectedScope.value?.label ?? null,
				projectType: null,
				projectIcon: selectedScope.value?.projectIcon ?? null
			};
		});
		const scopeItems = computed(() => props.scopeOptions.map((option) => ({
			value: option.value,
			label: option.label,
			icon: option.icon
		})));
		const scopeHint = computed(() => {
			const option = selectedScope.value;
			if (!option || option.value === "instance") return i18n.baseText("settings.context.skills.connect.scope.hint.instance");
			if (option.icon === "user") return i18n.baseText("settings.context.skills.connect.scope.hint.personal");
			return i18n.baseText("settings.context.skills.connect.scope.hint.project", { interpolate: { project: option.label } });
		});
		/**
		* Each reason has its own text. With a credential picked, `not_found` means the credential cannot
		* read the repository. An error without a reason, such as a 404 when skill sync is off, gets
		* `fallback`.
		*/
		function discoverErrorText(error, link, fallback = "settings.context.skills.connect.error.discover") {
			const reason = error instanceof ResponseError ? error.meta?.reason : void 0;
			if (reason === void 0) return i18n.baseText(fallback);
			return reasonText(reason, link, { withCredential: !!credentialId.value });
		}
		const credentialHint = computed(() => {
			const option = selectedScope.value;
			if (!option || option.value === "instance") return i18n.baseText("settings.context.skills.connect.credential.hint.instance");
			if (option.icon === "user") return i18n.baseText("settings.context.skills.connect.credential.hint.personal");
			return i18n.baseText("settings.context.skills.connect.credential.hint.project", { interpolate: { project: option.label } });
		});
		/**
		* Where a credential made from this dialog lives: the project of a project source, or the
		* personal project of the admin for a Global source, since Global uses credentials that
		* admins own.
		*/
		const credentialProject = computed(() => {
			const target = parseScope(scope.value);
			const projectId = target.scope === "instance" ? projectsStore.personalProject?.id : target.projectId;
			if (!projectId) return null;
			if (projectsStore.personalProject?.id === projectId) return projectsStore.personalProject;
			return projectsStore.myProjects.find((project) => project.id === projectId) ?? null;
		});
		const canCreateCredential = computed(() => !!credentialProject.value && !!getResourcePermissions(credentialProject.value.scopes).credential.create);
		const credentialItems = computed(() => [
			{
				value: NO_CREDENTIAL,
				label: i18n.baseText("settings.context.skills.connect.credential.none")
			},
			...credentials.value.map((credential) => ({
				value: credential.id,
				label: credential.name
			})),
			...canCreateCredential.value ? [
				{ type: "separator" },
				{
					value: newCredentialValue("githubApi"),
					label: i18n.baseText("settings.context.skills.connect.credential.new")
				},
				{
					value: newCredentialValue("githubAppApi"),
					label: i18n.baseText("settings.context.skills.connect.credential.newApp")
				},
				{
					value: NEW_OAUTH2_CREDENTIAL,
					label: i18n.baseText("settings.context.skills.connect.credential.newOAuth2")
				}
			] : []
		]);
		const oauth2Picked = computed(() => credentials.value.find((credential) => credential.id === credentialId.value)?.type === OAUTH2_CREDENTIAL_TYPE);
		/** Reads the credentials of the scope; `select` picks one, such as a credential just made. */
		async function loadCredentials(select) {
			const requestedScope = scope.value;
			const run = ++credentialsRun;
			credentialsLoading.value = true;
			try {
				const list = await skillsStore.fetchSourceCredentials(parseScope(requestedScope));
				if (run !== credentialsRun) return;
				credentials.value = list;
				const ids = list.map((credential) => credential.id);
				if (select && ids.includes(select)) credentialId.value = select;
				else if (!ids.includes(credentialId.value)) credentialId.value = "";
			} catch (error) {
				if (run !== credentialsRun) return;
				credentials.value = [];
				credentialId.value = "";
				showError(error, i18n.baseText("settings.context.skills.connect.credential.error.load"));
			} finally {
				if (run === credentialsRun) credentialsLoading.value = false;
			}
		}
		async function loadRepositories() {
			resetRepositories();
			const id = credentialId.value;
			if (!id) {
				keepRepositoryIn([]);
				return;
			}
			const requestedScope = scope.value;
			const run = repositoriesRun;
			repositoriesLoading.value = true;
			try {
				const list = await skillsStore.fetchSourceRepositories({
					...parseScope(requestedScope),
					credentialId: id
				});
				if (run !== repositoriesRun) return;
				repositories.value = list.repositories;
				repositoriesTruncated.value = list.truncated;
				keepRepositoryIn(list.repositories);
			} catch (error) {
				if (run !== repositoriesRun) return;
				linkError.value = discoverErrorText(error, void 0, "settings.context.skills.connect.repository.error.load");
			} finally {
				if (run === repositoriesRun) repositoriesLoading.value = false;
			}
		}
		watch([credentialId, scope], async () => await loadRepositories());
		const selectedRepository = computed(() => repositories.value.find((option) => repositoryKey(option) === repository.value));
		/** A typed link, and a link picked before, show as the first options of the list. */
		const repositoryItems = computed(() => {
			const links = /* @__PURE__ */ new Set();
			const typed = asLink(repositorySearch.value);
			if (typed) links.add(typed);
			if (!selectedRepository.value && asLink(repository.value)) links.add(repository.value);
			return [...[...links].map((link) => ({
				value: link,
				label: link,
				icon: "link"
			})), ...repositories.value.map((option) => ({
				value: repositoryKey(option),
				label: repositoryKey(option)
			}))];
		});
		const repositoryPlaceholder = computed(() => credentialId.value ? i18n.baseText("settings.context.skills.connect.repository.placeholder") : i18n.baseText("settings.context.skills.connect.repository.placeholder.link"));
		const repositoryEmptyText = computed(() => {
			if (!credentialId.value) return i18n.baseText("settings.context.skills.connect.repository.noCredential");
			return repositories.value.length === 0 ? i18n.baseText("settings.context.skills.connect.repository.empty") : i18n.baseText("settings.context.skills.connect.repository.noMatch");
		});
		function isPrivateRepository(key) {
			return repositories.value.some((option) => repositoryKey(option) === key && option.private);
		}
		/** A typed link is the value at once, so the user can go on without a pick. */
		function onRepositorySearch(term) {
			repositorySearch.value = term;
			const link = asLink(term);
			if (link) repository.value = link;
		}
		function onRepositoryChange(value) {
			repository.value = typeof value === "string" ? value : "";
		}
		/** The link that discover reads: the one of the picked repository, or the typed one. */
		const sourceUrl = computed(() => selectedRepository.value?.url ?? asLink(repository.value) ?? "");
		function onScopeChange(value) {
			scope.value = value;
			createdCredential.value = null;
			loadCredentials();
		}
		const credentialModalOpen = computed(() => uiStore.isModalActiveById?.["editCredential"] ?? false);
		/** Where a credential made from this dialog goes, and what its success box says. */
		function newCredentialTarget() {
			const project = credentialProject.value;
			if (!project || !canCreateCredential.value) return null;
			const requestedScope = scope.value;
			const scopeLabel = parseScope(requestedScope).scope === "instance" ? i18n.baseText("settings.context.skills.connect.credential.created.personal") : selectedScope.value?.label ?? "";
			return {
				projectId: project.id,
				requestedScope,
				scopeLabel,
				session: dialogSession
			};
		}
		function openCredentialModal(type, target) {
			uiStore.openNewCredential(type, false, false, target.projectId, void 0, void 0, void 0, {
				hideAskAssistant: true,
				appendToBody: true,
				closeOnSave: true,
				onCredentialCreated: (credential) => {
					onCredentialCreated(credential.id, target);
				}
			});
		}
		async function onCredentialCreated(id, target) {
			if (!props.open || target.session !== dialogSession || step.value !== "repository" || target.requestedScope !== scope.value) return;
			await loadCredentials(id);
			if (credentialId.value === id) createdCredential.value = {
				id,
				scopeLabel: target.scopeLabel
			};
		}
		/**
		* With a managed GitHub OAuth2 app on the instance, n8n creates the credential and opens the
		* GitHub sign-in at once, with no credential form. Call this in the select handler, so that the
		* browser allows the popup.
		*/
		async function signInWithGitHub(target) {
			if (signingIn.value) return;
			signingIn.value = true;
			try {
				const credential = await credentialOAuth.createAndAuthorize(OAUTH2_CREDENTIAL_TYPE, void 0, { projectId: target.projectId });
				if (credential) await onCredentialCreated(credential.id, target);
			} finally {
				if (target.session === dialogSession) signingIn.value = false;
			}
		}
		function createCredential(type) {
			const target = newCredentialTarget();
			if (!target) return;
			if (type === OAUTH2_CREDENTIAL_TYPE && credentialOAuth.canOAuthCredentialQuickConnect(OAUTH2_CREDENTIAL_TYPE)) signInWithGitHub(target);
			else openCredentialModal(type, target);
		}
		function onCredentialSelect(value) {
			const action = parseCredentialSelect(value);
			if (action.kind === "new") {
				createCredential(action.type);
				return;
			}
			credentialId.value = action.kind === "pick" ? action.id : "";
			createdCredential.value = null;
		}
		const sourceLine = computed(() => discovery.value ? sourceLineOf(discovery.value.source) : "");
		const duplicate = computed(() => discovery.value?.duplicate ?? { kind: "none" });
		const isBlocked = computed(() => duplicate.value.kind === "blocked");
		const duplicateSourceId = computed(() => duplicate.value.kind === "blocked" ? duplicate.value.sourceId : null);
		/** A repository that is already connected in Global or in the scope is an error of the field. */
		const duplicateError = computed(() => {
			const dup = duplicate.value;
			if (dup.kind !== "blocked") return "";
			const repo = sourceLine.value;
			return dup.where === "global" ? i18n.baseText("settings.context.skills.connect.duplicate.global", { interpolate: { repo } }) : i18n.baseText("settings.context.skills.connect.duplicate.scope", { interpolate: {
				repo,
				scope: selectedScope.value?.label ?? ""
			} });
		});
		const canGoNext = computed(() => !!sourceUrl.value && !!scope.value && !discovering.value && !isBlocked.value);
		const needsReviewKeys = computed(() => discovery.value?.skills.filter((skill) => selected.value.includes(skill.key) && skill.check?.verdict === "needs_review").map((skill) => skill.key) ?? []);
		const needsReview = computed(() => needsReviewKeys.value.length > 0);
		watch(needsReview, (needed) => {
			if (!needed) reviewed.value = false;
		});
		const canImport = computed(() => selected.value.length > 0 && (!needsReview.value || reviewed.value));
		async function onNext() {
			const link = sourceUrl.value;
			if (!GITHUB_LINK.test(link)) {
				linkError.value = reasonText(OTHER_HOST_LINK.test(link) ? "unsupported_provider" : "invalid_url");
				return;
			}
			const requestedScope = scope.value;
			const requestedCredential = credentialId.value;
			const run = ++discoverRun;
			const isCurrent = () => run === discoverRun && link === sourceUrl.value && requestedScope === scope.value && requestedCredential === credentialId.value;
			const target = {
				url: link,
				...requestedCredential ? { credentialId: requestedCredential } : {}
			};
			discovering.value = true;
			try {
				const result = await skillsStore.discoverSource({
					...target,
					...parseScope(requestedScope)
				});
				if (!isCurrent()) return;
				discovery.value = result;
				discovered.value = target;
				if (result.duplicate.kind === "blocked") return;
				selected.value = result.skills.filter(isSelectableSkill).map((skill) => skill.key);
				reviewed.value = false;
				step.value = "review";
			} catch (error) {
				if (isCurrent()) linkError.value = discoverErrorText(error, link);
			} finally {
				if (run === discoverRun) discovering.value = false;
			}
		}
		function onBack() {
			discoverRun += 1;
			discovering.value = false;
			step.value = "repository";
		}
		/** The scope of a source in the other projects that the user can see. It does not block. */
		const alsoConnected = computed(() => {
			const dup = duplicate.value;
			if (dup.kind !== "warning") return "";
			return i18n.baseText("settings.context.skills.connect.duplicate.warning", { interpolate: { projects: dup.projects.map((project) => project.name).join(", ") } });
		});
		/** The import button names the scope, so the review needs no "Add to" line. */
		const importLabel = computed(() => {
			const count = selected.value.length;
			return parseScope(scope.value).scope === "instance" ? i18n.baseText("settings.context.skills.connect.importGlobal", {
				interpolate: { count },
				adjustToNumber: count
			}) : i18n.baseText("settings.context.skills.connect.importProject", {
				interpolate: {
					count,
					project: selectedScope.value?.label ?? ""
				},
				adjustToNumber: count
			});
		});
		/** A skill that n8n could not read has no name in the answer, so it gets the name in the list. */
		function withSkillName(failure) {
			if (failure.name) return failure;
			const skill = discovery.value?.skills.find((item) => item.key === failure.key);
			return {
				...failure,
				name: skill ? skill.name ?? skill.location : null
			};
		}
		async function onImport() {
			const target = discovered.value;
			if (!discovery.value || !target || !canImport.value) return;
			connecting.value = true;
			try {
				const response = await skillsStore.connectSource({
					...target,
					...parseScope(scope.value),
					skillKeys: selected.value,
					...needsReview.value ? { reviewedSkillKeys: needsReviewKeys.value } : {}
				});
				emit("connected", {
					response: {
						...response,
						failed: response.failed.map(withSkillName)
					},
					sourceLabel: sourceLine.value,
					scopeLabel: selectedScope.value?.label ?? ""
				});
				emit("update:open", false);
			} catch (error) {
				showError(new Error(discoverErrorText(error, void 0, "settings.context.skills.connect.error.connectFailed")), i18n.baseText("settings.context.skills.connect.error.connect"));
			} finally {
				connecting.value = false;
			}
		}
		/**
		* The import runs on the server until it answers, so the dialog stays open until then. It
		* also stays open under the credential modal, which an Escape or a click there must not close.
		*/
		function onOpenChange(open) {
			if (!open && (connecting.value || credentialModalOpen.value)) return;
			emit("update:open", open);
		}
		function onInteractOutside(event) {
			if (credentialModalOpen.value) event.preventDefault();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.open,
				header: unref(i18n).baseText("settings.context.skills.connect.title"),
				size: step.value === "review" ? "full" : "xlarge",
				"container-class": step.value === "review" ? _ctx.$style.wide : void 0,
				"trap-focus": !credentialModalOpen.value,
				"disable-outside-pointer-events": !credentialModalOpen.value,
				"data-test-id": "skill-source-connect-dialog",
				"onUpdate:open": onOpenChange,
				onInteractOutside
			}, {
				default: withCtx(() => [step.value === "repository" ? (openBlock(), createBlock(unref(DialogBody_default), {
					key: 0,
					class: normalizeClass(_ctx.$style.body)
				}, {
					default: withCtx(() => [
						createdCredential.value && createdCredential.value.id === credentialId.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 0,
							theme: "success",
							"data-test-id": "skill-source-credential-created"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.connect.credential.created", { interpolate: { scope: createdCredential.value.scopeLabel } })), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [createVNode(unref(N8nInputLabel_default), {
							label: unref(i18n).baseText("settings.context.skills.connect.scope.label"),
							color: "text-dark"
						}, {
							default: withCtx(() => [createVNode(unref(Select_default), {
								"model-value": scope.value,
								items: scopeItems.value,
								size: "large",
								"data-test-id": "skill-source-scope-select",
								"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => onScopeChange(String($event ?? "")))
							}, null, 8, ["model-value", "items"])]),
							_: 1
						}, 8, ["label"]), createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light",
							"data-test-id": "skill-source-scope-hint"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(scopeHint.value), 1)]),
							_: 1
						})], 2),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [
							createVNode(unref(N8nInputLabel_default), {
								label: unref(i18n).baseText("settings.context.skills.connect.credential.label"),
								color: "text-dark"
							}, {
								default: withCtx(() => [createVNode(unref(Select_default), {
									"model-value": credentialId.value || NO_CREDENTIAL,
									items: credentialItems.value,
									size: "large",
									disabled: credentialsLoading.value || credentialTypesLoading.value || signingIn.value,
									"data-test-id": "skill-source-credential-select",
									"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => onCredentialSelect(String($event ?? "")))
								}, {
									"item-label": withCtx(({ item }) => [item.value === unref(NEW_OAUTH2_CREDENTIAL) ? (openBlock(), createElementBlock("span", {
										key: 0,
										class: normalizeClass(_ctx.$style.itemStack)
									}, [createBaseVNode("span", null, toDisplayString(item.label), 1), createVNode(unref(N8nText_default), {
										tag: "span",
										size: "small",
										color: "warning"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.connect.credential.newOAuth2.note")), 1)]),
										_: 1
									})], 2)) : (openBlock(), createElementBlock("span", _hoisted_1$4, toDisplayString(item.label), 1))]),
									_: 1
								}, 8, [
									"model-value",
									"items",
									"disabled"
								])]),
								_: 1
							}, 8, ["label"]),
							createVNode(unref(N8nText_default), {
								size: "small",
								color: "text-light",
								"data-test-id": "skill-source-credential-hint"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(credentialHint.value), 1)]),
								_: 1
							}),
							oauth2Picked.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
								key: 0,
								theme: "warning",
								"data-test-id": "skill-source-oauth-warning"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.connect.credential.oauth2Warning")), 1)]),
								_: 1
							})) : createCommentVNode("", true)
						], 2),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [
							createVNode(unref(N8nInputLabel_default), {
								label: unref(i18n).baseText("settings.context.skills.connect.repository.label"),
								color: "text-dark"
							}, {
								default: withCtx(() => [createVNode(unref(Combobox_default), {
									"model-value": repository.value || void 0,
									items: repositoryItems.value,
									size: "large",
									clearable: "",
									loading: repositoriesLoading.value,
									placeholder: repositoryPlaceholder.value,
									"empty-text": repositoryEmptyText.value,
									"aria-invalid": duplicateError.value ? "true" : void 0,
									"data-test-id": "skill-source-repository-select",
									"onUpdate:modelValue": onRepositoryChange,
									"onUpdate:searchTerm": onRepositorySearch
								}, {
									"item-trailing": withCtx(({ item }) => [isPrivateRepository(item.value) ? (openBlock(), createBlock(unref(N8nIcon_default), {
										key: 0,
										icon: "lock",
										size: "small",
										title: unref(i18n).baseText("settings.context.skills.connect.repository.private")
									}, null, 8, ["title"])) : createCommentVNode("", true)]),
									_: 1
								}, 8, [
									"model-value",
									"items",
									"loading",
									"placeholder",
									"empty-text",
									"aria-invalid"
								])]),
								_: 1
							}, 8, ["label"]),
							duplicateError.value ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 0,
								size: "small",
								color: "danger",
								"data-test-id": "skill-source-duplicate"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(duplicateError.value) + " ", 1), duplicateSourceId.value ? (openBlock(), createBlock(unref(N8nButton_default), {
									key: 0,
									variant: "ghost",
									size: "small",
									label: unref(i18n).baseText("settings.context.skills.sources.view"),
									"data-test-id": "skill-source-view-existing",
									onClick: _cache[2] || (_cache[2] = ($event) => emit("openSource", duplicateSourceId.value))
								}, null, 8, ["label"])) : createCommentVNode("", true)]),
								_: 1
							})) : (openBlock(), createBlock(unref(N8nText_default), {
								key: 1,
								size: "small",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.connect.repository.hint")), 1)]),
								_: 1
							})),
							repositoriesTruncated.value ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 2,
								size: "small",
								color: "text-light",
								"data-test-id": "skill-source-repositories-truncated"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.connect.repository.truncated")), 1)]),
								_: 1
							})) : createCommentVNode("", true)
						], 2),
						linkError.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 1,
							theme: "danger",
							"data-test-id": "skill-source-link-error"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(linkError.value), 1)]),
							_: 1
						})) : createCommentVNode("", true)
					]),
					_: 1
				}, 8, ["class"])) : discovery.value ? (openBlock(), createBlock(unref(DialogBody_default), {
					key: 1,
					class: normalizeClass(_ctx.$style.body)
				}, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.source) }, [
						createVNode(unref(N8nText_default), {
							bold: "",
							"data-test-id": "skill-source-summary"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(sourceLine.value), 1)]),
							_: 1
						}),
						createVNode(SkillScopeBadge_default, {
							skill: scopeSkill.value,
							label: selectedScope.value?.label
						}, null, 8, ["skill", "label"]),
						alsoConnected.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							size: "small",
							color: "text-light",
							"data-test-id": "skill-source-also-connected"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(alsoConnected.value), 1)]),
							_: 1
						})) : createCommentVNode("", true)
					], 2), createVNode(SkillSourceReview_default, {
						selected: selected.value,
						"onUpdate:selected": _cache[3] || (_cache[3] = ($event) => selected.value = $event),
						discovery: discovery.value,
						"scope-label": selectedScope.value?.label ?? ""
					}, null, 8, [
						"selected",
						"discovery",
						"scope-label"
					])]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true), createVNode(unref(DialogFooter_default), { class: normalizeClass(_ctx.$style.footer) }, {
					default: withCtx(() => [
						step.value === "review" ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 0,
							variant: "ghost",
							label: unref(i18n).baseText("generic.back"),
							disabled: connecting.value,
							"data-test-id": "skill-source-back",
							onClick: onBack
						}, null, 8, ["label", "disabled"])) : createCommentVNode("", true),
						step.value === "review" && needsReview.value ? (openBlock(), createBlock(unref(Checkbox_default), {
							key: 1,
							modelValue: reviewed.value,
							"onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => reviewed.value = $event),
							label: unref(i18n).baseText("settings.context.skills.connect.check.reviewed"),
							"data-test-id": "skill-source-reviewed-warnings"
						}, null, 8, ["modelValue", "label"])) : createCommentVNode("", true),
						createBaseVNode("span", { class: normalizeClass(_ctx.$style.spacer) }, null, 2),
						createVNode(unref(N8nButton_default), {
							variant: "outline",
							label: unref(i18n).baseText("generic.cancel"),
							disabled: connecting.value,
							"data-test-id": "skill-source-cancel",
							onClick: _cache[5] || (_cache[5] = ($event) => onOpenChange(false))
						}, null, 8, ["label", "disabled"]),
						step.value === "repository" ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 2,
							label: unref(i18n).baseText("generic.next"),
							disabled: !canGoNext.value,
							loading: discovering.value,
							"data-test-id": "skill-source-next",
							onClick: onNext
						}, null, 8, [
							"label",
							"disabled",
							"loading"
						])) : (openBlock(), createBlock(unref(N8nButton_default), {
							key: 3,
							label: importLabel.value,
							disabled: !canImport.value,
							loading: connecting.value,
							"data-test-id": "skill-source-import",
							onClick: onImport
						}, null, 8, [
							"label",
							"disabled",
							"loading"
						]))
					]),
					_: 1
				}, 8, ["class"])]),
				_: 1
			}, 8, [
				"open",
				"header",
				"size",
				"container-class",
				"trap-focus",
				"disable-outside-pointer-events"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	body: "_body_1fpgm_1",
	field: "_field_1fpgm_7",
	itemStack: "_itemStack_1fpgm_14",
	source: "_source_1fpgm_20",
	footer: "_footer_1fpgm_27",
	wide: "_wide_1fpgm_32",
	spacer: "_spacer_1fpgm_36"
} }]]);
//#endregion
//#region src/features/settings/context/components/SkillAgentsCell.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$3 = ["aria-label"];
var HIDDEN_AGENTS_ITEM = "hidden-agents";
var USED_BY_HEADER = "used-by";
var SkillAgentsCell_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SkillAgentsCell",
	props: { skill: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const router = useRouter();
		const skillsStore = useSkillsStore();
		const { showError } = useToast();
		const usage = ref(null);
		const loading = ref(false);
		/** The version an agent draft runs, as the design shows it. */
		function versionBadge(draft, published) {
			if (draft.pinned) return {
				label: i18n.baseText("settings.context.skills.versions.agents.pinned", { interpolate: { version: draft.version } }),
				variant: "outline",
				pinned: true
			};
			const label = i18n.baseText("settings.context.skills.versions.agents.latest", { interpolate: { version: draft.version } });
			if (published !== null && published !== void 0 && published !== draft.version) return {
				label,
				variant: "warning",
				pinned: false,
				tooltip: i18n.baseText("settings.context.skills.versions.agents.publishedUses", { interpolate: { version: published } })
			};
			return {
				label,
				variant: "success",
				pinned: false
			};
		}
		/** A draft and a published version of the same agent count once, as `usedByAgents` does. */
		const agents = computed(() => {
			const published = new Map((usage.value?.pins ?? []).map((pin) => [pin.agentId, pin.version]));
			const byId = /* @__PURE__ */ new Map();
			for (const draft of usage.value?.drafts ?? []) byId.set(draft.agentId, {
				agentName: draft.agentName,
				projectId: draft.projectId,
				badge: versionBadge(draft, published.get(draft.agentId))
			});
			for (const pin of usage.value?.pins ?? []) if (!byId.has(pin.agentId)) byId.set(pin.agentId, pin);
			return byId;
		});
		const items = computed(() => {
			const list = [{
				id: USED_BY_HEADER,
				label: i18n.baseText("settings.context.skills.versions.agents.title"),
				header: true
			}, ...[...agents.value].map(([id, agent]) => ({
				id,
				label: agent.agentName,
				icon: {
					type: "icon",
					value: "bot"
				},
				data: agent
			}))];
			const hidden = usage.value?.hiddenAgents ?? 0;
			if (hidden > 0) list.push({
				id: HIDDEN_AGENTS_ITEM,
				label: i18n.baseText("settings.context.skills.agents.hidden", {
					interpolate: { count: hidden },
					adjustToNumber: hidden
				}),
				disabled: true
			});
			return list;
		});
		/** The list row has the count only, so the names load when the menu first opens. */
		async function onOpenChange(open) {
			if (!open || usage.value || loading.value) return;
			loading.value = true;
			try {
				usage.value = (await skillsStore.fetchSkill(props.skill.id)).usedBy;
			} catch (error) {
				showError(error, i18n.baseText("settings.context.skills.error.agents"));
			} finally {
				loading.value = false;
			}
		}
		/** Opens the agent in a new tab, so the skills list keeps its search and page. */
		function onSelect(agentId) {
			const agent = agents.value.get(agentId);
			if (!agent) return;
			const { href } = router.resolve({
				name: AGENT_BUILDER_VIEW,
				params: {
					projectId: agent.projectId,
					agentId
				}
			});
			window.open(href, "_blank", "noopener");
		}
		return (_ctx, _cache) => {
			return props.skill.usedByAgents > 0 ? (openBlock(), createElementBlock("span", {
				key: 0,
				onClick: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop"]))
			}, [createVNode(unref(DropdownMenu_default), {
				items: items.value,
				loading: loading.value,
				"loading-item-count": Math.min(props.skill.usedByAgents, 3),
				modal: false,
				placement: "bottom-start",
				"content-test-id": "skill-agents-menu",
				"onUpdate:modelValue": onOpenChange,
				onSelect
			}, {
				"item-trailing": withCtx(({ item }) => [item.data?.badge ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 0,
					content: item.data.badge.tooltip,
					disabled: !item.data.badge.tooltip,
					placement: "top"
				}, {
					default: withCtx(() => [createVNode(unref(N8nBadge_default), {
						variant: item.data.badge.variant,
						"leading-icon": item.data.badge.pinned ? "pin" : void 0,
						size: "xsmall",
						"data-variant": item.data.badge.variant,
						"data-test-id": "skill-agents-version"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(item.data.badge.label), 1)]),
						_: 2
					}, 1032, [
						"variant",
						"leading-icon",
						"data-variant"
					])]),
					_: 2
				}, 1032, ["content", "disabled"])) : createCommentVNode("", true)]),
				trigger: withCtx(() => [createBaseVNode("button", {
					type: "button",
					class: normalizeClass(_ctx.$style.trigger),
					"aria-label": unref(i18n).baseText("settings.context.skills.agents.label"),
					"data-test-id": "skill-agents-trigger"
				}, [createVNode(unref(N8nText_default), {
					class: normalizeClass(_ctx.$style.count),
					size: "small",
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(props.skill.usedByAgents), 1)]),
					_: 1
				}, 8, ["class"]), createVNode(unref(N8nIcon_default), {
					icon: "chevron-down",
					size: "small",
					color: "text-light"
				})], 10, _hoisted_1$3)]),
				_: 1
			}, 8, [
				"items",
				"loading",
				"loading-item-count"
			])])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	trigger: "_trigger_wmujs_1",
	count: "_count_wmujs_18"
} }]]);
//#endregion
//#region src/features/settings/context/components/SkillSourceHealth.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$2 = ["aria-label"];
var SkillSourceHealth_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SkillSourceHealth",
	props: { source: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const variant = computed(() => props.source.health === "delayed" ? "warning" : "danger");
		const lastCheck = computed(() => props.source.lastCheckedAt ? i18n.baseText("settings.context.skills.sources.health.lastChecked", { interpolate: { time: new Date(props.source.lastCheckedAt).toLocaleString(i18n.locale, {
			dateStyle: "medium",
			timeStyle: "short",
			hour12: false
		}) } }) : i18n.baseText("settings.context.skills.sources.health.neverChecked"));
		const details = computed(() => [
			props.source.health !== "connected" ? i18n.baseText(`settings.context.skills.sources.health.${props.source.health}.description`) : null,
			lastCheck.value,
			i18n.baseText("settings.context.skills.sources.health.schedule"),
			props.source.missingSkills?.length ? i18n.baseText("settings.context.skills.sources.health.missingSkills", { interpolate: { names: props.source.missingSkills.join(", ") } }) : null
		].filter(Boolean).join("\n"));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nTooltip_default), { "as-child": "" }, {
				content: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.details) }, toDisplayString(details.value), 3)]),
				default: withCtx(() => [createBaseVNode("button", {
					type: "button",
					class: normalizeClass(_ctx.$style.trigger),
					"aria-label": unref(i18n).baseText(`settings.context.skills.sources.health.${__props.source.health}`),
					"data-test-id": "skill-source-health",
					onClick: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop"]))
				}, [__props.source.health !== "connected" ? (openBlock(), createBlock(unref(N8nBadge_default), {
					key: 0,
					variant: variant.value,
					"data-test-id": "skill-source-health-badge"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`settings.context.skills.sources.health.${__props.source.health}`)), 1)]),
					_: 1
				}, 8, ["variant"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 1,
					icon: "info",
					size: "small",
					color: "text-light"
				}))], 10, _hoisted_1$2)]),
				_: 1
			});
		};
	}
}), [["__cssModules", { "$style": {
	trigger: "_trigger_njhnx_1",
	details: "_details_njhnx_10"
} }]]);
//#endregion
//#region src/features/settings/context/components/SkillsTable.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = { "data-test-id": "skills-table" };
var _hoisted_2 = ["id"];
var _hoisted_3 = [
	"aria-expanded",
	"aria-label",
	"aria-describedby",
	"onClick"
];
var _hoisted_4 = ["onClick"];
var _hoisted_5 = { "data-test-id": "skill-group-updates" };
var _hoisted_6 = ["aria-label"];
var SkillsTable_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SkillsTable",
	props: /*@__PURE__*/ mergeModels({
		skills: {},
		itemsLength: {},
		pageCount: {},
		loading: { type: Boolean },
		showAssistantAvailability: { type: Boolean },
		showEmpty: { type: Boolean },
		showMcpAvailability: { type: Boolean },
		sources: {},
		collapsedSourceIds: {},
		collapsedSources: {},
		sourceRanges: {},
		checkingSourceIds: {}
	}, {
		"tableOptions": { default: () => ({}) },
		"tableOptionsModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels([
		"open",
		"timeline",
		"download",
		"toggleSource",
		"checkSource",
		"moveSource",
		"reviewSource",
		"deleteSource",
		"replaceCredential",
		"stopSyncing",
		"delete",
		"update:options"
	], ["update:tableOptions"]),
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const tableOptions = useModel(__props, "tableOptions");
		const i18n = useI18n();
		const $style = useCssModule();
		const { deleteBlockedReason } = useSkillDeleteRule();
		const usersStore = useUsersStore();
		function actionsFor(skill) {
			const deleteBlocked = deleteBlockedReason(skill);
			return [
				{
					value: "edit",
					label: i18n.baseText(skill.canEdit ? "settings.context.skills.actions.edit" : "settings.context.skills.actions.view"),
					icon: skill.canEdit ? "pencil" : "eye"
				},
				{
					value: "timeline",
					label: i18n.baseText("settings.context.skills.actions.timeline"),
					icon: "history"
				},
				{
					value: "download",
					label: i18n.baseText("settings.context.skills.actions.download"),
					icon: "download"
				},
				...skill.canStopSyncing ? [{
					value: "stopSyncing",
					label: i18n.baseText("settings.context.skills.stopSyncing.action"),
					icon: "unlink"
				}] : [],
				{
					value: "delete",
					label: i18n.baseText("settings.context.skills.actions.delete"),
					icon: "trash-2",
					disabled: deleteBlocked !== void 0,
					tooltip: deleteBlocked,
					class: $style.deleteAction
				}
			];
		}
		function onAction(skill, action) {
			if (action === "edit") emit("open", skill);
			else if (action === "timeline") emit("timeline", skill);
			else if (action === "download") emit("download", skill);
			else if (action === "stopSyncing") emit("stopSyncing", skill);
			else emit("delete", skill);
		}
		const sourcesById = computed(() => new Map((props.sources ?? []).map((source) => [source.id, source])));
		const collapsed = computed(() => new Set(props.collapsedSourceIds ?? []));
		const sourceRangesById = computed(() => new Map((props.sourceRanges ?? []).map((range) => [range.sourceId, range])));
		const collapsedSourceCounts = computed(() => new Map((props.collapsedSources ?? []).map(({ sourceId, skillCount }) => [sourceId, skillCount])));
		function groupOf(skill) {
			return skill.sourceId ?? void 0;
		}
		const extraGroups = computed(() => (props.collapsedSources ?? []).map(({ sourceId, index }) => ({
			group: sourceId,
			index
		})));
		/** A source with no synced skills has nothing to fold. */
		function canFold(sourceId) {
			return collapsedSourceCounts.value.get(sourceId) !== 0;
		}
		function sourceNote(sourceId) {
			const range = sourceRangesById.value.get(sourceId);
			if (collapsed.value.has(sourceId)) {
				const count = range?.total ?? collapsedSourceCounts.value.get(sourceId) ?? sourcesById.value.get(sourceId)?.skillCount;
				if (!count) return void 0;
				return i18n.baseText("settings.context.skills.sources.collapsedCount", {
					interpolate: { count: count.toLocaleString(i18n.locale) },
					adjustToNumber: count
				});
			}
			if (!range || range.start === 1 && range.end === range.total) return void 0;
			return i18n.baseText(range.start === range.end ? "settings.context.skills.sources.pagePosition" : "settings.context.skills.sources.pageRange", { interpolate: {
				start: range.start.toLocaleString(i18n.locale),
				end: range.end.toLocaleString(i18n.locale),
				count: range.total.toLocaleString(i18n.locale)
			} });
		}
		function toggleSource(sourceId) {
			if (canFold(sourceId)) emit("toggleSource", sourceId);
		}
		/** `owner/repository · branch`, the one format for a repository everywhere. */
		function sourceName(sourceId) {
			const source = sourcesById.value.get(sourceId);
			if (!source) return i18n.baseText("settings.context.skills.sources.unknown");
			return [source.label, source.ref].filter(Boolean).join(" · ");
		}
		function scopeOf(source) {
			return {
				scope: source.projectId ? "project" : "instance",
				projectId: source.projectId,
				projectName: source.projectName,
				projectType: source.projectType
			};
		}
		/** The updates that wait for review. Users without update rights see no count. */
		function updateCount(source) {
			return source.canReview ? source.updatesAvailable + source.updatesBlocked : 0;
		}
		function sourceActions(source) {
			const items = [];
			if (source.canReview) {
				items.push({
					value: "reviewSkills",
					label: i18n.baseText("settings.context.skills.sources.reviewSkills"),
					icon: "book-open"
				});
				items.push({
					value: "checkNow",
					label: i18n.baseText("settings.context.skills.checkForUpdates.action"),
					icon: "refresh-cw"
				});
			}
			if (source.canMove) items.push({
				value: "changeScope",
				label: i18n.baseText("settings.context.skills.moveSource.action"),
				icon: "folder"
			});
			items.push({
				value: "openInGitHub",
				label: i18n.baseText("settings.context.skills.sources.openInGitHub"),
				icon: "external-link"
			});
			if (source.canReplaceCredential) items.push({
				value: "replaceCredential",
				label: i18n.baseText("settings.context.skills.sources.replaceCredential.action"),
				icon: "key-round"
			});
			if (source.canDelete) items.push({
				value: "deleteSource",
				label: i18n.baseText("settings.context.skills.sources.delete.action"),
				icon: "trash-2",
				destructive: true
			});
			return items;
		}
		function onSourceAction(source, action) {
			if (action === "checkNow") emit("checkSource", source);
			else if (action === "reviewSkills") emit("reviewSource", source);
			else if (action === "changeScope") emit("moveSource", source);
			else if (action === "deleteSource") emit("deleteSource", source);
			else if (action === "replaceCredential") emit("replaceCredential", source);
			else window.open(source.webUrl, "_blank", "noopener,noreferrer");
		}
		function isNested(skill) {
			return !!props.sources && !!skill.sourceId;
		}
		function groupRowProps(sourceId) {
			return { class: canFold(sourceId) ? $style.groupRowFoldable : void 0 };
		}
		function onGroupClick(_event, { group }) {
			toggleSource(group);
		}
		function onRowClick(_event, payload) {
			emit("open", payload.item);
		}
		const headers = computed(() => [
			{
				title: i18n.baseText("settings.context.skills.columns.skill"),
				key: "name",
				width: 300
			},
			{
				title: i18n.baseText("settings.context.skills.columns.scope"),
				key: "scope",
				width: 220,
				disableSort: true
			},
			{
				title: i18n.baseText("settings.context.skills.columns.agents"),
				key: "usedByAgents",
				width: 110,
				disableSort: true
			},
			{
				title: i18n.baseText("settings.context.skills.columns.createdBy"),
				key: "createdBy",
				width: 220,
				disableSort: true
			},
			{
				title: i18n.baseText("settings.context.skills.columns.updatedAt"),
				key: "updatedAt",
				width: props.sources ? 180 : 130
			},
			{
				title: "",
				key: "actions",
				align: "end",
				width: 64,
				disableSort: true,
				resize: false,
				value: () => void 0
			}
		]);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", _hoisted_1$1, [createVNode(unref(N8nDataTableServer_default), {
				page: tableOptions.value.page,
				"onUpdate:page": _cache[2] || (_cache[2] = ($event) => tableOptions.value.page = $event),
				"items-per-page": tableOptions.value.itemsPerPage,
				"onUpdate:itemsPerPage": _cache[3] || (_cache[3] = ($event) => tableOptions.value.itemsPerPage = $event),
				"sort-by": tableOptions.value.sortBy,
				headers: headers.value,
				items: props.skills,
				"items-length": props.itemsLength,
				"page-count": props.pageCount,
				loading: props.loading,
				"page-sizes": unref(PREFERENCES_PAGE_SIZES),
				"row-props": { class: unref($style).row },
				"group-by": props.sources ? groupOf : void 0,
				"extra-groups": extraGroups.value,
				"collapsed-groups": props.collapsedSourceIds ?? [],
				"group-row-props": groupRowProps,
				"pin-columns": props.sources ? 1 : 0,
				"pin-end-columns": props.sources ? 2 : 0,
				"onUpdate:options": _cache[4] || (_cache[4] = ($event) => emit("update:options", $event)),
				"onClick:row": onRowClick,
				"onClick:group": onGroupClick
			}, createSlots({
				[`group.name`]: withCtx(({ group }) => [createBaseVNode("div", {
					id: `skill-source-${group}`,
					tabindex: "-1",
					class: normalizeClass(unref($style).group),
					"data-test-id": "skill-group-header"
				}, [
					canFold(group) ? (openBlock(), createElementBlock("button", {
						key: 0,
						type: "button",
						class: normalizeClass(unref($style).groupToggle),
						"aria-expanded": !collapsed.value.has(group),
						"aria-label": sourceName(group),
						"aria-describedby": sourceNote(group) ? `skill-source-count-${group}` : void 0,
						"data-test-id": "skill-group-toggle",
						onClick: withModifiers(($event) => toggleSource(group), ["stop"])
					}, [createVNode(unref(N8nIcon_default), {
						icon: collapsed.value.has(group) ? "chevron-right" : "chevron-down",
						size: "small",
						color: "text-light"
					}, null, 8, ["icon"])], 10, _hoisted_3)) : (openBlock(), createElementBlock("span", {
						key: 1,
						class: normalizeClass(unref($style).groupToggleSpace)
					}, null, 2)),
					createVNode(unref(N8nIcon_default), {
						icon: "git-branch",
						size: "small",
						color: "text-light"
					}),
					createBaseVNode("div", { class: normalizeClass(unref($style).groupLabel) }, [createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-dark",
						bold: "",
						class: normalizeClass(unref($style).groupTitle),
						title: sourceName(group),
						"data-test-id": "skill-group-title"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(sourceName(group)), 1)]),
						_: 2
					}, 1032, ["class", "title"]), !canFold(group) ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "xsmall",
						color: "text-light",
						class: normalizeClass(unref($style).groupNote),
						"data-test-id": "skill-group-empty"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.sources.noSyncedSkills")), 1)]),
						_: 1
					}, 8, ["class"])) : sourceNote(group) ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 1,
						id: `skill-source-count-${group}`,
						size: "xsmall",
						color: "text-light",
						class: normalizeClass(unref($style).groupNote),
						"data-test-id": "skill-group-count"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(sourceNote(group)), 1)]),
						_: 2
					}, 1032, ["id", "class"])) : createCommentVNode("", true)], 2)
				], 10, _hoisted_2)]),
				[`group.scope`]: withCtx(({ group }) => [sourcesById.value.get(group) ? (openBlock(), createBlock(SkillScopeBadge_default, {
					key: 0,
					skill: scopeOf(sourcesById.value.get(group)),
					"project-icon": sourcesById.value.get(group).projectIcon
				}, null, 8, ["skill", "project-icon"])) : createCommentVNode("", true)]),
				[`group.updatedAt`]: withCtx(({ group }) => [sourcesById.value.get(group) ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(unref($style).sourceStatus)
				}, [
					createVNode(SkillSourceHealth_default, { source: sourcesById.value.get(group) }, null, 8, ["source"]),
					props.checkingSourceIds?.includes(group) ? (openBlock(), createBlock(unref(N8nSpinner_default), {
						key: 0,
						size: "small",
						"data-test-id": "skill-group-checking"
					})) : createCommentVNode("", true),
					sourcesById.value.get(group).canReview && sourcesById.value.get(group).newSkillsAvailable > 0 ? (openBlock(), createElementBlock("button", {
						key: 1,
						type: "button",
						class: normalizeClass(unref($style).updateButton),
						"data-test-id": "skill-group-review-new",
						"data-attr": "skill-group-review-new",
						onClick: withModifiers(($event) => emit("reviewSource", sourcesById.value.get(group)), ["stop"])
					}, [createVNode(unref(N8nBadge_default), {
						variant: "outline",
						"data-test-id": "skill-group-new"
					}, {
						leading: withCtx(() => [createVNode(unref(N8nStatusDot_default), {
							variant: "success",
							"data-test-id": "skill-group-new-dot"
						})]),
						default: withCtx(() => [createTextVNode(" " + toDisplayString(unref(i18n).baseText("settings.context.skills.sources.new", { interpolate: { count: sourcesById.value.get(group).newSkillsAvailable } })), 1)]),
						_: 2
					}, 1024)], 10, _hoisted_4)) : createCommentVNode("", true),
					!props.checkingSourceIds?.includes(group) && updateCount(sourcesById.value.get(group)) > 0 ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 2,
						variant: "outline",
						size: "small",
						"data-test-id": "skill-group-review-updates",
						"data-attr": "skill-group-review-updates",
						onClick: withModifiers(($event) => emit("reviewSource", sourcesById.value.get(group)), ["stop"])
					}, {
						icon: withCtx(() => [createVNode(unref(N8nStatusDot_default), {
							variant: sourcesById.value.get(group).updatesAvailable > 0 ? "warning" : "danger",
							"data-test-id": "skill-group-update-status"
						}, null, 8, ["variant"])]),
						default: withCtx(() => [createBaseVNode("span", _hoisted_5, toDisplayString(unref(i18n).baseText(sourcesById.value.get(group).updatesAvailable > 0 ? "settings.context.skills.sources.updates" : "settings.context.skills.sources.updatesBlocked", {
							interpolate: { count: updateCount(sourcesById.value.get(group)) },
							adjustToNumber: updateCount(sourcesById.value.get(group))
						})), 1)]),
						_: 2
					}, 1032, ["onClick"])) : createCommentVNode("", true)
				], 2)) : createCommentVNode("", true)]),
				[`group.actions`]: withCtx(({ group }) => [sourcesById.value.get(group) ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(unref($style).actions),
					onClick: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop"]))
				}, [createVNode(unref(N8nActionToggle_default), {
					actions: sourceActions(sourcesById.value.get(group)),
					"aria-label": unref(i18n).baseText("settings.context.skills.sources.actions", { interpolate: { source: sourceName(group) } }),
					"data-test-id": "skill-group-actions",
					onAction: (action) => onSourceAction(sourcesById.value.get(group), action)
				}, null, 8, [
					"actions",
					"aria-label",
					"onAction"
				])], 2)) : createCommentVNode("", true)]),
				[`item.name`]: withCtx(({ item }) => [createBaseVNode("div", { class: normalizeClass([unref($style).skillCell, isNested(item) && unref($style).nested]) }, [createBaseVNode("div", { class: normalizeClass(unref($style).skillTitle) }, [
					createVNode(unref(N8nText_default), {
						size: "medium",
						color: "text-dark",
						"data-test-id": "skill-name"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(item.name), 1)]),
						_: 2
					}, 1024),
					props.showAssistantAvailability && item.availableToAssistant ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 0,
						content: unref(i18n).baseText("settings.context.skills.assistant.label")
					}, {
						default: withCtx(() => [createVNode(unref(N8nBadge_default), {
							variant: "secondary",
							"leading-icon": "n8n-assistant",
							"data-test-id": "skill-assistant-badge"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.assistant.badge")), 1)]),
							_: 1
						})]),
						_: 1
					}, 8, ["content"])) : createCommentVNode("", true),
					props.showMcpAvailability && item.availableToMCP ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 1,
						placement: "right",
						content: unref(i18n).baseText("settings.context.skills.modal.mcp.label")
					}, {
						default: withCtx(() => [createBaseVNode("span", {
							role: "img",
							"aria-label": unref(i18n).baseText("settings.context.skills.modal.mcp.label"),
							"data-test-id": "skill-available-to-mcp-icon"
						}, [createVNode(unref(N8nIcon_default), {
							icon: "mcp",
							size: "medium",
							color: "text-light"
						})], 8, _hoisted_6)]),
						_: 1
					}, 8, ["content"])) : createCommentVNode("", true)
				], 2), createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light",
					class: normalizeClass(unref($style).description)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(item.description), 1)]),
					_: 2
				}, 1032, ["class"])], 2)]),
				[`item.scope`]: withCtx(({ item }) => [createVNode(SkillScopeBadge_default, { skill: item }, null, 8, ["skill"])]),
				[`item.usedByAgents`]: withCtx(({ item }) => [createVNode(SkillAgentsCell_default, { skill: item }, null, 8, ["skill"])]),
				[`item.createdBy`]: withCtx(({ item }) => [item.createdBy ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(unref($style).creator),
					"data-test-id": "skill-created-by"
				}, [createVNode(unref(N8nUserInfo_default), {
					"first-name": item.createdBy.firstName,
					"last-name": item.createdBy.lastName,
					email: item.createdBy.email,
					"is-current-user": item.createdBy.id === unref(usersStore).currentUserId,
					"hide-avatar": ""
				}, null, 8, [
					"first-name",
					"last-name",
					"email",
					"is-current-user"
				])], 2)) : (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					size: "small",
					color: "text-light",
					"data-test-id": "skill-created-by-none"
				}, {
					default: withCtx(() => [..._cache[5] || (_cache[5] = [createTextVNode(" — ", -1)])]),
					_: 1
				}))]),
				[`item.updatedAt`]: withCtx(({ item }) => [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light",
					"data-test-id": "skill-updated-at"
				}, {
					default: withCtx(() => [createVNode(TimeAgo_default, { date: item.updatedAt }, null, 8, ["date"])]),
					_: 2
				}, 1024)]),
				[`item.actions`]: withCtx(({ item }) => [createBaseVNode("div", {
					class: normalizeClass(unref($style).actions),
					onClick: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"]))
				}, [createVNode(unref(N8nActionToggle_default), {
					actions: actionsFor(item),
					"data-test-id": "skill-actions",
					onAction: (action) => onAction(item, action)
				}, null, 8, ["actions", "onAction"])], 2)]),
				_: 2
			}, [props.showEmpty ? {
				name: "cover",
				fn: withCtx(() => [renderSlot(_ctx.$slots, "empty")]),
				key: "0"
			} : void 0]), 1032, [
				"page",
				"items-per-page",
				"sort-by",
				"headers",
				"items",
				"items-length",
				"page-count",
				"loading",
				"page-sizes",
				"row-props",
				"group-by",
				"extra-groups",
				"collapsed-groups",
				"pin-columns",
				"pin-end-columns"
			])]);
		};
	}
}), [["__cssModules", { "$style": {
	deleteAction: "_deleteAction_mtxe7_1",
	skillCell: "_skillCell_mtxe7_5",
	creator: "_creator_mtxe7_12",
	skillTitle: "_skillTitle_mtxe7_17",
	description: "_description_mtxe7_24",
	actions: "_actions_mtxe7_30",
	row: "_row_mtxe7_35",
	nested: "_nested_mtxe7_39",
	group: "_group_mtxe7_43",
	groupLabel: "_groupLabel_mtxe7_50",
	groupTitle: "_groupTitle_mtxe7_57",
	groupNote: "_groupNote_mtxe7_64",
	groupToggle: "_groupToggle_mtxe7_69",
	groupToggleSpace: "_groupToggleSpace_mtxe7_77",
	groupRowFoldable: "_groupRowFoldable_mtxe7_82",
	updateButton: "_updateButton_mtxe7_86",
	sourceStatus: "_sourceStatus_mtxe7_95"
} }]]);
//#endregion
//#region src/features/settings/context/components/SkillSourceDeleteDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { key: 0 };
var SkillSourceDeleteDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SkillSourceDeleteDialog",
	props: { source: {} },
	emits: ["close", "deleted"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const skillsStore = useSkillsStore();
		const { showError, showMessage } = useToast();
		/** The action that runs, so that only its button shows progress. */
		const pending = ref();
		const block = ref();
		async function deleteSource(keepSkills = false) {
			if (pending.value || !props.source.canDelete) return;
			pending.value = keepSkills ? "keep" : "delete";
			try {
				if (keepSkills) await skillsStore.deleteSource(props.source.id, { keepSkills: true });
				else await skillsStore.deleteSource(props.source.id);
				showMessage({
					title: i18n.baseText(keepSkills ? "settings.context.skills.sources.delete.keep.success" : "settings.context.skills.sources.delete.success"),
					type: "success"
				});
				emit("deleted");
			} catch (error) {
				const parsed = skillSourceDeleteBlockSchema.safeParse(error instanceof ResponseError && error.httpStatusCode === 409 ? error.meta : void 0);
				if (parsed.success) block.value = parsed.data;
				else showError(error, i18n.baseText("settings.context.skills.sources.delete.error"));
			} finally {
				pending.value = void 0;
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: "",
				header: unref(i18n).baseText(block.value ? "settings.context.skills.sources.delete.blocked.title" : "settings.context.skills.sources.delete.title"),
				"data-test-id": "skill-source-delete-dialog",
				"onUpdate:open": _cache[3] || (_cache[3] = ($event) => !$event && !pending.value && emit("close"))
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), {
					"aria-live": "polite",
					class: normalizeClass(_ctx.$style.message)
				}, {
					default: withCtx(() => [
						block.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
							createVNode(unref(N8nText_default), { tag: "p" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.sources.delete.blocked.message")), 1)]),
								_: 1
							}),
							block.value.agents.length ? (openBlock(), createElementBlock("ul", _hoisted_1, [(openBlock(true), createElementBlock(Fragment, null, renderList(block.value.agents, (agent) => {
								return openBlock(), createElementBlock("li", { key: agent.agentId }, toDisplayString(agent.agentName) + " · " + toDisplayString(agent.projectName), 1);
							}), 128))])) : createCommentVNode("", true),
							block.value.hiddenAgents ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 1,
								tag: "p"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.agents.hidden", {
									interpolate: { count: block.value.hiddenAgents },
									adjustToNumber: block.value.hiddenAgents
								})), 1)]),
								_: 1
							})) : createCommentVNode("", true)
						], 64)) : (openBlock(), createBlock(unref(N8nText_default), {
							key: 1,
							tag: "p"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.sources.delete.message", {
								interpolate: {
									source: __props.source.label,
									count: __props.source.skillCount
								},
								adjustToNumber: __props.source.skillCount
							})), 1)]),
							_: 1
						})),
						__props.source.skillCount ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 2,
							tag: "p"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.sources.delete.keep.message")), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						__props.source.skillCount ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 3,
							tag: "p"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.stopSyncing.confirm.keep", { adjustToNumber: __props.source.skillCount })), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						__props.source.skillCount ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 4,
							tag: "p"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.stopSyncing.confirm.updates")), 1)]),
							_: 1
						})) : createCommentVNode("", true)
					]),
					_: 1
				}, 8, ["class"]), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [
						createVNode(unref(N8nButton_default), {
							variant: "outline",
							disabled: !!pending.value,
							onClick: _cache[0] || (_cache[0] = ($event) => emit("close"))
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(block.value ? "generic.close" : "generic.cancel")), 1)]),
							_: 1
						}, 8, ["disabled"]),
						__props.source.skillCount ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 0,
							variant: "outline",
							loading: pending.value === "keep",
							disabled: !!pending.value || !__props.source.canDelete,
							onClick: _cache[1] || (_cache[1] = ($event) => deleteSource(true))
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.stopSyncing.action")), 1)]),
							_: 1
						}, 8, ["loading", "disabled"])) : createCommentVNode("", true),
						!block.value ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 1,
							variant: "destructive",
							loading: pending.value === "delete",
							disabled: !!pending.value || !__props.source.canDelete,
							onClick: _cache[2] || (_cache[2] = ($event) => deleteSource())
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(__props.source.skillCount ? "settings.context.skills.sources.delete.skills" : "settings.context.skills.sources.delete.action")), 1)]),
							_: 1
						}, 8, ["loading", "disabled"])) : createCommentVNode("", true)
					]),
					_: 1
				})]),
				_: 1
			}, 8, ["header"]);
		};
	}
}), [["__cssModules", { "$style": { message: "_message_1dkxt_2" } }]]);
//#endregion
//#region src/features/settings/context/components/SkillSourceCredentialDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var SkillSourceCredentialDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SkillSourceCredentialDialog",
	props: { source: {} },
	emits: ["close", "replaced"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const store = useSkillsStore();
		const { showError, showMessage } = useToast();
		const { reasonText } = useSkillSourceReasons();
		const credentials = ref([]);
		const credentialId = ref("");
		const loading = ref(true);
		const saving = ref(false);
		const errorText = ref("");
		const items = computed(() => credentials.value.map(({ id, name }) => ({
			value: id,
			label: name
		})));
		let isOpen = true;
		onBeforeUnmount(() => {
			isOpen = false;
		});
		onMounted(async () => {
			try {
				credentials.value = await store.fetchReplacementCredentials(props.source);
			} catch (error) {
				if (isOpen) showError(error, i18n.baseText("settings.context.skills.connect.credential.error.load"));
			} finally {
				loading.value = false;
			}
		});
		function onSelect(value) {
			credentialId.value = typeof value === "string" ? value : "";
			errorText.value = "";
		}
		async function replace() {
			if (saving.value || !credentialId.value || !props.source.canReplaceCredential) return;
			saving.value = true;
			errorText.value = "";
			try {
				await store.replaceSourceCredential(props.source, credentialId.value);
				showMessage({
					title: i18n.baseText("settings.context.skills.sources.replaceCredential.success"),
					type: "success"
				});
				emit("replaced");
			} catch (error) {
				const reason = error instanceof ResponseError ? error.meta?.reason : void 0;
				errorText.value = reason ? reasonText(reason, void 0, { withCredential: true }) : i18n.baseText("settings.context.skills.sources.replaceCredential.error");
			} finally {
				saving.value = false;
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: "",
				header: unref(i18n).baseText("settings.context.skills.sources.replaceCredential.action"),
				"data-test-id": "skill-source-credential-dialog",
				"onUpdate:open": _cache[1] || (_cache[1] = ($event) => !$event && !saving.value && emit("close"))
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createBaseVNode("form", {
						id: "replace-source-credential",
						class: normalizeClass(_ctx.$style.form),
						onSubmit: withModifiers(replace, ["prevent"])
					}, [
						createVNode(unref(N8nText_default), { tag: "p" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.sources.replaceCredential.message", { interpolate: { source: __props.source.label } })), 1)]),
							_: 1
						}),
						createVNode(unref(N8nInputLabel_default), {
							label: unref(i18n).baseText("settings.context.skills.connect.credential.label"),
							"input-name": "source-replacement-credential"
						}, {
							default: withCtx(() => [createVNode(unref(Select_default), {
								id: "source-replacement-credential",
								"model-value": credentialId.value,
								items: items.value,
								disabled: loading.value || saving.value,
								placeholder: unref(i18n).baseText("settings.context.skills.sources.replaceCredential.placeholder"),
								"data-test-id": "skill-source-credential-select",
								"onUpdate:modelValue": onSelect
							}, null, 8, [
								"model-value",
								"items",
								"disabled",
								"placeholder"
							])]),
							_: 1
						}, 8, ["label"]),
						!loading.value && !credentials.value.length ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							tag: "p"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.sources.replaceCredential.empty")), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						errorText.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 1,
							role: "alert",
							color: "danger"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(errorText.value), 1)]),
							_: 1
						})) : createCommentVNode("", true)
					], 34)]),
					_: 1
				}), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "outline",
						disabled: saving.value,
						onClick: _cache[0] || (_cache[0] = ($event) => emit("close"))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.cancel")), 1)]),
						_: 1
					}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
						type: "submit",
						form: "replace-source-credential",
						disabled: loading.value || !credentialId.value,
						loading: saving.value,
						"data-test-id": "skill-source-credential-save",
						"data-attr": "skill-source-credential-save"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.sources.replaceCredential.action")), 1)]),
						_: 1
					}, 8, ["disabled", "loading"])]),
					_: 1
				})]),
				_: 1
			}, 8, ["header"]);
		};
	}
}), [["__cssModules", { "$style": { form: "_form_1o8s8_1" } }]]);
//#endregion
//#region src/features/settings/context/composables/useSkillSyncFlag.ts
init_runtime_core_esm_bundler();
/**
* Whether the user sees Skill Sync: the source rows of the skills table and "Connect to GitHub". The backend gates
* its routes with the same per-user flag. The server-evaluated flags carry the local overrides
* (`N8N_FEATURE_FLAG_OVERRIDES`), so the flag also works with telemetry off.
*/
var useSkillSyncFlag = () => {
	const postHog = usePostHog();
	return computed(() => postHog.isFeatureEnabled(SKILL_SYNC_FLAG) === true);
};
var useSkillSyncEnabled = () => {
	const settingsStore = useSettingsStore();
	const isFlagEnabled = useSkillSyncFlag();
	return computed(() => isFlagEnabled.value && settingsStore.moduleSettings.skills?.skillSyncEnabled === true);
};
//#endregion
//#region src/features/settings/context/views/SettingsSkillsView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var INSTANCE_SCOPE = "instance";
var SettingsSkillsView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsSkillsView",
	setup(__props) {
		const FILTER_KEYS = [
			"scope",
			"agentId",
			"createdById",
			"sourceIds"
		];
		const NO_FILTERS = {
			scope: "",
			agentId: "",
			createdById: "",
			sourceIds: []
		};
		const i18n = useI18n();
		const $style = useCssModule();
		const router = useRouter();
		const route = useRoute();
		const documentTitle = useDocumentTitle();
		const message = useMessage();
		const uiStore = useUIStore();
		const projectsStore = useProjectsStore();
		const skillsStore = useSkillsStore();
		const settingsStore = useSettingsStore();
		const { isEnabled: assistantSkillsExperimentEnabled } = useAssistantSkillsExperiment();
		const assistantSkillsEnabled = computed(() => assistantSkillsExperimentEnabled.value && settingsStore.moduleSettings["instance-ai"]?.enabled === true);
		const posthogStore = usePostHog();
		const { deleteBlockedReason } = useSkillDeleteRule();
		const telemetry = useTelemetry();
		const { showError, showMessage } = useToast();
		const { scopeDisplay } = useSkillScopeDisplay();
		const { failedSkillReason, reasonText } = useSkillSourceReasons();
		const skillSyncFlagEnabled = useSkillSyncFlag();
		const skillSyncEnabled = useSkillSyncEnabled();
		const rbacStore = useRBACStore();
		const canManageSkillSync = computed(() => skillSyncFlagEnabled.value && rbacStore.hasScope("skill:manage"));
		const skillSyncManagedByEnv = computed(() => settingsStore.moduleSettings.skills?.skillSyncManagedByEnv === true);
		const skillSyncSaving = ref(false);
		async function isSkillSyncTurnedOff() {
			await settingsStore.getModuleSettings().catch(() => void 0);
			return !skillSyncEnabled.value;
		}
		async function onSkillSyncEnabledChange(enabled) {
			skillSyncSaving.value = true;
			try {
				await skillsStore.setSkillSyncEnabled(enabled);
			} catch (error) {
				showError(error, i18n.baseText("settings.context.skills.skillSync.saveError"));
			} finally {
				skillSyncSaving.value = false;
			}
		}
		const { showRecommendedSkills, hasVariant: hasRecommendedSkillsVariant, trackExposure: trackRecommendedSkillsExposure, trackSkillAdded: trackRecommendedSkillAdded } = useRecommendedSkillsExperiment();
		const connectOpen = ref(false);
		const movingSource = ref(null);
		const recommendedOpen = ref(false);
		const sourceToDelete = ref();
		const sourceToReplaceCredential = ref();
		const usersStore = useUsersStore();
		const defaultTableOptions = {
			page: 0,
			itemsPerPage: 10,
			sortBy: CONTEXT_DEFAULT_SORT_BY
		};
		const tableOptions = useLocalStorage(() => `n8n-skills-pagination:${usersStore.currentUserId ?? "anonymous"}`, { ...defaultTableOptions }, {
			listenToStorageChanges: false,
			serializer: {
				read(value) {
					const saved = JSON.parse(value);
					if (!isRecord(saved)) return { ...defaultTableOptions };
					return {
						page: typeof saved.page === "number" && Number.isSafeInteger(saved.page) && saved.page >= 0 ? saved.page : 0,
						itemsPerPage: typeof saved.itemsPerPage === "number" && PREFERENCES_PAGE_SIZES.includes(saved.itemsPerPage) ? saved.itemsPerPage : 10,
						sortBy: CONTEXT_DEFAULT_SORT_BY
					};
				},
				write: ({ page, itemsPerPage }) => JSON.stringify({
					page,
					itemsPerPage
				})
			}
		});
		const search = ref("");
		const filters = ref({ ...NO_FILTERS });
		const agentOptions = ref([]);
		const selectedAgent = ref(null);
		const agentsLoading = ref(false);
		const agentFilterOptions = computed(() => selectedAgent.value && !agentOptions.value.some((agent) => agent.id === selectedAgent.value?.id) ? [selectedAgent.value, ...agentOptions.value] : agentOptions.value);
		const creators = ref([]);
		const loadFailed = ref(false);
		const mcpSkillsEnabled = computed(() => posthogStore.isFeatureEnabled(MCP_SKILLS_EXTENSION_FLAG));
		const loadedFiltered = ref(false);
		const hasLoaded = ref(false);
		const showLoading = computed(() => skillsStore.loading && !hasLoaded.value);
		const emptyState = computed(() => {
			if (!hasLoaded.value || loadFailed.value || skillsStore.count > 0) return "none";
			return loadedFiltered.value ? "noResults" : "noSkills";
		});
		const scopeFilterOptions = computed(() => [["instance", "settings.context.skills.filter.instance"], ["project", "settings.context.skills.filter.project"]].map(([value, key]) => ({
			value,
			label: i18n.baseText(key)
		})));
		/** The name of a creator, or the email when the name is unknown. */
		function creatorLabel(creator) {
			return preferenceUserName(creator) || creator.id;
		}
		const sourceFilterOptions = computed(() => skillsStore.sources.map((source) => {
			const { label: scope } = scopeDisplay({
				...source,
				scope: source.projectId ? "project" : "instance"
			});
			return {
				value: source.id,
				label: `${sourceLineOf(source)} · ${scope}`
			};
		}).sort((a, b) => a.label.localeCompare(b.label)));
		function scopeQuery(scope) {
			const parsed = skillScopeSchema.safeParse(scope);
			return parsed.success ? { scope: parsed.data } : {};
		}
		function listQuery(page, itemsPerPage) {
			const term = search.value.trim();
			const { scope, agentId, createdById, sourceIds } = filters.value;
			const sortBy = toSortOption(tableOptions.value.sortBy, SKILLS_SORT_OPTIONS);
			return {
				skip: page * itemsPerPage,
				take: itemsPerPage,
				...term ? { search: term } : {},
				...scopeQuery(scope),
				...agentId ? { agentId } : {},
				...createdById ? { createdById } : {},
				...sortBy ? { sortBy } : {},
				...skillSyncEnabled.value ? {
					groupBy: "source",
					page,
					...sourceIds.length > 0 ? { sourceIds: sourceIds.join(",") } : {},
					...collapsedSourceIds.value.length > 0 ? { collapsedSourceIds: collapsedSourceIds.value.join(",") } : {}
				} : {}
			};
		}
		/**
		* Where a new skill can live: the instance, the personal project and the team projects
		* that the user may write to.
		*/
		const scopeOptions = computed(() => {
			const options = [];
			if (canWriteInstanceSkillScope()) options.push({
				value: INSTANCE_SCOPE,
				label: i18n.baseText("settings.context.skills.scope.instance"),
				icon: "globe",
				target: { projectId: null }
			});
			const personalProject = projectsStore.personalProject;
			if (personalProject && canWriteProjectSkillScope(personalProject.id)) options.push({
				value: `${PROJECT_SCOPE_PREFIX}${personalProject.id}`,
				label: i18n.baseText("settings.context.skills.scope.personalProject"),
				icon: "user",
				projectIcon: personalProject.icon,
				target: { projectId: personalProject.id }
			});
			for (const project of projectsStore.myProjects) {
				if (project.type !== "team" || !canWriteProjectSkillScope(project.id)) continue;
				options.push({
					value: `${PROJECT_SCOPE_PREFIX}${project.id}`,
					label: project.name ?? project.id,
					icon: "layers",
					projectIcon: project.icon,
					target: { projectId: project.id }
				});
			}
			return options;
		});
		const { next: nextLoad } = useLatestFetch();
		async function load(focusSourceId) {
			const isLatest = nextLoad();
			const { page = 0, itemsPerPage = 10 } = tableOptions.value;
			const query = {
				...listQuery(page, itemsPerPage),
				...focusSourceId ? { focusSourceId } : {}
			};
			const filtered = [
				query.search,
				query.scope,
				query.agentId,
				query.createdById,
				query.sourceIds
			].some((value) => value !== void 0);
			try {
				await skillsStore.fetchSkills(query);
				if (!isLatest()) return;
				const lastPage = Math.max(0, (skillsStore.pageCount ?? Math.ceil(skillsStore.count / itemsPerPage)) - 1);
				if (skillsStore.page !== void 0 && skillsStore.page !== page) tableOptions.value = {
					...tableOptions.value,
					page: skillsStore.page
				};
				if (skillsStore.page === void 0 && page > lastPage) {
					tableOptions.value = {
						...tableOptions.value,
						page: lastPage
					};
					await skillsStore.fetchSkills(listQuery(lastPage, itemsPerPage));
					if (!isLatest()) return;
				}
				loadFailed.value = false;
				loadedFiltered.value = filtered;
			} catch (error) {
				if (!isLatest()) return;
				if (query.groupBy === "source" && await isSkillSyncTurnedOff()) return;
				if (!isLatest()) return;
				loadFailed.value = true;
				showError(error, i18n.baseText("settings.context.skills.error.load"));
			} finally {
				if (isLatest()) hasLoaded.value = true;
			}
		}
		async function onOptionsUpdate(options) {
			tableOptions.value = {
				...options,
				sortBy: keepSortOnClear(tableOptions.value.sortBy, options.sortBy)
			};
			await load();
		}
		/** A new filter starts at the first page. */
		async function resetPage() {
			tableOptions.value = {
				...tableOptions.value,
				page: 0
			};
			await load();
		}
		const onSearch = useDebounceFn(resetPage, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
		async function setFilter(key, value) {
			filters.value = {
				...filters.value,
				[key]: typeof value === "string" ? value : ""
			};
			await resetPage();
		}
		/** Keeps the picked agent, so its name still shows when a later search leaves it out. */
		async function onAgentFilter(value) {
			selectedAgent.value = agentFilterOptions.value.find((agent) => agent.id === value) ?? null;
			await setFilter("agentId", value);
		}
		const { next: nextAgentSearch } = useLatestFetch();
		/** The agent filter searches on the server and lists a capped page of matches. */
		async function searchAgents(term = "") {
			const isLatest = nextAgentSearch();
			agentsLoading.value = true;
			try {
				const agents = await skillsStore.fetchAgents(term.trim() ? { search: term.trim() } : {});
				if (isLatest()) agentOptions.value = agents;
			} catch {} finally {
				if (isLatest()) agentsLoading.value = false;
			}
		}
		const onAgentSearch = useDebounceFn(searchAgents, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
		const { next: nextCreatorsLoad } = useLatestFetch();
		async function loadCreators() {
			const isLatest = nextCreatorsLoad();
			try {
				const users = await skillsStore.fetchCreators();
				if (!isLatest()) return;
				creators.value = [...users].sort((a, b) => creatorLabel(a).localeCompare(creatorLabel(b)));
			} catch {}
		}
		async function resetFilters() {
			filters.value = { ...NO_FILTERS };
			await resetPage();
		}
		/** Options for the filters. Each one is optional, so a failed read leaves its list empty. */
		async function loadFilterOptions() {
			await Promise.all([searchAgents(), loadCreators()]);
		}
		function openModal(data) {
			dropPendingUpload();
			uiStore.openModalWithData({
				name: AGENT_SKILL_MODAL_KEY,
				data
			});
		}
		/**
		* Opens the create modal. Without `preset` it starts at the SKILL.md upload step, which also
		* offers "Add manually". The create menu presets the form step, or a skill the user uploaded.
		*/
		function openCreateModal(preset = {}, onCreated) {
			const options = scopeOptions.value;
			if (options.length === 0) return;
			openModal({
				...preset,
				scopeOptions: options,
				initialScope: options[0].value,
				...mcpSkillsEnabled.value ? { availableToMCP: false } : {},
				existingSkillNames: [],
				getDefaultName: async (scopeValue) => await skillsStore.fetchNewSkillName({
					...parseScope(scopeValue),
					name: i18n.baseText("agents.builder.skills.defaultName")
				}),
				onConfirm: async ({ skill, scope, method, availableToMCP }) => await onCreate(skill, scope ?? options[0].value, method, availableToMCP, onCreated)
			});
		}
		function onRecommendedSkillSelect(entryPoint, recommended) {
			openCreateModal({ skill: recommended.skill }, (skillId) => trackRecommendedSkillAdded(recommended.id, skillId, entryPoint));
		}
		const uploadBusy = ref(false);
		let pendingUpload = null;
		function dropPendingUpload() {
			pendingUpload = null;
			uploadBusy.value = false;
		}
		onBeforeUnmount(dropPendingUpload);
		const createMenuItems = computed(() => [
			...skillSyncEnabled.value ? [{
				id: "github",
				label: i18n.baseText("settings.context.skills.actions.connectGithub"),
				icon: "git-branch",
				testId: "skills-create-github"
			}] : [],
			{
				id: "uploadFolder",
				label: i18n.baseText("settings.context.skills.actions.uploadFolder"),
				icon: "folder-open",
				testId: "skills-create-upload-folder",
				disabled: uploadBusy.value
			},
			{
				id: "uploadFile",
				label: i18n.baseText("settings.context.skills.actions.uploadSkillFile"),
				icon: "file-text",
				testId: "skills-create-upload-file",
				disabled: uploadBusy.value
			},
			{
				id: "manual",
				label: i18n.baseText("settings.context.skills.actions.createManually"),
				icon: "pen",
				testId: "skills-create-manual"
			},
			...showRecommendedSkills.value ? [{
				id: "recommended",
				label: i18n.baseText("experiments.recommendedSkills.menuItem"),
				icon: "sparkles",
				testId: "skills-create-recommended"
			}] : []
		]);
		const recommendedSkillsEligible = computed(() => emptyState.value === "noSkills" && skillsStore.collapsedSources.length === 0 && scopeOptions.value.length > 0);
		const showRecommendedEmptyState = computed(() => recommendedSkillsEligible.value && showRecommendedSkills.value);
		watch(() => recommendedSkillsEligible.value && hasRecommendedSkillsVariant.value, (eligible) => {
			if (eligible) trackRecommendedSkillsExposure();
		});
		const emptyStateCreateMenuItems = computed(() => createMenuItems.value.filter(({ id }) => id !== "recommended"));
		const skillFolderInput = useTemplateRef("skillFolderInput");
		const skillFileInput = useTemplateRef("skillFileInput");
		const { importSkillFiles } = useAgentSkillImport();
		function onCreateMenuSelect(action) {
			if (action === "uploadFolder") skillFolderInput.value?.click();
			else if (action === "uploadFile") skillFileInput.value?.click();
			else if (action === "manual") openCreateModal({ initialStep: "manual" });
			else {
				dropPendingUpload();
				if (action === "recommended") recommendedOpen.value = true;
				else connectOpen.value = true;
			}
		}
		/** Reads the picked folder or SKILL.md, then opens the form with the skill for review. */
		async function onSkillFilesPicked(event) {
			const input = event.target;
			if (!(input instanceof HTMLInputElement)) return;
			const files = Array.from(input.files ?? []);
			input.value = "";
			if (files.length === 0 || uploadBusy.value) return;
			const request = {};
			pendingUpload = request;
			uploadBusy.value = true;
			try {
				const skill = await importSkillFiles(files);
				if (pendingUpload !== request) return;
				openCreateModal({
					skill,
					initialMethod: "upload"
				});
			} catch (error) {
				if (pendingUpload !== request) return;
				const message = error instanceof AgentSkillImportError ? i18n.baseText(error.i18nKey, { interpolate: error.interpolate }) : i18n.baseText("agents.builder.skills.import.invalidFolder");
				showError(new Error(message), i18n.baseText("settings.context.skills.upload.error"));
			} finally {
				if (pendingUpload === request) dropPendingUpload();
			}
		}
		function failedNames(failed) {
			return failed.map((item) => i18n.baseText("settings.context.skills.connect.failed.item", { interpolate: {
				name: item.name ?? item.key,
				reason: failedSkillReason(item.reason)
			} })).join(", ");
		}
		/** The imported skills are new rows, so the list reloads. Skills that did not come in are named. */
		async function onSourceConnected({ response, sourceLabel, scopeLabel }) {
			const failed = response.failed.length > 0 ? failedNames(response.failed) : "";
			if (response.imported.length > 0) showMessage({
				title: i18n.baseText("settings.context.skills.connect.success", {
					interpolate: {
						count: response.imported.length,
						scope: scopeLabel,
						repo: sourceLabel
					},
					adjustToNumber: response.imported.length
				}),
				...failed ? { message: i18n.baseText("settings.context.skills.connect.failed", { interpolate: { names: failed } }) } : {},
				type: failed ? "warning" : "success"
			});
			else showMessage({
				title: i18n.baseText("settings.context.skills.connect.error.connect"),
				message: i18n.baseText("settings.context.skills.connect.failed", { interpolate: { names: failed } }),
				type: "error"
			});
			loadCreators();
			await Promise.all([load(), loadSources()]);
		}
		/**
		* The row is the feedback for a create or a save, as on the preferences page. The list
		* keeps the search and the scope filter, so a skill they hide gets a message instead.
		*/
		function confirmIfHidden(skillId, key) {
			if (skillsStore.skills.some((item) => item.id === skillId)) return;
			showMessage({
				title: i18n.baseText(key === "created" ? "settings.context.skills.create.hidden" : "settings.context.skills.save.hidden"),
				type: "success"
			});
		}
		/**
		* A refused save keeps the modal open, so the user keeps what they typed. A taken name
		* shows on the name field, any other error in a toast.
		*/
		function saveFailed(error) {
			if (isSkillNameTakenError(error)) return {
				saved: false,
				nameError: i18n.baseText("settings.context.skills.error.nameTaken")
			};
			showError(error, i18n.baseText("settings.context.skills.error.save"));
			return { saved: false };
		}
		async function onCreate(skill, scopeValue, method, availableToMCP, onCreated) {
			let createdId;
			try {
				createdId = (await skillsStore.createSkill({
					...parseScope(scopeValue),
					skill,
					...method ? { method } : {},
					availableToMCP
				})).id;
			} catch (error) {
				return saveFailed(error);
			}
			onCreated?.(createdId);
			loadCreators();
			await load();
			confirmIfHidden(createdId, "created");
		}
		/** The value of the scope picker for a saved skill. */
		function scopeValueOf(skill) {
			if (skill.scope === "project" && skill.projectId) return `${PROJECT_SCOPE_PREFIX}${skill.projectId}`;
			return skill.scope;
		}
		/**
		* Why the scope of a saved skill cannot change, if it cannot. A move needs the delete
		* permission where the skill is, because it takes the skill out of that scope. A skill in
		* use can still move: the modal warns about a scope that drops an agent.
		*/
		function scopeLock(detail) {
			if (detail.syncedFrom) return { scopeLockedReason: i18n.baseText("settings.context.skills.synced.scopeLocked", { interpolate: { repo: detail.syncedFrom.label } }) };
			if (!detail.canDelete) return { scopeLockedReason: i18n.baseText("settings.context.skills.modal.scope.noDelete") };
			return {};
		}
		/** `show` opens the editor with the Versions panel. */
		async function openEditModal(item, show) {
			try {
				const detail = await skillsStore.fetchSkill(item.id);
				telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_OPENED_SKILL, {
					skill_id: detail.id,
					scope: detail.scope,
					...detail.projectId ? { project_id: detail.projectId } : {},
					read_only: !detail.canEdit
				});
				const currentValue = scopeValueOf(detail);
				const options = scopeOptions.value.some((option) => option.value === currentValue) ? scopeOptions.value : [{
					value: currentValue,
					...scopeDisplay(detail),
					projectIcon: detail.projectIcon
				}, ...scopeOptions.value];
				let baseSkillHash = detail.skillHash;
				openModal({
					skill: detail.skill,
					skillId: detail.id,
					readOnly: !detail.canEdit,
					...detail.syncedFrom ? { syncedFrom: detail.syncedFrom } : {},
					...assistantSkillsEnabled.value ? { availableToAssistant: detail.availableToAssistant } : {},
					scopeOptions: options,
					initialScope: currentValue,
					projectType: detail.projectType,
					projectIcon: detail.projectIcon,
					...mcpSkillsEnabled.value ? { availableToMCP: detail.availableToMCP } : {},
					...scopeLock(detail),
					usedBy: detail.usedBy,
					existingSkillNames: [],
					latestVersion: detail.latestVersion,
					initialVersionsOpen: show === "versions",
					onDelete: async () => await onDelete(detail, () => uiStore.closeModal(AGENT_SKILL_MODAL_KEY)),
					deleteDisabledReason: deleteBlockedReason(detail),
					...detail.syncedFrom?.canStopSyncing ? { onStopSyncing: async () => await onStopSyncing(detail, () => uiStore.closeModal(AGENT_SKILL_MODAL_KEY)) } : {},
					onConfirm: async ({ skill, scope, availableToAssistant, availableToMCP }) => await onSave(detail.id, skill, baseSkillHash, scope !== currentValue ? scope : void 0, availableToAssistant, availableToMCP, (skillHash) => baseSkillHash = skillHash)
				});
			} catch (error) {
				showError(error, i18n.baseText("settings.context.skills.error.loadOne"));
			}
		}
		/** Saves the next version. There are no drafts: what the modal shows is what gets saved. */
		/** `newScope` is set when the user picked another scope: the save also moves the skill. */
		async function onSave(id, skill, baseSkillHash, newScope, availableToAssistant, availableToMCP, onSaved) {
			let created;
			try {
				const saved = await skillsStore.saveSkill(id, {
					name: skill.name,
					description: skill.description,
					instructions: skill.instructions,
					references: skill.references ?? [],
					baseSkillHash,
					...newScope ? parseScope(newScope) : {},
					...availableToAssistant !== void 0 ? { availableToAssistant } : {},
					availableToMCP
				});
				created = saved.created;
				onSaved?.(saved.skillHash);
			} catch (error) {
				return saveFailed(error);
			}
			if (created || newScope !== void 0 || availableToAssistant !== void 0 || availableToMCP !== void 0) {
				await load();
				confirmIfHidden(id, "saved");
			} else showMessage({
				title: i18n.baseText("settings.context.skills.save.noChanges"),
				type: "info"
			});
		}
		/** The list row has no content, so the download reads the latest version first. */
		async function onDownload(item) {
			try {
				const detail = await skillsStore.fetchSkill(item.id);
				const { blob, fileName, format } = await exportAgentSkill(detail.skill);
				(0, import_FileSaver_min.saveAs)(blob, fileName);
				telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_DOWNLOADED_SKILL, {
					skill_id: detail.id,
					scope: detail.scope,
					...detail.projectId ? { project_id: detail.projectId } : {},
					format
				});
			} catch (error) {
				showError(error, i18n.baseText("settings.context.skills.error.download"));
			}
		}
		/** `onDeleted` runs as soon as the delete succeeds, before the list reloads. */
		async function onDelete(skill, onDeleted) {
			const source = skillsStore.sources.find((item) => skillSyncEnabled.value && item.id === skill.sourceId && item.skillCount === 1 && item.canDelete);
			let removeSource = false;
			const warning = i18n.baseText("settings.context.skills.delete.confirm.message");
			if (await message.confirm(source ? h("div", { class: $style.confirmation }, [h("p", warning), h(Checkbox_default, {
				label: i18n.baseText("settings.context.skills.delete.removeSource", { interpolate: { source: source.label } }),
				"onUpdate:modelValue": (checked) => {
					removeSource = checked;
				}
			})]) : warning, i18n.baseText("settings.context.skills.delete.confirm.title"), {
				type: "warning",
				confirmButtonText: i18n.baseText("settings.context.skills.delete.confirm.button"),
				cancelButtonText: i18n.baseText("settings.context.skills.delete.cancel")
			}) !== "confirm") return;
			try {
				if (source && removeSource) await skillsStore.deleteSource(source.id, { onlySkillId: skill.id });
				else await skillsStore.deleteSkill(skill.id);
				onDeleted?.();
				showMessage({
					title: i18n.baseText("settings.context.skills.delete.success"),
					type: "success"
				});
			} catch (error) {
				const block = skillSourceDeleteBlockSchema.safeParse(error instanceof ResponseError && error.httpStatusCode === 409 ? error.meta : void 0);
				if (block.success) {
					const count = block.data.agents.length + block.data.hiddenAgents;
					showMessage({
						title: i18n.baseText("settings.context.skills.error.delete"),
						message: i18n.baseText("settings.context.skills.delete.inUse", {
							interpolate: { count },
							adjustToNumber: count
						}),
						type: "error",
						duration: 0
					});
				} else showError(error, i18n.baseText("settings.context.skills.error.delete"));
			}
			loadCreators();
			await Promise.all([load(), loadSources()]);
		}
		/**
		* The skill keeps its versions and becomes a normal skill that the user can edit. The row
		* menu and the modal both use this. The modal closes, as in the prototype, and the list
		* reloads with the row editable.
		*/
		async function onStopSyncing(skill, onStopped) {
			const name = skill.name;
			if (await message.confirm(h("div", { class: $style.confirmation }, [
				h("p", i18n.baseText("settings.context.skills.stopSyncing.confirm.message", { interpolate: { scope: scopeDisplay(skill).label } })),
				h("p", i18n.baseText("settings.context.skills.stopSyncing.confirm.keep", { adjustToNumber: 1 })),
				h("p", i18n.baseText("settings.context.skills.stopSyncing.confirm.updates"))
			]), i18n.baseText("settings.context.skills.stopSyncing.confirm.title", { interpolate: { name } }), {
				confirmButtonText: i18n.baseText("settings.context.skills.stopSyncing.action"),
				cancelButtonText: i18n.baseText("generic.cancel")
			}) !== "confirm") return;
			try {
				await skillsStore.stopSyncingSkill(skill.id);
			} catch (error) {
				showError(error, i18n.baseText("settings.context.skills.stopSyncing.error"));
				return;
			}
			onStopped?.();
			showMessage({
				title: i18n.baseText("settings.context.skills.stopSyncing.success", { interpolate: { name } }),
				type: "success"
			});
			await Promise.all([load(), loadSources()]);
		}
		/** The sources that the user folded, kept in this browser, so the table opens as it was left. */
		const collapsedSourceIds = useLocalStorage(() => `n8n-skills-collapsed-sources:${usersStore.currentUserId ?? "anonymous"}`, [], { listenToStorageChanges: false });
		/** The sources with a check that runs, so their rows show progress. */
		const checkingSourceIds = ref([]);
		const reviewSource = ref(null);
		async function onSourceUpdatesChanged() {
			await Promise.all([load(), loadSources()]);
		}
		const tableSources = computed(() => skillSyncEnabled.value ? skillsStore.sources : void 0);
		async function onSourceDeleted() {
			sourceToDelete.value = void 0;
			loadCreators();
			await loadSources();
			await load();
		}
		async function onSourceCredentialReplaced() {
			sourceToReplaceCredential.value = void 0;
			await loadSources();
		}
		async function loadSources() {
			if (!skillSyncEnabled.value) return;
			try {
				const sources = await skillsStore.fetchSources();
				if (!sources) return;
				const known = new Set(sources.map(({ id }) => id));
				const kept = collapsedSourceIds.value.filter((id) => known.has(id));
				if (kept.length !== collapsedSourceIds.value.length) collapsedSourceIds.value = kept;
			} catch (error) {
				if (await isSkillSyncTurnedOff()) return;
				showError(error, i18n.baseText("settings.context.skills.sources.error.load"));
			}
		}
		async function onToggleSource(sourceId) {
			const ids = new Set(collapsedSourceIds.value);
			if (ids.has(sourceId)) ids.delete(sourceId);
			else ids.add(sourceId);
			collapsedSourceIds.value = [...ids];
			await load();
		}
		/** Check for updates on a source: progress on its row, then a toast with the result. */
		async function onCheckSource(source) {
			if (checkingSourceIds.value.includes(source.id)) return;
			checkingSourceIds.value = [...checkingSourceIds.value, source.id];
			let result;
			try {
				result = await skillsStore.checkSource(source.id);
			} catch (error) {
				const reason = error instanceof ResponseError ? error.meta?.reason : void 0;
				if (reason === "rate_limited") {
					showMessage({
						title: i18n.baseText("settings.context.skills.sources.health.delayed"),
						message: i18n.baseText("settings.context.skills.sources.health.delayed.description"),
						type: "info"
					});
					return;
				}
				const text = reason === "credential_missing" ? i18n.baseText("settings.context.skills.checkForUpdates.error.credentialMissing") : reason !== void 0 ? reasonText(reason) : void 0;
				showError(text ? new Error(text) : error, i18n.baseText("settings.context.skills.checkForUpdates.error"));
				return;
			} finally {
				checkingSourceIds.value = checkingSourceIds.value.filter((id) => id !== source.id);
				await loadSources();
			}
			const { label, updatesFound, newSkillsFound = 0, throttled } = result;
			showMessage({
				title: throttled ? i18n.baseText("settings.context.skills.checkForUpdates.throttled", { interpolate: { label } }) : i18n.baseText("settings.context.skills.checkForUpdates.checked", { interpolate: { label } }),
				message: [updatesFound === 0 && newSkillsFound === 0 ? i18n.baseText("settings.context.skills.checkForUpdates.none") : updatesFound > 0 ? i18n.baseText("settings.context.skills.checkForUpdates.found", {
					interpolate: { count: updatesFound },
					adjustToNumber: updatesFound
				}) : "", newSkillsFound > 0 ? i18n.baseText("settings.context.skills.checkForUpdates.new", {
					interpolate: { count: newSkillsFound },
					adjustToNumber: newSkillsFound
				}) : ""].filter(Boolean).join(" "),
				type: "success"
			});
		}
		async function onSourceMoved(sourceId) {
			movingSource.value = null;
			showMessage({
				title: i18n.baseText("settings.context.skills.moveSource.success"),
				type: "success"
			});
			await onOpenSource(sourceId);
		}
		async function onOpenSource(sourceId) {
			connectOpen.value = false;
			search.value = "";
			filters.value = { ...NO_FILTERS };
			collapsedSourceIds.value = collapsedSourceIds.value.filter((id) => id !== sourceId);
			await Promise.all([load(sourceId), loadSources()]);
			await nextTick();
			const row = document.getElementById(`skill-source-${sourceId}`);
			row?.scrollIntoView({ block: "center" });
			row?.focus({ preventScroll: true });
		}
		async function goBack() {
			await router.push({ name: VIEWS.SETTINGS_CONTEXT });
		}
		watch(skillSyncEnabled, async (enabled) => {
			if (!enabled) filters.value = {
				...filters.value,
				sourceIds: []
			};
			await Promise.all([load(), ...enabled ? [loadSources()] : []]);
		});
		onMounted(async () => {
			documentTitle.set(i18n.baseText("settings.context.skills.title"));
			loadFilterOptions();
			await Promise.all([
				load(),
				loadSources(),
				projectsStore.getMyProjects().catch(() => void 0)
			]);
			if (!loadFailed.value) telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_VIEWED_SKILLS, { count: skillsStore.count });
			const { skillId, create, sourceId } = route.query;
			if (typeof skillId === "string") await openEditModal({ id: skillId });
			else if (typeof sourceId === "string" && validate(sourceId) && skillSyncEnabled.value) await onOpenSource(sourceId);
			else if (create === "true") openCreateModal();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsLayout_default), {
				class: normalizeClass(unref($style).layout),
				"full-width": "",
				"show-back": "",
				"back-label": unref(i18n).baseText("settings.context.skills.back"),
				"data-test-id": "settings-skills-view",
				onBack: goBack
			}, {
				default: withCtx(() => [
					createVNode(unref(SettingsPageHeader_default), {
						title: unref(i18n).baseText("settings.context.skills.title"),
						description: unref(i18n).baseText("settings.context.skills.description"),
						"show-docs-link": false
					}, createSlots({ _: 2 }, [unref(settingsStore).isEnterprisePlan ? {
						name: "titleTrailing",
						fn: withCtx(() => [createVNode(unref(EnterpriseReadinessBadge_default), {
							size: "xsmall",
							"data-test-id": "skills-enterprise-readiness-badge"
						})]),
						key: "0"
					} : void 0]), 1032, ["title", "description"]),
					!showRecommendedEmptyState.value || canManageSkillSync.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(unref($style).toolbar)
					}, [
						!showRecommendedEmptyState.value ? (openBlock(), createBlock(unref(Input_default), {
							key: 0,
							modelValue: search.value,
							"onUpdate:modelValue": [_cache[0] || (_cache[0] = ($event) => search.value = $event), unref(onSearch)],
							class: normalizeClass(unref($style).search),
							placeholder: unref(i18n).baseText(unref(skillSyncEnabled) ? "settings.context.skills.search.withSourcesPlaceholder" : "settings.context.skills.search.placeholder"),
							clearable: "",
							"data-test-id": "skills-search"
						}, {
							prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "search" })]),
							_: 1
						}, 8, [
							"modelValue",
							"class",
							"placeholder",
							"onUpdate:modelValue"
						])) : createCommentVNode("", true),
						!showRecommendedEmptyState.value ? (openBlock(), createBlock(ResourceFiltersDropdown_default, {
							key: 1,
							"model-value": filters.value,
							keys: FILTER_KEYS,
							reset: resetFilters,
							shareable: false,
							"just-icon": ""
						}, {
							default: withCtx(() => [
								createBaseVNode("div", { class: normalizeClass(unref($style).filter) }, [createVNode(unref(N8nInputLabel_default), {
									label: unref(i18n).baseText("settings.context.skills.filter.scope"),
									bold: false,
									size: "small",
									color: "text-base"
								}, null, 8, ["label"]), createVNode(unref(N8nSelect_default), {
									"model-value": filters.value.scope,
									size: "medium",
									filterable: "",
									clearable: "",
									placeholder: unref(i18n).baseText("settings.context.skills.filter.all"),
									"data-test-id": "skills-filter-scope",
									"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => setFilter("scope", $event))
								}, {
									default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(scopeFilterOptions.value, (option) => {
										return openBlock(), createBlock(unref(N8nOption_default), {
											key: option.value,
											value: option.value,
											label: option.label
										}, null, 8, ["value", "label"]);
									}), 128))]),
									_: 1
								}, 8, ["model-value", "placeholder"])], 2),
								createBaseVNode("div", { class: normalizeClass(unref($style).filter) }, [createVNode(unref(N8nInputLabel_default), {
									label: unref(i18n).baseText("settings.context.skills.filter.agentLabel"),
									bold: false,
									size: "small",
									color: "text-base"
								}, null, 8, ["label"]), createVNode(unref(N8nSelect_default), {
									"model-value": filters.value.agentId,
									size: "medium",
									filterable: "",
									remote: "",
									"remote-method": unref(onAgentSearch),
									loading: agentsLoading.value,
									clearable: "",
									placeholder: unref(i18n).baseText("settings.context.skills.filter.anyAgent"),
									"data-test-id": "skills-filter-agent",
									"onUpdate:modelValue": onAgentFilter
								}, {
									default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(agentFilterOptions.value, (agent) => {
										return openBlock(), createBlock(unref(N8nOption_default), {
											key: agent.id,
											value: agent.id,
											label: agent.name
										}, null, 8, ["value", "label"]);
									}), 128))]),
									_: 1
								}, 8, [
									"model-value",
									"remote-method",
									"loading",
									"placeholder"
								])], 2),
								createBaseVNode("div", { class: normalizeClass(unref($style).filter) }, [createVNode(unref(N8nInputLabel_default), {
									label: unref(i18n).baseText("settings.context.skills.filter.createdBy"),
									bold: false,
									size: "small",
									color: "text-base"
								}, null, 8, ["label"]), createVNode(unref(N8nSelect_default), {
									"model-value": filters.value.createdById,
									size: "medium",
									filterable: "",
									clearable: "",
									placeholder: unref(i18n).baseText("settings.context.skills.filter.anyone"),
									"data-test-id": "skills-filter-created-by",
									"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => setFilter("createdById", $event))
								}, {
									default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(creators.value, (creator) => {
										return openBlock(), createBlock(unref(N8nOption_default), {
											key: creator.id,
											value: creator.id,
											label: creatorLabel(creator)
										}, null, 8, ["value", "label"]);
									}), 128))]),
									_: 1
								}, 8, ["model-value", "placeholder"])], 2),
								unref(skillSyncEnabled) ? (openBlock(), createElementBlock("div", {
									key: 0,
									class: normalizeClass(unref($style).filter)
								}, [createVNode(unref(N8nInputLabel_default), {
									label: unref(i18n).baseText("settings.context.skills.filter.source"),
									bold: false,
									size: "small",
									color: "text-base"
								}, null, 8, ["label"]), createVNode(unref(N8nSelect_default), {
									modelValue: filters.value.sourceIds,
									"onUpdate:modelValue": [_cache[3] || (_cache[3] = ($event) => filters.value.sourceIds = $event), resetPage],
									size: "medium",
									multiple: "",
									filterable: "",
									clearable: "",
									"collapse-tags": "",
									placeholder: unref(i18n).baseText("settings.context.skills.filter.allSources"),
									"data-test-id": "skills-filter-source"
								}, {
									default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(sourceFilterOptions.value, (source) => {
										return openBlock(), createBlock(unref(N8nOption_default), {
											key: source.value,
											value: source.value,
											label: source.label
										}, null, 8, ["value", "label"]);
									}), 128))]),
									_: 1
								}, 8, ["modelValue", "placeholder"])], 2)) : createCommentVNode("", true)
							]),
							_: 1
						}, 8, ["model-value"])) : createCommentVNode("", true),
						createBaseVNode("span", { class: normalizeClass(unref($style).spacer) }, null, 2),
						canManageSkillSync.value ? (openBlock(), createBlock(unref(N8nPopover_default), {
							key: 2,
							align: "end",
							width: "calc(var(--spacing--5xl) + var(--spacing--3xl))"
						}, {
							trigger: withCtx(() => [createBaseVNode("span", null, [createVNode(unref(N8nTooltip_default), null, {
								content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.settings")), 1)]),
								default: withCtx(() => [createVNode(unref(N8nButton_default), {
									variant: "outline",
									icon: "settings",
									"icon-only": "",
									size: "medium",
									"aria-label": unref(i18n).baseText("settings.context.skills.settings"),
									"data-test-id": "skill-sync-settings-button"
								}, null, 8, ["aria-label"])]),
								_: 1
							})])]),
							content: withCtx(() => [createBaseVNode("div", {
								class: normalizeClass(unref($style).skillSync),
								"data-test-id": "skill-sync-settings"
							}, [createBaseVNode("div", { class: normalizeClass(unref($style).skillSyncHeader) }, [createVNode(unref(N8nText_default), {
								bold: "",
								size: "medium",
								color: "text-dark"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.skillSync.label")), 1)]),
								_: 1
							}), createVNode(unref(N8nSwitch_default), {
								size: "small",
								"model-value": unref(skillSyncEnabled),
								disabled: skillSyncSaving.value || skillSyncManagedByEnv.value,
								"aria-label": unref(i18n).baseText("settings.context.skills.skillSync.label"),
								"data-test-id": "skill-sync-enable-toggle",
								"onUpdate:modelValue": onSkillSyncEnabledChange
							}, null, 8, [
								"model-value",
								"disabled",
								"aria-label"
							])], 2), createVNode(unref(N8nText_default), {
								size: "small",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(skillSyncManagedByEnv.value ? unref(i18n).baseText("settings.context.skills.skillSync.managedByEnv") : unref(i18n).baseText("settings.context.skills.skillSync.description")), 1)]),
								_: 1
							})], 2)]),
							_: 1
						})) : createCommentVNode("", true),
						!showRecommendedEmptyState.value && scopeOptions.value.length > 0 ? (openBlock(), createBlock(unref(N8nActionDropdown_default), {
							key: 3,
							items: createMenuItems.value,
							placement: "bottom-end",
							"data-test-id": "skills-create-menu",
							onSelect: onCreateMenuSelect
						}, {
							activator: withCtx(() => [createVNode(unref(N8nButton_default), { "data-test-id": "skills-create-menu-button" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.actions.createMenu")) + " ", 1), createVNode(unref(N8nIcon_default), {
									icon: "chevron-down",
									size: "small"
								})]),
								_: 1
							})]),
							_: 1
						}, 8, ["items"])) : createCommentVNode("", true)
					], 2)) : createCommentVNode("", true),
					showRecommendedEmptyState.value ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(unref($style).empty),
						"data-test-id": "skills-recommended-empty-state"
					}, [
						createVNode(unref(N8nHeading_default), {
							tag: "h2",
							size: "medium",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("experiments.recommendedSkills.empty.title")), 1)]),
							_: 1
						}),
						createVNode(unref(N8nText_default), { color: "text-light" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("experiments.recommendedSkills.description")), 1)]),
							_: 1
						}),
						createVNode(RecommendedSkillCards_default, {
							class: normalizeClass(unref($style).recommended),
							"entry-point": "empty_state",
							onSelect: _cache[4] || (_cache[4] = ($event) => onRecommendedSkillSelect("empty_state", $event))
						}, null, 8, ["class"]),
						createVNode(unref(N8nActionDropdown_default), {
							items: emptyStateCreateMenuItems.value,
							placement: "bottom",
							"data-test-id": "skills-empty-create-menu",
							onSelect: onCreateMenuSelect
						}, {
							activator: withCtx(() => [createVNode(unref(N8nButton_default), { "data-test-id": "skills-empty-create-button" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.actions.createMenu")) + " ", 1), createVNode(unref(N8nIcon_default), {
									icon: "chevron-down",
									size: "small"
								})]),
								_: 1
							})]),
							_: 1
						}, 8, ["items"])
					], 2)) : createCommentVNode("", true),
					!showRecommendedEmptyState.value ? (openBlock(), createBlock(SkillsTable_default, {
						key: 2,
						"table-options": unref(tableOptions),
						"onUpdate:tableOptions": _cache[5] || (_cache[5] = ($event) => isRef(tableOptions) ? tableOptions.value = $event : null),
						skills: unref(skillsStore).skills,
						"items-length": unref(skillsStore).count,
						"page-count": unref(skillsStore).pageCount,
						loading: showLoading.value,
						"show-empty": emptyState.value !== "none" && unref(skillsStore).collapsedSources.length === 0,
						"show-assistant-availability": assistantSkillsEnabled.value,
						"show-mcp-availability": mcpSkillsEnabled.value,
						sources: tableSources.value,
						"collapsed-source-ids": unref(collapsedSourceIds),
						"collapsed-sources": unref(skillsStore).collapsedSources,
						"source-ranges": unref(skillsStore).sourceRanges,
						"checking-source-ids": checkingSourceIds.value,
						onOpen: _cache[6] || (_cache[6] = ($event) => openEditModal($event)),
						onTimeline: _cache[7] || (_cache[7] = ($event) => openEditModal($event, "versions")),
						onDownload,
						onToggleSource,
						onCheckSource,
						onMoveSource: _cache[8] || (_cache[8] = ($event) => movingSource.value = $event),
						onReviewSource: _cache[9] || (_cache[9] = ($event) => reviewSource.value = $event),
						onDeleteSource: _cache[10] || (_cache[10] = ($event) => sourceToDelete.value = $event),
						onReplaceCredential: _cache[11] || (_cache[11] = ($event) => sourceToReplaceCredential.value = $event),
						onStopSyncing: _cache[12] || (_cache[12] = ($event) => onStopSyncing($event)),
						onDelete,
						"onUpdate:options": onOptionsUpdate
					}, {
						empty: withCtx(() => [emptyState.value === "noResults" ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(unref($style).empty),
							"data-test-id": "skills-no-results"
						}, [createVNode(unref(N8nText_default), { color: "text-light" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.search.noResults")), 1)]),
							_: 1
						})], 2)) : (openBlock(), createElementBlock("div", {
							key: 1,
							class: normalizeClass(unref($style).empty),
							"data-test-id": "skills-empty-state"
						}, [
							createVNode(unref(N8nHeading_default), {
								tag: "h2",
								size: "medium",
								bold: ""
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.empty.title")), 1)]),
								_: 1
							}),
							createVNode(unref(N8nText_default), { color: "text-light" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.empty.description")), 1)]),
								_: 1
							}),
							scopeOptions.value.length > 0 ? (openBlock(), createBlock(unref(N8nActionDropdown_default), {
								key: 0,
								items: createMenuItems.value,
								placement: "bottom",
								"data-test-id": "skills-empty-create-menu",
								onSelect: onCreateMenuSelect
							}, {
								activator: withCtx(() => [createVNode(unref(N8nButton_default), { "data-test-id": "skills-empty-create-button" }, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.context.skills.actions.createMenu")) + " ", 1), createVNode(unref(N8nIcon_default), {
										icon: "chevron-down",
										size: "small"
									})]),
									_: 1
								})]),
								_: 1
							}, 8, ["items"])) : createCommentVNode("", true)
						], 2))]),
						_: 1
					}, 8, [
						"table-options",
						"skills",
						"items-length",
						"page-count",
						"loading",
						"show-empty",
						"show-assistant-availability",
						"show-mcp-availability",
						"sources",
						"collapsed-source-ids",
						"collapsed-sources",
						"source-ranges",
						"checking-source-ids"
					])) : createCommentVNode("", true),
					unref(skillSyncEnabled) && movingSource.value ? (openBlock(), createBlock(SkillSourceMoveDialog_default, {
						key: 3,
						open: true,
						source: movingSource.value,
						"scope-options": scopeOptions.value,
						"onUpdate:open": _cache[13] || (_cache[13] = ($event) => !$event && (movingSource.value = null)),
						onMoved: onSourceMoved
					}, null, 8, ["source", "scope-options"])) : createCommentVNode("", true),
					unref(skillSyncEnabled) && reviewSource.value ? (openBlock(), createBlock(SkillSourceUpdatesDialog_default, {
						key: 4,
						source: reviewSource.value,
						onClose: _cache[14] || (_cache[14] = ($event) => reviewSource.value = null),
						onChanged: onSourceUpdatesChanged
					}, null, 8, ["source"])) : createCommentVNode("", true),
					unref(showRecommendedSkills) ? (openBlock(), createBlock(RecommendedSkillsDialog_default, {
						key: 5,
						open: recommendedOpen.value,
						"onUpdate:open": _cache[15] || (_cache[15] = ($event) => recommendedOpen.value = $event),
						onSelect: _cache[16] || (_cache[16] = ($event) => onRecommendedSkillSelect("create_menu", $event))
					}, null, 8, ["open"])) : createCommentVNode("", true),
					unref(skillSyncEnabled) ? (openBlock(), createBlock(SkillSourceConnectDialog_default, {
						key: 6,
						open: connectOpen.value,
						"onUpdate:open": _cache[17] || (_cache[17] = ($event) => connectOpen.value = $event),
						"scope-options": scopeOptions.value,
						onConnected: onSourceConnected,
						onOpenSource
					}, null, 8, ["open", "scope-options"])) : createCommentVNode("", true),
					unref(skillSyncEnabled) && sourceToDelete.value ? (openBlock(), createBlock(SkillSourceDeleteDialog_default, {
						key: 7,
						source: sourceToDelete.value,
						onClose: _cache[18] || (_cache[18] = ($event) => sourceToDelete.value = void 0),
						onDeleted: onSourceDeleted
					}, null, 8, ["source"])) : createCommentVNode("", true),
					unref(skillSyncEnabled) && sourceToReplaceCredential.value ? (openBlock(), createBlock(SkillSourceCredentialDialog_default, {
						key: sourceToReplaceCredential.value.id,
						source: sourceToReplaceCredential.value,
						onClose: _cache[19] || (_cache[19] = ($event) => sourceToReplaceCredential.value = void 0),
						onReplaced: onSourceCredentialReplaced
					}, null, 8, ["source"])) : createCommentVNode("", true),
					createBaseVNode("input", {
						ref_key: "skillFolderInput",
						ref: skillFolderInput,
						type: "file",
						webkitdirectory: "",
						multiple: "",
						hidden: "",
						tabindex: "-1",
						"data-test-id": "skills-upload-folder-input",
						onChange: onSkillFilesPicked
					}, null, 544),
					createBaseVNode("input", {
						ref_key: "skillFileInput",
						ref: skillFileInput,
						type: "file",
						accept: ".md,text/markdown",
						hidden: "",
						tabindex: "-1",
						"data-test-id": "skills-upload-file-input",
						onChange: onSkillFilesPicked
					}, null, 544)
				]),
				_: 1
			}, 8, ["class", "back-label"]);
		};
	}
}), [["__cssModules", { "$style": {
	confirmation: "_confirmation_12e44_1",
	layout: "_layout_12e44_8",
	toolbar: "_toolbar_12e44_15",
	spacer: "_spacer_12e44_22",
	search: "_search_12e44_26",
	skillSync: "_skillSync_12e44_30",
	skillSyncHeader: "_skillSyncHeader_12e44_37",
	filter: "_filter_12e44_44",
	empty: "_empty_12e44_53",
	recommended: "_recommended_12e44_62"
} }]]);
//#endregion
export { SettingsSkillsView_default as default };
