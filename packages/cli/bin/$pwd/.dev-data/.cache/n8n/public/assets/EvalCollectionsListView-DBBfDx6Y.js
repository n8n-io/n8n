import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, of as onBeforeUnmount, yp as normalizeStyle, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { GA as DialogDescription_default, KA as Dialog_default, SN as _plugin_vue_export_helper_default, TM as N8nPagination_default, UA as DialogFooter_default, WA as DialogBody_default, Yw as averageNormalizedScore, _M as Checkbox_default, _N as N8nText_default, cN as Input_default, dC as useToast, fC as VIEWS, fN as N8nTooltip_default, ff as useEvaluationStore, jN as useI18n, mM as N8nOption_default, nN as N8nBadge_default, pM as N8nSelect_default, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { a as countSettledRuns, o as deriveRunsStatus, t as buildScoreShapedMetricGroups } from "./evaluation.utils-BLlHOReH.js";
import { t as useIntersectionObserver } from "./useIntersectionObserver-BTGMngAL.js";
import "./useIntersectionObserver-CVH8U9lD.js";
import { a as RunningIndicator_default, n as VersionAvatar_default, o as useEvalCollectionsStore, t as GroupedMetricChart_default } from "./GroupedMetricChart--8jQxUhP.js";
//#region src/features/ai/evaluation.ee/components/EvalCollectionsListView/CollectionCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$2 = { key: 0 };
var _hoisted_2$1 = { key: 1 };
var CollectionCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CollectionCard",
	props: {
		collection: {},
		detail: {},
		workflowId: {},
		datasetName: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const router = useRouter();
		const store = useEvalCollectionsStore();
		const openCompare = () => {
			router.push({
				name: VIEWS.EVALUATION_COLLECTION_COMPARE,
				params: {
					workflowId: props.workflowId,
					collectionId: props.collection.id
				}
			});
		};
		const status = computed(() => props.detail ? deriveRunsStatus(props.detail.runs) : null);
		const isRunning = computed(() => status.value === "running");
		const completedCount = computed(() => countSettledRuns(props.detail?.runs ?? []));
		const versionCount = computed(() => props.detail?.runs.length ?? 0);
		const statusBadge = computed(() => {
			switch (status.value) {
				case "done": return {
					theme: "success",
					label: i18n.baseText("evaluation.collections.card.done")
				};
				case "error": return {
					theme: "danger",
					label: i18n.baseText("evaluation.collections.card.failed")
				};
				default: return null;
			}
		});
		const ctaLabel = computed(() => {
			const key = status.value === "running" ? "evaluation.compare.viewProgress" : "evaluation.compare.openCompare";
			return `${i18n.baseText(key)} →`;
		});
		const lastRunRelative = computed(() => {
			const completedAts = (props.detail?.runs ?? []).map((r) => r.completedAt ?? r.runAt).filter((v) => !!v).map((s) => new Date(s).getTime()).filter((n) => !Number.isNaN(n));
			const ts = completedAts.length ? Math.max(...completedAts) : new Date(props.collection.updatedAt ?? 0).getTime();
			if (!ts || Number.isNaN(ts)) return null;
			const d = new Date(ts);
			const today = /* @__PURE__ */ new Date();
			const sameDay = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
			const timeFmt = d.toLocaleTimeString(void 0, {
				hour: "2-digit",
				minute: "2-digit"
			});
			if (sameDay) return i18n.baseText("evaluation.collections.card.lastRunToday", { interpolate: { time: timeFmt } });
			const dateFmt = d.toLocaleDateString(void 0, {
				month: "short",
				day: "numeric"
			});
			return i18n.baseText("evaluation.collections.card.lastRunOn", { interpolate: {
				date: dateFmt,
				time: timeFmt
			} });
		});
		const shortHash = (id) => id.slice(0, 7);
		const versionChips = computed(() => (props.detail?.runs ?? []).map((run, idx) => ({
			key: run.testRunId,
			index: idx,
			label: run.workflowVersionId === null ? i18n.baseText("evaluation.collections.card.currentDraft") : shortHash(run.workflowVersionId),
			score: run.avgScore !== null ? Math.round(run.avgScore * 100) : null
		})));
		const groups = computed(() => props.detail ? buildScoreShapedMetricGroups(props.detail.runs, props.detail.metricScales).map(({ key, values }) => ({
			label: key,
			values
		})) : []);
		const cardRef = ref(null);
		const requested = ref(false);
		const ensureDetailLoaded = () => {
			if (props.detail || requested.value) return;
			requested.value = true;
			store.fetchCollectionDetail(props.workflowId, props.collection.id).catch(() => {
				requested.value = false;
			});
		};
		const { observe } = useIntersectionObserver({
			root: ref(null),
			onIntersect: ensureDetailLoaded,
			once: false
		});
		onMounted(() => observe(cardRef.value));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("article", {
				ref_key: "cardRef",
				ref: cardRef,
				class: normalizeClass(_ctx.$style.card),
				"data-test-id": "eval-collections-card"
			}, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardTopRow) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardHeader) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardHeading) }, [createVNode(unref(N8nText_default), {
					size: "medium",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.collection.name), 1)]),
					_: 1
				}), isRunning.value ? (openBlock(), createBlock(RunningIndicator_default, {
					key: 0,
					completed: completedCount.value,
					total: versionCount.value
				}, null, 8, ["completed", "total"])) : statusBadge.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
					key: 1,
					variant: statusBadge.value.theme
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(statusBadge.value.label), 1)]),
					_: 1
				}, 8, ["variant"])) : createCommentVNode("", true)], 2), createVNode(unref(N8nText_default), {
					size: "xsmall",
					color: "text-light"
				}, {
					default: withCtx(() => [
						createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("evaluation.collections.card.meta.versions", { adjustToNumber: __props.detail?.runs.length ?? __props.collection.runCount })), 1),
						__props.datasetName ? (openBlock(), createElementBlock("span", _hoisted_1$2, " · " + toDisplayString(__props.datasetName), 1)) : createCommentVNode("", true),
						lastRunRelative.value ? (openBlock(), createElementBlock("span", _hoisted_2$1, " · " + toDisplayString(lastRunRelative.value), 1)) : createCommentVNode("", true)
					]),
					_: 1
				})], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardCta) }, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "medium",
					label: ctaLabel.value,
					"data-test-id": "eval-collections-card-cta",
					onClick: openCompare
				}, null, 8, ["label"])], 2)], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.versionsRow) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(versionChips.value, (chip) => {
					return openBlock(), createElementBlock("span", {
						key: chip.key,
						class: normalizeClass(_ctx.$style.versionChip)
					}, [
						createVNode(VersionAvatar_default, {
							index: chip.index,
							variant: "dot",
							size: "small"
						}, null, 8, ["index"]),
						createVNode(unref(N8nText_default), {
							size: "xsmall",
							color: "text-base"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(chip.label), 1)]),
							_: 2
						}, 1024),
						chip.score !== null ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							size: "xsmall",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(chip.score) + "%", 1)]),
							_: 2
						}, 1024)) : createCommentVNode("", true)
					], 2);
				}), 128))], 2),
				groups.value.length > 0 ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.cardChart)
				}, [createVNode(GroupedMetricChart_default, {
					groups: groups.value,
					max: 1
				}, null, 8, ["groups"])], 2)) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	card: "_card_1erft_1",
	cardTopRow: "_cardTopRow_1erft_15",
	cardHeader: "_cardHeader_1erft_22",
	cardHeading: "_cardHeading_1erft_29",
	versionsRow: "_versionsRow_1erft_35",
	versionChip: "_versionChip_1erft_41",
	cardChart: "_cardChart_1erft_50",
	cardCta: "_cardCta_1erft_54"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/SetupCollectionWizard/DatasetPicker.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var DatasetPicker_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "DatasetPicker",
	props: {
		options: {},
		selectedId: {},
		matchingVersionsCount: {},
		hasSelection: { type: Boolean }
	},
	emits: ["update:selectedId"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.wrap),
				"data-test-id": "dataset-picker"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.pickerRow) }, [createBaseVNode("span", {
				class: normalizeClass(_ctx.$style.datasetIcon),
				"aria-hidden": "true"
			}, [createVNode(unref(N8nIcon_default), {
				icon: "database",
				size: "small"
			})], 2), createVNode(unref(N8nSelect_default), {
				class: normalizeClass(_ctx.$style.select),
				"model-value": __props.selectedId ?? "",
				placeholder: unref(i18n).baseText("evaluation.setup.dataset.placeholder"),
				size: "medium",
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => emit("update:selectedId", $event))
			}, {
				default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.options, (opt) => {
					return openBlock(), createBlock(unref(N8nOption_default), {
						key: opt.id,
						value: opt.id,
						label: opt.label
					}, null, 8, ["value", "label"]);
				}), 128))]),
				_: 1
			}, 8, [
				"class",
				"model-value",
				"placeholder"
			])], 2), __props.hasSelection ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.helper)
			}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.dot) }, null, 2), createVNode(unref(N8nText_default), {
				size: "small",
				color: "text-base"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.setup.dataset.matchCount", { adjustToNumber: __props.matchingVersionsCount })), 1)]),
				_: 1
			})], 2)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	wrap: "_wrap_ve87c_1",
	pickerRow: "_pickerRow_ve87c_7",
	datasetIcon: "_datasetIcon_ve87c_14",
	select: "_select_ve87c_25",
	helper: "_helper_ve87c_29",
	dot: "_dot_ve87c_36"
} }]]);
var versionRowKey = (version) => version.workflowVersionId ?? "__draft__";
//#endregion
//#region src/features/ai/evaluation.ee/components/SetupCollectionWizard/VersionsTable.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$1 = ["onClick"];
var _hoisted_2 = ["href"];
var VersionsTable_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "VersionsTable",
	props: {
		versions: {},
		selectedVersionIds: {},
		datasetLabel: {},
		workflowId: {},
		colorIndexByKey: {}
	},
	emits: ["toggle-version"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const router = useRouter();
		const versionHref = (v) => router.resolve(v.workflowVersionId ? {
			name: VIEWS.WORKFLOW_HISTORY,
			params: {
				workflowId: props.workflowId,
				versionId: v.workflowVersionId
			}
		} : {
			name: VIEWS.WORKFLOW,
			params: { workflowId: props.workflowId }
		}).href;
		const rows = computed(() => props.versions.map((version, idx) => {
			const key = versionRowKey(version);
			return {
				key,
				index: props.colorIndexByKey?.[key] ?? idx,
				version,
				checked: props.selectedVersionIds.has(key),
				href: versionHref(version)
			};
		}));
		const formatScore = (value) => {
			if (value === null) return "—";
			return `${Math.round(value * 100)}%`;
		};
		const formatRunAt = (iso) => {
			if (!iso) return i18n.baseText("evaluation.setup.versions.noRunYet");
			const date = new Date(iso);
			if (Number.isNaN(date.getTime())) return iso;
			return date.toLocaleString(void 0, {
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit"
			});
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.wrap),
				"data-test-id": "versions-table"
			}, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.col_check) }, null, 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.col_version) }, [createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-light",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.setup.versions.col.version")), 1)]),
						_: 1
					})], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.col_lastRun) }, [createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-light",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.setup.versions.col.lastRun", { interpolate: { dataset: __props.datasetLabel } })), 1)]),
						_: 1
					})], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.col_score) }, [createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-light",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.setup.versions.col.avgScore")), 1)]),
						_: 1
					})], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.col_action) }, null, 2)
				], 2),
				rows.value.length === 0 ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.empty)
				}, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.setup.versions.empty")), 1)]),
					_: 1
				})], 2)) : createCommentVNode("", true),
				(openBlock(true), createElementBlock(Fragment, null, renderList(rows.value, (row) => {
					return openBlock(), createElementBlock("div", {
						key: row.key,
						class: normalizeClass([
							_ctx.$style.row,
							row.checked && _ctx.$style.row_selected,
							row.version.workflowVersionId === null && _ctx.$style.row_draft
						]),
						"data-test-id": "versions-table-row",
						onClick: ($event) => emit("toggle-version", row.key)
					}, [
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.col_check) }, [createVNode(unref(Checkbox_default), {
							"model-value": row.checked,
							"data-test-id": "versions-table-row-checkbox",
							onClick: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop"])),
							"onUpdate:modelValue": ($event) => emit("toggle-version", row.key)
						}, null, 8, ["model-value", "onUpdate:modelValue"])], 2),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.col_version) }, [createVNode(VersionAvatar_default, {
							index: row.index,
							size: "small"
						}, null, 8, ["index"]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.versionMeta) }, [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-dark",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(row.version.label), 1)]),
							_: 2
						}, 1024), createVNode(unref(N8nText_default), {
							size: "xsmall",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(row.version.sourceLabel), 1)]),
							_: 2
						}, 1024)], 2)], 2),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.col_lastRun) }, [!row.version.lastRun ? (openBlock(), createBlock(unref(N8nBadge_default), {
							key: 0,
							variant: "outline"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.setup.versions.noRunYet")), 1)]),
							_: 1
						})) : (openBlock(), createBlock(unref(N8nText_default), {
							key: 1,
							size: "small",
							color: "text-base"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(formatRunAt(row.version.lastRun.runAt)), 1)]),
							_: 2
						}, 1024))], 2),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.col_score) }, [createVNode(unref(N8nText_default), {
							size: "small",
							color: row.version.lastRun?.isCritical ? "danger" : "text-dark",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(formatScore(row.version.lastRun?.avgScore ?? null)), 1)]),
							_: 2
						}, 1032, ["color"]), row.version.lastRun?.isBest ? (openBlock(), createBlock(unref(N8nBadge_default), {
							key: 0,
							variant: "success",
							"data-test-id": "versions-table-row-best"
						}, {
							default: withCtx(() => [createVNode(unref(N8nIcon_default), {
								icon: "star",
								size: "xsmall"
							}), createTextVNode(" " + toDisplayString(unref(i18n).baseText("evaluation.setup.versions.bestPill")), 1)]),
							_: 1
						})) : row.version.lastRun?.isCritical ? (openBlock(), createBlock(unref(N8nBadge_default), {
							key: 1,
							variant: "danger",
							"data-test-id": "versions-table-row-low"
						}, {
							default: withCtx(() => [createVNode(unref(N8nIcon_default), {
								icon: "triangle-alert",
								size: "xsmall"
							}), createTextVNode(" " + toDisplayString(unref(i18n).baseText("evaluation.setup.versions.lowPill")), 1)]),
							_: 1
						})) : createCommentVNode("", true)], 2),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.col_action) }, [createBaseVNode("a", {
							href: row.href,
							target: "_blank",
							rel: "noopener noreferrer",
							class: normalizeClass(_ctx.$style.viewLink),
							"data-test-id": "versions-table-row-view",
							onClick: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"]))
						}, [createVNode(unref(N8nIcon_default), {
							icon: "arrow-up-right",
							size: "xsmall"
						}), createTextVNode(" " + toDisplayString(unref(i18n).baseText("evaluation.setup.versions.viewAction")), 1)], 10, _hoisted_2)], 2)
					], 10, _hoisted_1$1);
				}), 128))
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	wrap: "_wrap_e5dzi_1",
	header: "_header_e5dzi_8",
	row: "_row_e5dzi_9",
	row_selected: "_row_selected_e5dzi_36",
	row_draft: "_row_draft_e5dzi_40",
	col_check: "_col_check_e5dzi_46",
	col_version: "_col_version_e5dzi_51",
	versionMeta: "_versionMeta_e5dzi_58",
	col_lastRun: "_col_lastRun_e5dzi_64",
	col_score: "_col_score_e5dzi_68",
	col_action: "_col_action_e5dzi_74",
	viewLink: "_viewLink_e5dzi_79",
	empty: "_empty_e5dzi_96"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/SetupCollectionWizard/buildVersionEntries.ts
var isReusableRun = (run) => !!run && run.status === "completed";
var buildVersionEntries = (versions) => versions.map((version) => ({
	workflowVersionId: version.workflowVersionId,
	existingTestRunId: isReusableRun(version.lastRun) ? version.lastRun.testRunId : void 0
}));
//#endregion
//#region src/features/ai/evaluation.ee/components/SetupCollectionWizard/SetupCollectionWizard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var SetupCollectionWizard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SetupCollectionWizard",
	props: {
		open: { type: Boolean },
		workflowId: {}
	},
	emits: ["update:open", "created"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const store = useEvalCollectionsStore();
		const evaluationStore = useEvaluationStore();
		const toast = useToast();
		const name = ref("");
		const selectedConfigId = ref(null);
		const selectedVersionKeys = ref(/* @__PURE__ */ new Set());
		const state = ref("collecting");
		const sourceFilter = ref("all");
		const sortOrder = ref("recent");
		const onSourceChange = (value) => {
			sourceFilter.value = String(value);
		};
		const onSortChange = (value) => {
			sortOrder.value = value === "oldest" ? "oldest" : "recent";
		};
		const configs = computed(() => evaluationStore.evaluationConfigsByWorkflowId[props.workflowId] ?? []);
		const versionsResponse = computed(() => selectedConfigId.value ? store.getVersions(selectedConfigId.value) : null);
		const allVersions = computed(() => versionsResponse.value?.versions ?? []);
		const datasetLabel = computed(() => {
			if (!selectedConfigId.value) return "";
			return configs.value.find((c) => c.id === selectedConfigId.value)?.name ?? "";
		});
		const allMetricNames = computed(() => {
			if (!selectedConfigId.value) return [];
			return (configs.value.find((c) => c.id === selectedConfigId.value)?.metrics ?? []).map((m) => m.name);
		});
		const sourceOptions = computed(() => {
			const seen = /* @__PURE__ */ new Set();
			const opts = [{
				value: "all",
				label: i18n.baseText("evaluation.setup.versions.filter.all")
			}];
			for (const v of allVersions.value) if (v.sourceLabel && !seen.has(v.sourceLabel)) {
				seen.add(v.sourceLabel);
				opts.push({
					value: v.sourceLabel,
					label: v.sourceLabel
				});
			}
			return opts;
		});
		const visibleVersions = computed(() => {
			const filtered = sourceFilter.value === "all" ? allVersions.value : allVersions.value.filter((v) => v.sourceLabel === sourceFilter.value);
			const seen = /* @__PURE__ */ new Set();
			const sorted = [...filtered.filter((v) => {
				const key = versionRowKey(v);
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			})].sort((a, b) => {
				const aTs = a.lastRun ? new Date(a.lastRun.runAt).getTime() : 0;
				const bTs = b.lastRun ? new Date(b.lastRun.runAt).getTime() : 0;
				return sortOrder.value === "recent" ? bTs - aTs : aTs - bTs;
			});
			const draftIndex = sorted.findIndex((v) => v.workflowVersionId === null);
			if (draftIndex > 0) sorted.unshift(sorted.splice(draftIndex, 1)[0]);
			return sorted;
		});
		const versionColorByKey = computed(() => {
			const map = {};
			allVersions.value.forEach((v, index) => {
				map[versionRowKey(v)] = index;
			});
			return map;
		});
		const selectedVersions = computed(() => allVersions.value.filter((v) => selectedVersionKeys.value.has(versionRowKey(v))));
		const selectedCount = computed(() => selectedVersionKeys.value.size);
		const reuseCount = computed(() => selectedVersions.value.filter((v) => isReusableRun(v.lastRun)).length);
		const newRunCount = computed(() => selectedCount.value - reuseCount.value);
		const canSubmit = computed(() => state.value === "collecting" && name.value.trim().length > 0 && selectedConfigId.value !== null && selectedCount.value >= 2);
		const footerSummaryText = computed(() => {
			if (selectedCount.value < 2) return i18n.baseText("evaluation.setup.footer.summary.pickMore");
			if (newRunCount.value === 0) return i18n.baseText("evaluation.setup.footer.summary.reuse", { adjustToNumber: selectedCount.value });
			return i18n.baseText("evaluation.setup.footer.summary.mixed", { interpolate: {
				total: String(selectedCount.value),
				newCount: String(newRunCount.value)
			} });
		});
		const footerExplainText = computed(() => {
			if (selectedCount.value < 2) return "";
			if (newRunCount.value === 0) return i18n.baseText("evaluation.setup.footer.runsExplain.reuse", { interpolate: { dataset: datasetLabel.value } });
			return i18n.baseText("evaluation.setup.footer.runsExplain.mixed", { interpolate: {
				newCount: String(newRunCount.value),
				dataset: datasetLabel.value
			} });
		});
		const ctaText = computed(() => {
			if (newRunCount.value === 0) return i18n.baseText("evaluation.setup.footer.cta.compare", { adjustToNumber: selectedCount.value });
			return i18n.baseText("evaluation.setup.footer.cta.runAndCompare", { adjustToNumber: selectedCount.value });
		});
		const onSelectConfig = async (configId) => {
			selectedConfigId.value = configId;
			selectedVersionKeys.value = /* @__PURE__ */ new Set();
			sourceFilter.value = "all";
			state.value = "versionsLoading";
			try {
				await store.fetchEvalVersions(props.workflowId, configId);
			} catch (error) {
				toast.showError(error, i18n.baseText("evaluation.setup.errors.loadVersionsFailed"));
			} finally {
				state.value = "collecting";
			}
		};
		const onToggleVersion = (versionKey) => {
			const next = new Set(selectedVersionKeys.value);
			if (next.has(versionKey)) next.delete(versionKey);
			else next.add(versionKey);
			selectedVersionKeys.value = next;
		};
		const close = () => {
			emit("update:open", false);
		};
		const reset = () => {
			name.value = "";
			selectedConfigId.value = null;
			selectedVersionKeys.value = /* @__PURE__ */ new Set();
			state.value = "collecting";
			sourceFilter.value = "all";
			sortOrder.value = "recent";
		};
		watch(() => props.open, async (isOpen) => {
			if (!isOpen) return;
			reset();
			try {
				await evaluationStore.fetchEvaluationConfigs(props.workflowId);
			} catch (error) {
				toast.showError(error, i18n.baseText("evaluation.setup.errors.loadDatasetsFailed"));
			}
		}, { immediate: true });
		const onSubmit = async () => {
			if (!canSubmit.value || !selectedConfigId.value) return;
			state.value = "submitting";
			const entries = buildVersionEntries(selectedVersions.value);
			try {
				const result = await store.createCollection(props.workflowId, {
					name: name.value.trim(),
					evaluationConfigId: selectedConfigId.value,
					versions: entries
				});
				state.value = "done";
				emit("created", result.id);
				close();
			} catch (error) {
				state.value = "collecting";
				toast.showError(error, i18n.baseText("evaluation.setup.errors.createFailed"));
			}
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.open,
				size: "xlarge",
				"show-close-button": true,
				header: unref(i18n).baseText("evaluation.setup.title"),
				"onUpdate:open": _cache[1] || (_cache[1] = ($event) => emit("update:open", $event))
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), {
					class: normalizeClass(_ctx.$style.body),
					"data-test-id": "setup-collection-wizard"
				}, {
					default: withCtx(() => [
						createVNode(unref(DialogDescription_default), { class: normalizeClass(_ctx.$style.description) }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.setup.subtitle")), 1)]),
							_: 1
						}, 8, ["class"]),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-base",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.setup.collectionName")), 1)]),
							_: 1
						}), createVNode(unref(Input_default), {
							modelValue: name.value,
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => name.value = $event),
							placeholder: unref(i18n).baseText("evaluation.setup.collectionName.placeholder"),
							size: "medium",
							"data-test-id": "setup-collection-wizard-name"
						}, null, 8, ["modelValue", "placeholder"])], 2),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.labelRow) }, [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-base",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.setup.dataset")), 1)]),
							_: 1
						}), createVNode(unref(N8nText_default), {
							size: "xsmall",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.setup.dataset.helper")), 1)]),
							_: 1
						})], 2), createVNode(DatasetPicker_default, {
							options: configs.value.map((c) => ({
								id: c.id,
								label: c.name
							})),
							"selected-id": selectedConfigId.value,
							"matching-versions-count": allVersions.value.length,
							"has-selection": selectedConfigId.value !== null && state.value !== "versionsLoading",
							"onUpdate:selectedId": onSelectConfig
						}, null, 8, [
							"options",
							"selected-id",
							"matching-versions-count",
							"has-selection"
						])], 2),
						selectedConfigId.value ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.field)
						}, [
							createBaseVNode("div", { class: normalizeClass(_ctx.$style.labelRow) }, [createVNode(unref(N8nText_default), {
								size: "small",
								color: "text-base",
								bold: ""
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.setup.versions")), 1)]),
								_: 1
							}), createVNode(unref(N8nText_default), {
								size: "xsmall",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.setup.versions.helper")), 1)]),
								_: 1
							})], 2),
							createBaseVNode("div", { class: normalizeClass(_ctx.$style.tableControls) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.controlChip) }, [createVNode(unref(N8nText_default), {
								size: "xsmall",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.setup.versions.filter.source")), 1)]),
								_: 1
							}), createVNode(unref(N8nSelect_default), {
								"model-value": sourceFilter.value,
								size: "small",
								class: normalizeClass(_ctx.$style.controlSelect),
								"onUpdate:modelValue": onSourceChange
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(sourceOptions.value, (opt) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: opt.value,
										value: opt.value,
										label: opt.label
									}, null, 8, ["value", "label"]);
								}), 128))]),
								_: 1
							}, 8, ["model-value", "class"])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.controlChip) }, [createVNode(unref(N8nText_default), {
								size: "xsmall",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.setup.versions.sort.label")), 1)]),
								_: 1
							}), createVNode(unref(N8nSelect_default), {
								"model-value": sortOrder.value,
								size: "small",
								class: normalizeClass(_ctx.$style.controlSelect),
								"onUpdate:modelValue": onSortChange
							}, {
								default: withCtx(() => [createVNode(unref(N8nOption_default), {
									value: "recent",
									label: unref(i18n).baseText("evaluation.setup.versions.sort.recent")
								}, null, 8, ["label"]), createVNode(unref(N8nOption_default), {
									value: "oldest",
									label: unref(i18n).baseText("evaluation.setup.versions.sort.oldest")
								}, null, 8, ["label"])]),
								_: 1
							}, 8, ["model-value", "class"])], 2)], 2),
							createVNode(VersionsTable_default, {
								versions: visibleVersions.value,
								"selected-version-ids": selectedVersionKeys.value,
								"dataset-label": datasetLabel.value,
								"workflow-id": __props.workflowId,
								"color-index-by-key": versionColorByKey.value,
								onToggleVersion
							}, null, 8, [
								"versions",
								"selected-version-ids",
								"dataset-label",
								"workflow-id",
								"color-index-by-key"
							])
						], 2)) : createCommentVNode("", true),
						selectedConfigId.value ? (openBlock(), createElementBlock("div", {
							key: 1,
							class: normalizeClass(_ctx.$style.field)
						}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.labelRow) }, [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-base",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.setup.metrics")), 1)]),
							_: 1
						}), createVNode(unref(N8nText_default), {
							size: "xsmall",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.setup.metrics.helper")), 1)]),
							_: 1
						})], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.metricsRow) }, [
							(openBlock(true), createElementBlock(Fragment, null, renderList(allMetricNames.value, (metric) => {
								return openBlock(), createElementBlock("span", {
									key: metric,
									class: normalizeClass([_ctx.$style.metricPill, _ctx.$style.metricPill_static]),
									"data-test-id": "setup-collection-wizard-metric"
								}, [createVNode(unref(N8nIcon_default), {
									icon: "check",
									size: "xsmall"
								}), createBaseVNode("span", null, toDisplayString(metric), 1)], 2);
							}), 128)),
							allMetricNames.value.length > 0 ? (openBlock(), createBlock(unref(N8nTooltip_default), {
								key: 0,
								placement: "top",
								content: unref(i18n).baseText("evaluation.setup.metrics.addComingSoon")
							}, {
								default: withCtx(() => [createBaseVNode("button", {
									type: "button",
									disabled: "",
									class: normalizeClass([_ctx.$style.metricPill, _ctx.$style.metricPill_add]),
									"data-test-id": "setup-collection-wizard-add-metric"
								}, [createVNode(unref(N8nIcon_default), {
									icon: "plus",
									size: "xsmall"
								}), createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("evaluation.setup.metrics.addMetric")), 1)], 2)]),
								_: 1
							}, 8, ["content"])) : createCommentVNode("", true),
							allMetricNames.value.length === 0 ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 1,
								size: "xsmall",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.setup.metrics.empty")), 1)]),
								_: 1
							})) : createCommentVNode("", true)
						], 2)], 2)) : createCommentVNode("", true)
					]),
					_: 1
				}, 8, ["class"]), createVNode(unref(DialogFooter_default), { class: normalizeClass(_ctx.$style.footer) }, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footerSummary) }, [createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-base",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(footerSummaryText.value), 1)]),
						_: 1
					}), footerExplainText.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "xsmall",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(footerExplainText.value), 1)]),
						_: 1
					})) : createCommentVNode("", true)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.footerActions) }, [createVNode(unref(N8nButton_default), {
						variant: "outline",
						label: unref(i18n).baseText("evaluation.setup.footer.cancel"),
						"data-test-id": "setup-collection-wizard-cancel",
						onClick: close
					}, null, 8, ["label"]), createVNode(unref(N8nButton_default), {
						variant: "solid",
						label: ctaText.value,
						disabled: !canSubmit.value,
						loading: state.value === "submitting",
						"data-test-id": "setup-collection-wizard-submit",
						onClick: onSubmit
					}, null, 8, [
						"label",
						"disabled",
						"loading"
					])], 2)]),
					_: 1
				}, 8, ["class"])]),
				_: 1
			}, 8, ["open", "header"]);
		};
	}
}), [["__cssModules", { "$style": {
	description: "_description_10622_1",
	body: "_body_10622_5",
	field: "_field_10622_9",
	labelRow: "_labelRow_10622_15",
	tableControls: "_tableControls_10622_21",
	controlChip: "_controlChip_10622_28",
	controlSelect: "_controlSelect_10622_34",
	metricsRow: "_metricsRow_10622_38",
	metricPill: "_metricPill_10622_45",
	metricPill_static: "_metricPill_static_10622_59",
	metricPill_add: "_metricPill_add_10622_65",
	footer: "_footer_10622_72",
	footerSummary: "_footerSummary_10622_79",
	footerActions: "_footerActions_10622_86"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/EvalCollectionsListView/UngroupedRunRow.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1 = ["aria-hidden"];
var UngroupedRunRow_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "UngroupedRunRow",
	props: {
		run: {},
		datasetNameByConfigId: {}
	},
	setup(__props) {
		const STATUS_PILL_THEME = {
			completed: "success",
			running: "outline",
			new: "outline",
			error: "danger",
			cancelled: "warning",
			success: "success",
			warning: "warning"
		};
		const STATUS_FRIENDLY_KEY = {
			completed: "evaluation.collections.row.status.done",
			success: "evaluation.collections.row.status.done",
			running: "evaluation.collections.row.status.running",
			new: "evaluation.collections.row.status.queued",
			error: "evaluation.collections.row.status.failed",
			cancelled: "evaluation.collections.row.status.cancelled",
			warning: "evaluation.collections.row.status.warning"
		};
		const props = __props;
		const i18n = useI18n();
		const score = computed(() => {
			const avg = averageNormalizedScore(props.run.metrics);
			return avg === null ? null : Math.round(avg * 100);
		});
		const statusTheme = computed(() => STATUS_PILL_THEME[props.run.status] ?? "outline");
		const statusLabel = computed(() => {
			const key = STATUS_FRIENDLY_KEY[props.run.status];
			if (key) return i18n.baseText(key);
			return props.run.status;
		});
		const datasetName = computed(() => {
			const cfgId = props.run.evaluationConfigId;
			if (!cfgId) return null;
			return props.datasetNameByConfigId?.[cfgId] ?? null;
		});
		const formattedDate = computed(() => {
			const d = new Date(props.run.runAt);
			if (Number.isNaN(d.getTime())) return props.run.runAt;
			return `${d.toLocaleDateString(void 0, {
				month: "short",
				day: "numeric"
			})} · ${d.toLocaleTimeString(void 0, {
				hour: "2-digit",
				minute: "2-digit"
			})}`;
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.runRow),
				"data-test-id": "eval-collections-ungrouped-row"
			}, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.runId) }, [createVNode(unref(N8nText_default), {
					size: "small",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode("#" + toDisplayString(__props.run.id.slice(0, 8)), 1)]),
					_: 1
				}), createVNode(unref(N8nText_default), {
					size: "xsmall",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(formattedDate.value), 1)]),
					_: 1
				})], 2),
				datasetName.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
					key: 0,
					variant: "outline",
					class: normalizeClass(_ctx.$style.datasetChip)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(datasetName.value), 1)]),
					_: 1
				}, 8, ["class"])) : (openBlock(), createElementBlock("span", {
					key: 1,
					class: normalizeClass(_ctx.$style.datasetEmpty)
				}, [createVNode(unref(N8nText_default), {
					size: "xsmall",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.collections.row.noDataset")), 1)]),
					_: 1
				})], 2)),
				createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.progressTrack),
					"aria-hidden": score.value === null
				}, [score.value !== null ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.progressFill),
					style: normalizeStyle({ width: `${score.value}%` })
				}, null, 6)) : createCommentVNode("", true)], 10, _hoisted_1),
				score.value !== null ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 2,
					size: "small",
					bold: "",
					class: normalizeClass(_ctx.$style.scoreText)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(score.value) + "%", 1)]),
					_: 1
				}, 8, ["class"])) : (openBlock(), createBlock(unref(N8nText_default), {
					key: 3,
					size: "small",
					color: "text-light",
					class: normalizeClass(_ctx.$style.scoreText)
				}, {
					default: withCtx(() => [..._cache[0] || (_cache[0] = [createTextVNode("—", -1)])]),
					_: 1
				}, 8, ["class"])),
				createVNode(unref(N8nBadge_default), {
					variant: statusTheme.value,
					class: normalizeClass(_ctx.$style.statusPill)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(statusLabel.value), 1)]),
					_: 1
				}, 8, ["variant", "class"])
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	runRow: "_runRow_13cc3_1",
	runId: "_runId_13cc3_12",
	datasetChip: "_datasetChip_13cc3_20",
	datasetEmpty: "_datasetEmpty_13cc3_24",
	progressTrack: "_progressTrack_13cc3_28",
	progressFill: "_progressFill_13cc3_36",
	scoreText: "_scoreText_13cc3_46",
	statusPill: "_statusPill_13cc3_51"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/views/EvalCollectionsListView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var EvalCollectionsListView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "EvalCollectionsListView",
	props: {
		workflowId: {},
		pageSize: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const toast = useToast();
		const store = useEvalCollectionsStore();
		const evaluationStore = useEvaluationStore();
		const wizardOpen = ref(false);
		const collections = computed(() => store.getCollections(props.workflowId));
		const collectionsPage = ref(1);
		const showCollectionsPagination = computed(() => !!props.pageSize && collections.value.length > props.pageSize);
		const pagedCollections = computed(() => {
			if (!props.pageSize) return collections.value;
			const start = (collectionsPage.value - 1) * props.pageSize;
			return collections.value.slice(start, start + props.pageSize);
		});
		watch(() => collections.value.length, () => {
			const maxPage = props.pageSize ? Math.max(1, Math.ceil(collections.value.length / props.pageSize)) : 1;
			if (collectionsPage.value > maxPage) collectionsPage.value = maxPage;
		});
		const ungroupedRuns = computed(() => {
			return (evaluationStore.testRunsByWorkflowId[props.workflowId] ?? []).filter((r) => !r.collectionId).sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime());
		});
		const datasetNameByConfigId = computed(() => {
			const map = {};
			for (const cfg of evaluationStore.evaluationConfigsByWorkflowId[props.workflowId] ?? []) map[cfg.id] = cfg.name;
			return map;
		});
		const onOpenWizard = () => {
			wizardOpen.value = true;
		};
		const onCreated = async () => {
			await Promise.all([store.fetchCollections(props.workflowId), evaluationStore.fetchTestRuns(props.workflowId)]);
		};
		const loadForWorkflow = async (workflowId) => {
			try {
				await Promise.all([
					store.fetchCollections(workflowId),
					evaluationStore.fetchEvaluationConfigs(workflowId).catch(() => null),
					evaluationStore.fetchTestRuns(workflowId)
				]);
				await Promise.all(store.getCollections(workflowId).slice(0, 3).map((c) => store.fetchCollectionDetail(workflowId, c.id).catch(() => null)));
			} catch (error) {
				toast.showError(error, i18n.baseText("evaluation.collections.errors.fetchFailed"));
			}
		};
		onMounted(async () => {
			await loadForWorkflow(props.workflowId);
		});
		const stopAllPolling = () => {
			store.cleanupPolling();
			evaluationStore.cleanupPolling();
		};
		watch(() => props.workflowId, async (next, prev) => {
			if (next === prev) return;
			collectionsPage.value = 1;
			stopAllPolling();
			await loadForWorkflow(next);
		});
		onBeforeUnmount(() => {
			stopAllPolling();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.viewWrapper) }, [createBaseVNode("div", {
				class: normalizeClass(_ctx.$style.view),
				"data-test-id": "eval-collections-list-view"
			}, [
				createBaseVNode("header", { class: normalizeClass(_ctx.$style.header) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerText) }, [createVNode(unref(N8nText_default), {
					tag: "h2",
					size: "xlarge",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.collections.title")), 1)]),
					_: 1
				}), createVNode(unref(N8nText_default), {
					tag: "p",
					size: "small",
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.collections.subtitle")), 1)]),
					_: 1
				})], 2), createVNode(unref(N8nButton_default), {
					variant: "solid",
					icon: "plus",
					label: unref(i18n).baseText("evaluation.collections.newCollection"),
					"data-test-id": "eval-collections-new-button",
					onClick: onOpenWizard
				}, null, 8, ["label"])], 2),
				createBaseVNode("section", { class: normalizeClass(_ctx.$style.section) }, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.sectionHeader) }, [createVNode(unref(N8nText_default), {
						tag: "h3",
						size: "medium",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.collections.section.collections")), 1)]),
						_: 1
					}), createVNode(unref(N8nBadge_default), { variant: "outline" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(collections.value.length), 1)]),
						_: 1
					})], 2),
					collections.value.length === 0 ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.emptyHint)
					}, [createVNode(unref(N8nIcon_default), {
						icon: "layers",
						size: "medium"
					}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.emptyHintBody) }, [createVNode(unref(N8nText_default), {
						size: "small",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.collections.empty.title")), 1)]),
						_: 1
					}), createVNode(unref(N8nText_default), {
						size: "xsmall",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.collections.empty.subtitle")), 1)]),
						_: 1
					})], 2)], 2)) : createCommentVNode("", true),
					(openBlock(true), createElementBlock(Fragment, null, renderList(pagedCollections.value, (collection) => {
						return openBlock(), createBlock(CollectionCard_default, {
							key: collection.id,
							collection,
							detail: unref(store).getDetail(collection.id),
							"workflow-id": __props.workflowId,
							"dataset-name": datasetNameByConfigId.value[collection.evaluationConfigId]
						}, null, 8, [
							"collection",
							"detail",
							"workflow-id",
							"dataset-name"
						]);
					}), 128)),
					showCollectionsPagination.value ? (openBlock(), createBlock(unref(N8nPagination_default), {
						key: 1,
						class: normalizeClass(_ctx.$style.pagination),
						page: collectionsPage.value,
						"onUpdate:page": _cache[0] || (_cache[0] = ($event) => collectionsPage.value = $event),
						"items-per-page": __props.pageSize,
						total: collections.value.length,
						"show-total": false,
						"show-sizes": false
					}, null, 8, [
						"class",
						"page",
						"items-per-page",
						"total"
					])) : createCommentVNode("", true)
				], 2),
				createBaseVNode("section", { class: normalizeClass(_ctx.$style.section) }, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.sectionHeader) }, [
						createVNode(unref(N8nText_default), {
							tag: "h3",
							size: "medium",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.collections.section.ungrouped")), 1)]),
							_: 1
						}),
						createVNode(unref(N8nBadge_default), { variant: "outline" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(ungroupedRuns.value.length), 1)]),
							_: 1
						}),
						createVNode(unref(N8nText_default), {
							class: normalizeClass(_ctx.$style.ungroupedHelper),
							size: "xsmall",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.collections.section.ungrouped.helper")), 1)]),
							_: 1
						}, 8, ["class"])
					], 2),
					ungroupedRuns.value.length === 0 ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.emptyHint)
					}, [createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.collections.section.ungrouped.empty")), 1)]),
						_: 1
					})], 2)) : createCommentVNode("", true),
					(openBlock(true), createElementBlock(Fragment, null, renderList(ungroupedRuns.value, (run) => {
						return openBlock(), createBlock(UngroupedRunRow_default, {
							key: run.id,
							run,
							"dataset-name-by-config-id": datasetNameByConfigId.value
						}, null, 8, ["run", "dataset-name-by-config-id"]);
					}), 128))
				], 2),
				createVNode(SetupCollectionWizard_default, {
					open: wizardOpen.value,
					"workflow-id": __props.workflowId,
					"onUpdate:open": _cache[1] || (_cache[1] = ($event) => wizardOpen.value = $event),
					onCreated
				}, null, 8, ["open", "workflow-id"])
			], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	viewWrapper: "_viewWrapper_16wj8_1",
	view: "_view_16wj8_1",
	header: "_header_16wj8_17",
	headerText: "_headerText_16wj8_24",
	section: "_section_16wj8_30",
	pagination: "_pagination_16wj8_36",
	sectionHeader: "_sectionHeader_16wj8_42",
	ungroupedHelper: "_ungroupedHelper_16wj8_48",
	emptyHint: "_emptyHint_16wj8_52",
	emptyHintBody: "_emptyHintBody_16wj8_63"
} }]]);
//#endregion
export { EvalCollectionsListView_default as default };
