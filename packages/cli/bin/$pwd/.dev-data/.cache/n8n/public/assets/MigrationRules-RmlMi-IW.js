import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Du as useAsyncState, Gd as createTextVNode, Hd as createElementBlock, Ho as RouterLink, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Od as useCssModule, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _d as useTimeoutFn, _p as normalizeClass, bd as I18nT, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, mf as renderList, xr as require_FileSaver_min, yp as normalizeStyle, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Bj as SettingsRow_default, Hj as SettingsPageHeader_default, Ij as SettingsRowGroup_default, Kd as useDocumentTitle, SN as _plugin_vue_export_helper_default, Uj as SettingsLayout_default, _N as N8nText_default, bC as useRootStore, bM as N8nExternalLink_default, dC as useToast, fC as VIEWS, fN as N8nTooltip_default, hM as N8nLink_default, jN as useI18n, tN as N8nLoading_default, xN as N8nIcon_default, xm as hasPermission, yN as N8nButton_default, yj as Tabs_default, yu as TimeAgo_default } from "./app-D5flEmb-.js";
import { t as require_orderBy } from "./orderBy-qvd4mxOh.js";
import { c as refreshReport, n as exportReport, r as getReport } from "./breaking-changes-DdrX0dBO.js";
import { n as BREAKING_CHANGES_DOCUMENTATION_URL, r as TARGET_VERSION_DISPLAY, t as ImpactTag_default } from "./ImpactTag-CtPDEa6S.js";
//#region src/features/settings/migrationReport/components/EmptyTab.vue?vue&type=script&setup=true&lang.ts
var import_orderBy = /* @__PURE__ */ __toESM(require_orderBy(), 1);
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var EmptyTab_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "EmptyTab",
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.NoIssuesContainer) }, [createVNode(unref(N8nText_default), {
				tag: "h3",
				size: "large",
				color: "text-base",
				class: "mb-2xs"
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "title")]),
				_: 3
			}), createVNode(unref(N8nText_default), {
				tag: "p",
				size: "medium",
				color: "text-light",
				class: "mb-2xl"
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "description")]),
				_: 3
			})], 2);
		};
	}
}), [["__cssModules", { "$style": { NoIssuesContainer: "_NoIssuesContainer_1o8ra_2" } }]]);
//#endregion
//#region src/features/settings/migrationReport/MigrationRules.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var import_FileSaver_min = /* @__PURE__ */ __toESM(require_FileSaver_min(), 1);
var _hoisted_1 = ["aria-valuenow", "aria-label"];
var MigrationRules_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "MigrationRules",
	setup(__props) {
		const $style = useCssModule();
		const rootStore = useRootStore();
		const i18n = useI18n();
		const toast = useToast();
		useDocumentTitle().set(i18n.baseText("settings.migrationReport"));
		const currentTab = ref("workflow-issues");
		const canManageReport = hasPermission(["rbac"], { rbac: { scope: "workflow:update" } });
		const versionQuery = { version: "v3" };
		function isOpenRule(rule) {
			return rule.nbAffectedWorkflows > 0;
		}
		const { state, isLoading, execute } = useAsyncState(async (refresh = false) => {
			if (refresh) {
				const response = await refreshReport(rootStore.restApiContext, versionQuery);
				if (!response.report.workflowResults.some(isOpenRule) && response.report.instanceResults.length > 0) currentTab.value = "instance-issues";
				return response;
			}
			return await getReport(rootStore.restApiContext, versionQuery);
		}, void 0);
		const isSlowLoading = ref(false);
		const slowLoadingTimer = useTimeoutFn(() => isSlowLoading.value = true, 5e3, { immediate: false });
		watch(isLoading, (loading) => {
			isSlowLoading.value = false;
			if (loading) slowLoadingTimer.start();
			else slowLoadingTimer.stop();
		}, { immediate: true });
		const openWorkflowRulesCount = computed(() => state.value?.report.workflowResults.filter(isOpenRule).length ?? 0);
		async function refreshReport$1() {
			await execute(0, true);
		}
		const isExporting = ref(false);
		async function exportReport$1() {
			isExporting.value = true;
			try {
				const { blob, filename } = await exportReport(rootStore.restApiContext, versionQuery);
				(0, import_FileSaver_min.saveAs)(blob, filename);
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.migrationReport.export.error.title"));
			} finally {
				isExporting.value = false;
			}
		}
		const tabs = computed(() => {
			const workflowIssues = {
				label: i18n.baseText("settings.migrationReport.tabs.workflowIssues"),
				value: "workflow-issues",
				tag: openWorkflowRulesCount.value ? String(openWorkflowRulesCount.value) : void 0
			};
			if (!canManageReport) return [workflowIssues];
			return [workflowIssues, {
				label: i18n.baseText("settings.migrationReport.tabs.instanceIssues"),
				value: "instance-issues",
				tag: state.value?.report.instanceResults.length ? String(state.value.report.instanceResults.length) : void 0
			}];
		});
		const workflowTooltips = computed(() => ({
			upgradeBlocked: i18n.baseText("settings.migrationReport.workflowTooltip.upgradeBlocked"),
			executionsFail: i18n.baseText("settings.migrationReport.workflowTooltip.executionsFail"),
			executionsMightFail: i18n.baseText("settings.migrationReport.workflowTooltip.executionsMightFail"),
			behaviorChanges: i18n.baseText("settings.migrationReport.workflowTooltip.behaviorChanges"),
			capabilityRemoved: i18n.baseText("settings.migrationReport.workflowTooltip.capabilityRemoved")
		}));
		const instanceTooltips = computed(() => ({
			upgradeBlocked: i18n.baseText("settings.migrationReport.instanceTooltip.upgradeBlocked"),
			executionsFail: i18n.baseText("settings.migrationReport.instanceTooltip.executionsFail"),
			executionsMightFail: i18n.baseText("settings.migrationReport.instanceTooltip.executionsMightFail"),
			behaviorChanges: i18n.baseText("settings.migrationReport.instanceTooltip.behaviorChanges"),
			capabilityRemoved: i18n.baseText("settings.migrationReport.instanceTooltip.capabilityRemoved")
		}));
		const compatibleWorkflowsCount = computed(() => {
			if (!state.value) return 0;
			return state.value.totalWorkflows - state.value.totalAffectedWorkflows;
		});
		const compatiblePercentage = computed(() => {
			const total = state.value?.totalWorkflows ?? 0;
			if (total === 0) return 0;
			return Math.floor(compatibleWorkflowsCount.value / total * 100);
		});
		const progressLabel = computed(() => i18n.baseText("settings.migrationReport.progress.label", { interpolate: {
			compatibleCount: compatibleWorkflowsCount.value.toLocaleString(),
			totalCount: (state.value?.totalWorkflows ?? 0).toLocaleString()
		} }));
		function ruleDetailRoute(ruleId) {
			return {
				name: VIEWS.MIGRATION_RULE_REPORT,
				params: { migrationRuleId: ruleId }
			};
		}
		const impactOrder = {
			upgradeBlocked: 0,
			executionsFail: 1,
			executionsMightFail: 2,
			behaviorChanges: 3,
			capabilityRemoved: 4
		};
		const sortedWorkflowResults = computed(() => {
			if (!state.value?.report.workflowResults) return [];
			return (0, import_orderBy.default)(state.value.report.workflowResults, [(issue) => isOpenRule(issue) ? 0 : 1, (issue) => impactOrder[issue.ruleImpact]], ["asc", "asc"]);
		});
		const sortedInstanceResults = computed(() => {
			if (!state.value?.report.instanceResults) return [];
			return (0, import_orderBy.default)(state.value.report.instanceResults, [(issue) => impactOrder[issue.ruleImpact]], ["asc"]);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsLayout_default), null, {
				default: withCtx(() => [createVNode(unref(SettingsPageHeader_default), {
					title: unref(i18n).baseText("settings.migrationReport"),
					description: unref(i18n).baseText("settings.migrationReport.description", { interpolate: {
						compatibleCount: compatibleWorkflowsCount.value.toLocaleString(),
						totalCount: (unref(state)?.totalWorkflows ?? 0).toLocaleString(),
						version: unref(TARGET_VERSION_DISPLAY)
					} }),
					"docs-url": unref(BREAKING_CHANGES_DOCUMENTATION_URL),
					"docs-label": unref(i18n).baseText("settings.migrationReport.documentationLink"),
					"docs-leading-text": ""
				}, null, 8, [
					"title",
					"description",
					"docs-url",
					"docs-label"
				]), createBaseVNode("div", null, [
					!unref(canManageReport) ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						tag: "p",
						size: "small",
						color: "text-light",
						class: "mb-s",
						"data-test-id": "migration-report-scope-note"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.migrationReport.scopeNote")), 1)]),
						_: 1
					})) : createCommentVNode("", true),
					unref(state) ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(unref($style).Progress)
					}, [createBaseVNode("div", {
						class: normalizeClass(unref($style).ProgressTrack),
						role: "progressbar",
						"aria-valuenow": compatiblePercentage.value,
						"aria-valuemin": "0",
						"aria-valuemax": "100",
						"aria-label": progressLabel.value,
						"data-test-id": "migration-report-progress"
					}, [createBaseVNode("div", {
						class: normalizeClass(unref($style).ProgressFill),
						style: normalizeStyle({ width: `${compatiblePercentage.value}%` })
					}, null, 6)], 10, _hoisted_1), createVNode(unref(N8nText_default), {
						size: "medium",
						color: "text-base",
						class: normalizeClass(unref($style).NoLineBreak)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(progressLabel.value), 1)]),
						_: 1
					}, 8, ["class"])], 2)) : createCommentVNode("", true),
					createBaseVNode("div", { class: normalizeClass(unref($style).ActionBar) }, [createVNode(unref(Tabs_default), {
						modelValue: currentTab.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => currentTab.value = $event),
						options: tabs.value,
						variant: "modern"
					}, null, 8, ["modelValue", "options"]), createBaseVNode("div", { class: normalizeClass(unref($style).RefreshGroup) }, [
						unref(state)?.report.generatedAt ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							size: "small",
							color: "text-light",
							class: normalizeClass(unref($style).NoLineBreak),
							"data-test-id": "migration-report-last-updated"
						}, {
							default: withCtx(() => [createVNode(unref(I18nT), {
								keypath: "settings.migrationReport.lastUpdated",
								tag: "span",
								scope: "global"
							}, {
								time: withCtx(() => [createVNode(TimeAgo_default, { date: unref(state).report.generatedAt.toString() }, null, 8, ["date"])]),
								_: 1
							})]),
							_: 1
						}, 8, ["class"])) : unref(state) ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 1,
							size: "small",
							color: "text-light",
							class: normalizeClass(unref($style).NoLineBreak),
							"data-test-id": "migration-report-last-updated"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.migrationReport.neverUpdated")), 1)]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true),
						createVNode(unref(N8nButton_default), {
							variant: "outline",
							label: unref(i18n).baseText("settings.migrationReport.exportButton"),
							icon: "download",
							loading: isExporting.value,
							disabled: unref(isLoading) || isExporting.value || !unref(state),
							"data-test-id": "migration-report-export",
							onClick: exportReport$1
						}, null, 8, [
							"label",
							"loading",
							"disabled"
						]),
						unref(canManageReport) ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 2,
							variant: "outline",
							label: unref(i18n).baseText("settings.migrationReport.refreshButton"),
							icon: "refresh-cw",
							loading: unref(isLoading),
							disabled: unref(isLoading),
							onClick: refreshReport$1
						}, null, 8, [
							"label",
							"loading",
							"disabled"
						])) : createCommentVNode("", true)
					], 2)], 2),
					unref(isLoading) ? (openBlock(), createElementBlock("div", {
						key: 2,
						class: normalizeClass(unref($style).LoadingContainer)
					}, [createVNode(unref(SettingsRowGroup_default), null, {
						default: withCtx(() => [(openBlock(), createElementBlock(Fragment, null, renderList(4, (i) => {
							return createVNode(unref(SettingsRow_default), { key: i }, {
								info: withCtx(() => [createVNode(unref(N8nLoading_default), {
									variant: "p",
									rows: 3,
									class: normalizeClass(unref($style).PLoading)
								}, null, 8, ["class"])]),
								action: withCtx(() => [createVNode(unref(N8nLoading_default), { variant: "button" })]),
								_: 1
							});
						}), 64))]),
						_: 1
					}), isSlowLoading.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(unref($style).SlowLoadingOverlay),
						role: "status",
						"data-test-id": "migration-report-slow-loading"
					}, [createVNode(unref(N8nText_default), {
						tag: "p",
						size: "medium",
						color: "text-dark",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.migrationReport.slowLoading.title")), 1)]),
						_: 1
					}), createVNode(unref(N8nText_default), {
						tag: "p",
						size: "small",
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.migrationReport.slowLoading.description")), 1)]),
						_: 1
					})], 2)) : createCommentVNode("", true)], 2)) : currentTab.value === "workflow-issues" ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [unref(state) && openWorkflowRulesCount.value === 0 ? (openBlock(), createBlock(EmptyTab_default, { key: 0 }, {
						title: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.migrationReport.emptyWorkflowIssues.title")), 1)]),
						description: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.migrationReport.emptyWorkflowIssues.description", { interpolate: { version: unref(TARGET_VERSION_DISPLAY) } })), 1)]),
						_: 1
					})) : createCommentVNode("", true), sortedWorkflowResults.value.length > 0 ? (openBlock(), createBlock(unref(SettingsRowGroup_default), { key: 1 }, {
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(sortedWorkflowResults.value, (issue) => {
							return openBlock(), createBlock(unref(SettingsRow_default), { key: issue.ruleId }, {
								info: withCtx(() => [
									createBaseVNode("div", { class: normalizeClass(unref($style).CardTitleContainer) }, [createVNode(unref(N8nText_default), {
										tag: "h3",
										size: "medium",
										color: "text-dark",
										bold: ""
									}, {
										default: withCtx(() => [createVNode(unref(RouterLink), {
											to: ruleDetailRoute(issue.ruleId),
											class: normalizeClass(unref($style).TitleLink),
											"data-test-id": "migration-rule-title-link"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(issue.ruleTitle), 1)]),
											_: 2
										}, 1032, ["to", "class"])]),
										_: 2
									}, 1024), createVNode(unref(N8nTooltip_default), {
										content: workflowTooltips.value[issue.ruleImpact],
										placement: "top",
										enterable: false
									}, {
										default: withCtx(() => [createVNode(ImpactTag_default, { impact: issue.ruleImpact }, null, 8, ["impact"])]),
										_: 2
									}, 1032, ["content"])], 2),
									createVNode(unref(N8nText_default), {
										tag: "p",
										color: "text-base"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(issue.ruleDescription) + toDisplayString(issue.ruleDescription.endsWith(".") ? "" : ".") + " ", 1), issue.ruleDocumentationUrl ? (openBlock(), createBlock(unref(N8nExternalLink_default), {
											key: 0,
											inline: "",
											size: "small",
											href: issue.ruleDocumentationUrl
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.migrationReport.documentation")), 1)]),
											_: 1
										}, 8, ["href"])) : createCommentVNode("", true)]),
										_: 2
									}, 1024),
									createBaseVNode("div", {
										class: normalizeClass(unref($style).FindingCounts),
										"data-test-id": "migration-rule-finding-counts"
									}, [issue.nbAffectedWorkflows > 0 ? (openBlock(), createBlock(unref(N8nText_default), {
										key: 0,
										size: "small",
										color: "text-light",
										class: normalizeClass(unref($style).FindingCount)
									}, {
										default: withCtx(() => [createBaseVNode("span", { class: normalizeClass([unref($style).FindingCountDot, unref($style).open]) }, null, 2), createTextVNode(" " + toDisplayString(unref(i18n).baseText("settings.migrationReport.findingCount.open", { interpolate: { count: issue.nbAffectedWorkflows } })), 1)]),
										_: 2
									}, 1032, ["class"])) : createCommentVNode("", true), issue.nbWontFixWorkflows > 0 ? (openBlock(), createBlock(unref(N8nText_default), {
										key: 1,
										size: "small",
										color: "text-light",
										class: normalizeClass(unref($style).FindingCount)
									}, {
										default: withCtx(() => [createBaseVNode("span", { class: normalizeClass([unref($style).FindingCountDot, unref($style).wontFix]) }, null, 2), createTextVNode(" " + toDisplayString(unref(i18n).baseText("settings.migrationReport.findingCount.wontFix", { interpolate: { count: issue.nbWontFixWorkflows } })), 1)]),
										_: 2
									}, 1032, ["class"])) : createCommentVNode("", true)], 2)
								]),
								action: withCtx(() => [createVNode(unref(N8nLink_default), {
									class: normalizeClass(unref($style).NoLineBreak),
									theme: "text",
									to: ruleDetailRoute(issue.ruleId)
								}, {
									default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(unref($style).NoLineBreak) }, [createTextVNode(toDisplayString(isOpenRule(issue) ? unref(i18n).baseText("settings.migrationReport.workflowsCount", { interpolate: { count: issue.nbAffectedWorkflows } }) : unref(i18n).baseText("settings.migrationReport.resolved")) + " ", 1), createVNode(unref(N8nIcon_default), {
										icon: "chevron-right",
										size: 24
									})], 2)]),
									_: 2
								}, 1032, ["class", "to"])]),
								_: 2
							}, 1024);
						}), 128))]),
						_: 1
					})) : createCommentVNode("", true)], 64)) : currentTab.value === "instance-issues" ? (openBlock(), createElementBlock(Fragment, { key: 4 }, [unref(state)?.report.instanceResults.length === 0 ? (openBlock(), createBlock(EmptyTab_default, { key: 0 }, {
						title: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.migrationReport.emptyInstanceIssues.title")), 1)]),
						description: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.migrationReport.emptyInstanceIssues.description", { interpolate: { version: unref(TARGET_VERSION_DISPLAY) } })), 1)]),
						_: 1
					})) : (openBlock(), createBlock(unref(SettingsRowGroup_default), { key: 1 }, {
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(sortedInstanceResults.value, (issue) => {
							return openBlock(), createBlock(unref(SettingsRow_default), { key: issue.ruleId }, {
								info: withCtx(() => [createBaseVNode("div", { class: normalizeClass(unref($style).CardTitleContainer) }, [createVNode(unref(N8nText_default), { tag: "h3" }, {
									default: withCtx(() => [createTextVNode(toDisplayString(issue.ruleTitle), 1)]),
									_: 2
								}, 1024), createVNode(unref(N8nTooltip_default), {
									content: instanceTooltips.value[issue.ruleImpact],
									placement: "top",
									enterable: false
								}, {
									default: withCtx(() => [createVNode(ImpactTag_default, { impact: issue.ruleImpact }, null, 8, ["impact"])]),
									_: 2
								}, 1032, ["content"])], 2), createVNode(unref(N8nText_default), {
									tag: "p",
									color: "text-base"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(issue.ruleDescription) + toDisplayString(issue.ruleDescription.endsWith(".") ? "" : ".") + " ", 1), issue.ruleDocumentationUrl ? (openBlock(), createBlock(unref(N8nExternalLink_default), {
										key: 0,
										inline: "",
										size: "small",
										href: issue.ruleDocumentationUrl
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.migrationReport.documentation")), 1)]),
										_: 1
									}, 8, ["href"])) : createCommentVNode("", true)]),
									_: 2
								}, 1024)]),
								_: 2
							}, 1024);
						}), 128))]),
						_: 1
					}))], 64)) : createCommentVNode("", true)
				])]),
				_: 1
			});
		};
	}
}), [["__cssModules", { "$style": {
	CardTitleContainer: "_CardTitleContainer_19dll_2",
	NoLineBreak: "_NoLineBreak_19dll_9",
	Progress: "_Progress_19dll_16",
	ProgressTrack: "_ProgressTrack_19dll_23",
	ProgressFill: "_ProgressFill_19dll_31",
	ActionBar: "_ActionBar_19dll_37",
	RefreshGroup: "_RefreshGroup_19dll_44",
	LoadingContainer: "_LoadingContainer_19dll_50",
	SlowLoadingOverlay: "_SlowLoadingOverlay_19dll_54",
	PLoading: "_PLoading_19dll_66",
	TitleLink: "_TitleLink_19dll_72",
	FindingCounts: "_FindingCounts_19dll_81",
	FindingCount: "_FindingCount_19dll_81",
	FindingCountDot: "_FindingCountDot_19dll_93",
	open: "_open_19dll_98",
	wontFix: "_wontFix_19dll_102"
} }]]);
//#endregion
export { MigrationRules_default as default };
