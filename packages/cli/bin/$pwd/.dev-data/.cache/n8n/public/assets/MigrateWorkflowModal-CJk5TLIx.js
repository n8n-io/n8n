import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { JA as DialogHeader_default, Jg as useUIStore, KA as Dialog_default, LM as N8nCallout_default, Mw as ResponseError, Od as useWorkflowsStore, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, WA as DialogBody_default, _N as N8nText_default, bC as useRootStore, cx as MIGRATE_WORKFLOW_MODAL_KEY, dC as useToast, hM as N8nLink_default, jN as useI18n, qA as DialogTitle_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { o as migrateWorkflowForRule } from "./breaking-changes-DdrX0dBO.js";
import { t as useMigrationFindingAssistant } from "./useMigrationFindingAssistant-BxpHdfVr.js";
//#region src/features/settings/migrationReport/MigrateWorkflowModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1 = ["data-test-id"];
var MigrateWorkflowModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "MigrateWorkflowModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const toast = useToast();
		const workflowsStore = useWorkflowsStore();
		const uiStore = useUIStore();
		const modalOpen = computed(() => uiStore.modalsById[MIGRATE_WORKFLOW_MODAL_KEY]?.open === true);
		const workflows = computed(() => props.data.workflows);
		const isBulk = computed(() => workflows.value.length > 1);
		const phase = ref("confirm");
		const migrating = ref(false);
		const outcomes = ref([]);
		const publishing = ref(false);
		const publishedWorkflowIds = ref(/* @__PURE__ */ new Set());
		const succeeded = computed(() => outcomes.value.filter((outcome) => "result" in outcome));
		const failed = computed(() => outcomes.value.filter((outcome) => "error" in outcome));
		const toPublish = computed(() => succeeded.value.filter((outcome) => outcome.result.republishable && !publishedWorkflowIds.value.has(outcome.workflow.id)));
		const title = computed(() => isBulk.value ? i18n.baseText("settings.migrationReport.detail.migrate.modal.bulkTitle", { interpolate: { count: String(workflows.value.length) } }) : i18n.baseText("settings.migrationReport.detail.migrate.modal.title", { interpolate: { name: workflows.value[0].name } }));
		const confirmLabel = computed(() => {
			if (!isBulk.value) return i18n.baseText("settings.migrationReport.detail.migrate.modal.confirmButton");
			const total = String(workflows.value.length);
			return migrating.value ? i18n.baseText("settings.migrationReport.detail.migrate.modal.bulkProgress", { interpolate: {
				done: String(outcomes.value.length),
				total
			} }) : i18n.baseText("settings.migrationReport.detail.migrate.modal.bulkConfirmButton", { interpolate: { count: total } });
		});
		function migratedNodes({ workflow, result }) {
			return result.migratedNodeIds.map((id) => ({
				id,
				name: workflow.issues.find((issue) => issue.nodeId === id)?.nodeName ?? id
			}));
		}
		function warnings({ result }) {
			return [...result.notes, ...result.unmapped];
		}
		function toMigrationError(e) {
			const meta = e instanceof ResponseError ? e.meta : void 0;
			return {
				message: e instanceof Error ? e.message : String(e),
				node: typeof meta?.nodeId === "string" ? {
					id: meta.nodeId,
					name: typeof meta.nodeName === "string" ? meta.nodeName : meta.nodeId
				} : void 0
			};
		}
		async function handleMigrate() {
			migrating.value = true;
			try {
				for (const workflow of workflows.value) try {
					const result = await migrateWorkflowForRule(useRootStore().restApiContext, props.data.ruleId, workflow.id);
					outcomes.value = [...outcomes.value, {
						workflow,
						result
					}];
					props.data.eventBus.emit("migrated", { workflowId: workflow.id });
				} catch (e) {
					outcomes.value = [...outcomes.value, {
						workflow,
						error: toMigrationError(e)
					}];
				}
				phase.value = "result";
			} finally {
				migrating.value = false;
			}
		}
		async function handlePublish() {
			publishing.value = true;
			try {
				for (const { workflow, result } of toPublish.value) try {
					await workflowsStore.publishWorkflow(workflow.id, { versionId: result.newVersionId });
					publishedWorkflowIds.value = new Set(publishedWorkflowIds.value).add(workflow.id);
				} catch (e) {
					toast.showError(e, i18n.baseText("settings.migrationReport.detail.migrate.publish.error.title"));
				}
			} finally {
				publishing.value = false;
			}
		}
		const findingAssistant = useMigrationFindingAssistant();
		const canContinueInAssistant = computed(() => findingAssistant.available.value && props.data.assistantAction !== "none");
		function continueInAssistant(outcome) {
			const action = props.data.assistantAction;
			if (action === "none") return;
			findingAssistant.open({
				rule: props.data,
				workflow: outcome.workflow,
				action,
				automatedMigration: "error" in outcome ? {
					outcome: "refused",
					message: outcome.error.message,
					nodeName: outcome.error.node?.name
				} : {
					outcome: "partial",
					notes: outcome.result.notes,
					unmapped: outcome.result.unmapped
				}
			});
		}
		function closeDialog() {
			if (uiStore.modalsById["migrateWorkflow"]?.open !== true) return;
			uiStore.closeModal(MIGRATE_WORKFLOW_MODAL_KEY);
			props.data.eventBus.emit("closed");
		}
		function onDialogOpenUpdate(open) {
			if (!open && !migrating.value) closeDialog();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: modalOpen.value,
				size: "large",
				"close-on-overlay-click": false,
				"close-on-escape": !migrating.value,
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [
					createVNode(unref(DialogHeader_default), null, {
						default: withCtx(() => [createVNode(unref(DialogTitle_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(title.value), 1)]),
							_: 1
						})]),
						_: 1
					}),
					createVNode(unref(DialogBody_default), null, {
						default: withCtx(() => [createBaseVNode("div", {
							class: normalizeClass(_ctx.$style.content),
							"data-test-id": `${unref(MIGRATE_WORKFLOW_MODAL_KEY)}-modal`
						}, [phase.value === "confirm" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [__props.data.recommendations.length ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.section)
						}, [createVNode(unref(N8nText_default), { color: "text-dark" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.migrationReport.detail.migrate.modal.confirmLead")), 1)]),
							_: 1
						}), createBaseVNode("ul", { class: normalizeClass(_ctx.$style.changeList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.data.recommendations, (rec, index) => {
							return openBlock(), createElementBlock("li", {
								key: index,
								class: normalizeClass(_ctx.$style.change)
							}, [createVNode(unref(N8nText_default), {
								size: "small",
								color: "text-dark"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(rec.action), 1)]),
								_: 2
							}, 1024), createVNode(unref(N8nText_default), {
								size: "small",
								color: "text-base"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(rec.description), 1)]),
								_: 2
							}, 1024)], 2);
						}), 128))], 2)], 2)) : createCommentVNode("", true), createVNode(unref(N8nCallout_default), { theme: "info" }, {
							default: withCtx(() => [createBaseVNode("div", null, toDisplayString(unref(i18n).baseText("settings.migrationReport.detail.migrate.modal.stepMigrate")), 1), createBaseVNode("div", null, toDisplayString(unref(i18n).baseText("settings.migrationReport.detail.migrate.modal.stepPublish")), 1)]),
							_: 1
						})], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
							succeeded.value.length ? (openBlock(), createBlock(unref(N8nCallout_default), {
								key: 0,
								theme: "success",
								icon: "circle-check"
							}, {
								default: withCtx(() => [isBulk.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createTextVNode(toDisplayString(unref(i18n).baseText("settings.migrationReport.detail.migrate.modal.bulkSuccessBody", {
									adjustToNumber: succeeded.value.length,
									interpolate: { count: String(succeeded.value.length) }
								})) + " ", 1), createBaseVNode("ul", { class: normalizeClass(_ctx.$style.workflowList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(succeeded.value, ({ workflow }) => {
									return openBlock(), createElementBlock("li", { key: workflow.id }, [createVNode(unref(N8nLink_default), {
										to: `/workflow/${workflow.id}`,
										"new-window": "",
										size: "small"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(workflow.name), 1)]),
										_: 2
									}, 1032, ["to"])]);
								}), 128))], 2)], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createTextVNode(toDisplayString(unref(i18n).baseText("settings.migrationReport.detail.migrate.modal.successBody", { interpolate: { name: succeeded.value[0].workflow.name } })) + " ", 1), createVNode(unref(N8nLink_default), {
									to: `/workflow/${succeeded.value[0].workflow.id}`,
									"new-window": "",
									size: "small"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.migrationReport.detail.migrate.modal.openWorkflow")), 1)]),
									_: 1
								}, 8, ["to"])], 64))]),
								_: 1
							})) : createCommentVNode("", true),
							(openBlock(true), createElementBlock(Fragment, null, renderList(succeeded.value, (outcome) => {
								return openBlock(), createElementBlock(Fragment, { key: outcome.workflow.id }, [warnings(outcome).length ? (openBlock(), createBlock(unref(N8nCallout_default), {
									key: 0,
									theme: "warning"
								}, {
									default: withCtx(() => [
										createBaseVNode("div", { class: normalizeClass(_ctx.$style.reviewTitle) }, toDisplayString(isBulk.value ? unref(i18n).baseText("settings.migrationReport.detail.migrate.modal.bulkReviewTitle", { interpolate: { name: outcome.workflow.name } }) : unref(i18n).baseText("settings.migrationReport.detail.migrate.modal.reviewTitle")), 3),
										createBaseVNode("ul", { class: normalizeClass(_ctx.$style.warningList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(warnings(outcome), (warning, index) => {
											return openBlock(), createElementBlock("li", { key: index }, toDisplayString(warning), 1);
										}), 128))], 2),
										createBaseVNode("div", { class: normalizeClass(_ctx.$style.reviewNodes) }, [createTextVNode(toDisplayString(unref(i18n).baseText("settings.migrationReport.detail.migrate.modal.reviewNodes")) + " ", 1), (openBlock(true), createElementBlock(Fragment, null, renderList(migratedNodes(outcome), (node, index) => {
											return openBlock(), createElementBlock(Fragment, { key: node.id }, [createVNode(unref(N8nLink_default), {
												to: `/workflow/${outcome.workflow.id}/${node.id}`,
												"new-window": "",
												size: "small"
											}, {
												default: withCtx(() => [createTextVNode(toDisplayString(node.name), 1)]),
												_: 2
											}, 1032, ["to"]), index < outcome.result.migratedNodeIds.length - 1 ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createTextVNode(", ")], 64)) : createCommentVNode("", true)], 64);
										}), 128))], 2),
										canContinueInAssistant.value ? (openBlock(), createBlock(unref(N8nButton_default), {
											key: 0,
											variant: "outline",
											size: "small",
											class: normalizeClass(_ctx.$style.assistantButton),
											label: unref(i18n).baseText("settings.migrationReport.detail.migrate.modal.continueInAssistant"),
											"data-test-id": "migrate-modal-continue-in-assistant-button",
											onClick: ($event) => continueInAssistant(outcome)
										}, null, 8, [
											"class",
											"label",
											"onClick"
										])) : createCommentVNode("", true)
									]),
									_: 2
								}, 1024)) : createCommentVNode("", true)], 64);
							}), 128)),
							(openBlock(true), createElementBlock(Fragment, null, renderList(failed.value, ({ workflow, error }) => {
								return openBlock(), createBlock(unref(N8nCallout_default), {
									key: workflow.id,
									theme: "danger",
									icon: "status-error"
								}, {
									default: withCtx(() => [
										isBulk.value ? (openBlock(), createElementBlock("div", {
											key: 0,
											class: normalizeClass(_ctx.$style.reviewTitle)
										}, toDisplayString(unref(i18n).baseText("settings.migrationReport.detail.migrate.modal.bulkErrorTitle", { interpolate: { name: workflow.name } })), 3)) : createCommentVNode("", true),
										createTextVNode(" " + toDisplayString(error.message) + " ", 1),
										error.node ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [_cache[0] || (_cache[0] = createBaseVNode("br", null, null, -1)), createVNode(unref(N8nLink_default), {
											to: `/workflow/${workflow.id}/${error.node.id}`,
											"new-window": "",
											size: "small"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(error.node.name), 1)]),
											_: 2
										}, 1032, ["to"])], 64)) : createCommentVNode("", true),
										canContinueInAssistant.value ? (openBlock(), createBlock(unref(N8nButton_default), {
											key: 2,
											variant: "outline",
											size: "small",
											class: normalizeClass(_ctx.$style.assistantButton),
											label: unref(i18n).baseText("settings.migrationReport.detail.migrate.modal.continueInAssistant"),
											"data-test-id": "migrate-modal-continue-in-assistant-button",
											onClick: ($event) => continueInAssistant({
												workflow,
												error
											})
										}, null, 8, [
											"class",
											"label",
											"onClick"
										])) : createCommentVNode("", true)
									]),
									_: 2
								}, 1024);
							}), 128)),
							publishedWorkflowIds.value.size ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 1,
								size: "small",
								color: "success"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(isBulk.value ? unref(i18n).baseText("settings.migrationReport.detail.migrate.publish.bulkPublished", {
									adjustToNumber: publishedWorkflowIds.value.size,
									interpolate: { count: String(publishedWorkflowIds.value.size) }
								}) : unref(i18n).baseText("settings.migrationReport.detail.migrate.publish.published")), 1)]),
								_: 1
							})) : createCommentVNode("", true)
						], 64))], 10, _hoisted_1)]),
						_: 1
					}),
					createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [phase.value === "confirm" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nButton_default), {
							variant: "outline",
							disabled: migrating.value,
							label: unref(i18n).baseText("generic.cancel"),
							"data-test-id": "migrate-modal-cancel-button",
							onClick: closeDialog
						}, null, 8, ["disabled", "label"]), createVNode(unref(N8nButton_default), {
							loading: migrating.value && !isBulk.value,
							disabled: migrating.value,
							label: confirmLabel.value,
							"data-test-id": "migrate-modal-confirm-button",
							onClick: handleMigrate
						}, null, 8, [
							"loading",
							"disabled",
							"label"
						])], 64)) : toPublish.value.length ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [createVNode(unref(N8nButton_default), {
							variant: "outline",
							disabled: publishing.value,
							label: unref(i18n).baseText("settings.migrationReport.detail.migrate.publish.skip"),
							"data-test-id": "migrate-modal-skip-publish-button",
							onClick: closeDialog
						}, null, 8, ["disabled", "label"]), createVNode(unref(N8nButton_default), {
							loading: publishing.value,
							label: isBulk.value ? unref(i18n).baseText("settings.migrationReport.detail.migrate.publish.bulkButton", {
								adjustToNumber: toPublish.value.length,
								interpolate: { count: String(toPublish.value.length) }
							}) : unref(i18n).baseText("settings.migrationReport.detail.migrate.publish.button"),
							"data-test-id": "migrate-modal-publish-button",
							onClick: handlePublish
						}, null, 8, ["loading", "label"])], 64)) : succeeded.value.length ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 2,
							variant: "outline",
							label: unref(i18n).baseText("settings.migrationReport.detail.migrate.modal.done"),
							"data-test-id": "migrate-modal-done-button",
							onClick: closeDialog
						}, null, 8, ["label"])) : (openBlock(), createBlock(unref(N8nButton_default), {
							key: 3,
							variant: "outline",
							label: unref(i18n).baseText("generic.close"),
							"data-test-id": "migrate-modal-close-button",
							onClick: closeDialog
						}, null, 8, ["label"]))], 2)]),
						_: 1
					})
				]),
				_: 1
			}, 8, ["open", "close-on-escape"]);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_a1pmf_1",
	section: "_section_a1pmf_7",
	changeList: "_changeList_a1pmf_13",
	change: "_change_a1pmf_13",
	reviewTitle: "_reviewTitle_a1pmf_26",
	workflowList: "_workflowList_a1pmf_31",
	warningList: "_warningList_a1pmf_37",
	reviewNodes: "_reviewNodes_a1pmf_43",
	assistantButton: "_assistantButton_a1pmf_47",
	actions: "_actions_a1pmf_52"
} }]]);
//#endregion
export { MigrateWorkflowModal_default as default };
