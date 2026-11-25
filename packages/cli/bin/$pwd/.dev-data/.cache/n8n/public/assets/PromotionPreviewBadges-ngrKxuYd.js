import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Ho as RouterLink, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, of as onBeforeUnmount, rf as mergeProps, vf as resolveDynamicComponent, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { BC as ProjectTypes, O as PROMOTION_PREVIEW_VIEWS, Qg as projectContext, SN as _plugin_vue_export_helper_default, _C as useUsersStore, a_ as tryUse, bC as useRootStore, fC as VIEWS, fN as N8nTooltip_default, g as promotionEventBus, jN as useI18n, nD as getResourcePermissions, nN as N8nBadge_default, n_ as environmentsSettings, xN as N8nIcon_default } from "./app-D5flEmb-.js";
import { t as useLatestFetch } from "./useLatestFetch-Bxfz-zbp.js";
import { n as useInstancePromotionConnection } from "./useInstancePromotionConnection-5-otSLfL.js";
import { C as getPromotionPreview, p as totalChangeCount, r as buildSelectionGraph } from "./promotionPreview.selection-D6KzwuTA.js";
//#region ../../modules/promotions/frontend/src/composables/usePromotionChangeCount.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
/** How many changes the preview lists for a project in one direction, while `enabled` holds. */
function usePromotionChangeCount(projectId, direction, enabled) {
	const rootStore = useRootStore();
	const { next } = useLatestFetch();
	/** All changed resources that the preview page can include. */
	const changeCount = ref(0);
	const loading = ref(false);
	/** True when the last check failed, so the badge can show the failure. */
	const failed = ref(false);
	/** Set when an open review already holds the changes. The preview then lists none. */
	const blocker = ref(null);
	async function fetchCount() {
		const isLatest = next();
		const requestedProjectId = projectId.value;
		changeCount.value = 0;
		failed.value = false;
		loading.value = false;
		blocker.value = null;
		if (!enabled.value || !requestedProjectId) return;
		loading.value = true;
		try {
			const preview = await getPromotionPreview(rootStore.publicApiContext, requestedProjectId, direction);
			if (!isLatest()) return;
			changeCount.value = totalChangeCount(buildSelectionGraph(preview, direction));
			blocker.value = preview.blocker ?? null;
		} catch {
			if (isLatest()) failed.value = true;
		} finally {
			if (isLatest()) loading.value = false;
		}
	}
	watch([projectId, enabled], fetchCount, { immediate: true });
	return {
		changeCount,
		loading,
		failed,
		blocker,
		refetch: fetchCount
	};
}
//#endregion
//#region ../../modules/promotions/frontend/src/components/PromotionPreviewBadges.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["aria-label", "data-test-id"];
var PromotionPreviewBadges_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PromotionPreviewBadges",
	setup(__props) {
		const i18n = useI18n();
		const router = useRouter();
		const usersStore = useUsersStore();
		const projectContext$1 = tryUse(projectContext);
		const environmentsSettings$1 = tryUse(environmentsSettings);
		const isPromotionsEnabled = computed(() => environmentsSettings$1?.isPromotionsEnabled() ?? false);
		const currentProject = computed(() => projectContext$1?.currentProject() ?? null);
		const currentProjectId = computed(() => currentProject.value?.id);
		const isTeamProject = computed(() => currentProject.value?.type === ProjectTypes.Team);
		const projectPermissions = computed(() => getResourcePermissions(currentProject.value?.scopes).project);
		const promotionsPermissions = computed(() => getResourcePermissions(usersStore.currentUser?.globalScopes).promotions);
		const { environments, hasPromoteConfig, hasApplyConfig, load: loadConnection } = useInstancePromotionConnection();
		const canPreviewChanges = computed(() => isTeamProject.value && isPromotionsEnabled.value && !!projectPermissions.value.export && !!promotionsPermissions.value.list && !!promotionsPermissions.value.read && (!!promotionsPermissions.value.promote || !!promotionsPermissions.value.apply));
		const showPromote = computed(() => canPreviewChanges.value && hasPromoteConfig.value && !!promotionsPermissions.value.promote);
		const showApply = computed(() => canPreviewChanges.value && hasApplyConfig.value && !!promotionsPermissions.value.apply);
		watch([canPreviewChanges, currentProjectId], async ([canPreview]) => {
			if (canPreview) await loadConnection();
		}, { immediate: true });
		const promote = usePromotionChangeCount(currentProjectId, "promote", showPromote);
		const apply = usePromotionChangeCount(currentProjectId, "apply", showApply);
		async function onPromotionApplied({ projectId, project }) {
			if (project && projectContext$1?.currentProjectId() === projectId) projectContext$1.setCurrentProject(project);
			await Promise.all([promote.refetch(), apply.refetch()]);
		}
		async function onPromoted({ projectId }) {
			if (projectContext$1?.currentProjectId() !== projectId) return;
			await promote.refetch();
		}
		async function onProjectRemoved({ projectId }) {
			if (projectContext$1?.currentProjectId() !== projectId) return;
			await router.replace({ name: VIEWS.HOMEPAGE });
		}
		onMounted(() => {
			promotionEventBus.on("applied", onPromotionApplied);
			promotionEventBus.on("promoted", onPromoted);
			promotionEventBus.on("projectRemoved", onProjectRemoved);
		});
		onBeforeUnmount(() => {
			promotionEventBus.off("applied", onPromotionApplied);
			promotionEventBus.off("promoted", onPromoted);
			promotionEventBus.off("projectRemoved", onProjectRemoved);
		});
		const ICONS = {
			apply: "arrow-down",
			promote: "arrow-up"
		};
		const badges = computed(() => {
			const projectId = currentProjectId.value;
			if (!projectId) return [];
			return [{
				direction: "apply",
				show: showApply.value,
				changes: apply
			}, {
				direction: "promote",
				show: showPromote.value,
				changes: promote
			}].filter(({ show }) => show).map(({ direction, changes }) => {
				const blocked = !!changes.blocker.value;
				const disabled = changes.loading.value || blocked || !changes.failed.value && changes.changeCount.value === 0;
				let anchor = "link";
				if (blocked) anchor = "blocked";
				else if (disabled) anchor = "static";
				return {
					direction,
					loading: changes.loading.value,
					failed: changes.failed.value,
					blocked,
					anchor,
					changeCount: changes.changeCount.value,
					disabled,
					label: changes.loading.value ? i18n.baseText(`promotions.preview.badge.loading.${direction}`) : changes.failed.value ? i18n.baseText(`promotions.preview.badge.failed.${direction}`) : changes.blocker.value ? i18n.baseText("promotions.preview.badge.blocked.promote") : changes.changeCount.value === 0 ? i18n.baseText(`promotions.preview.badge.empty.${direction}`) : i18n.baseText(`promotions.preview.badge.${direction}`, {
						adjustToNumber: changes.changeCount.value,
						interpolate: {
							count: String(changes.changeCount.value),
							environment: environments.value.find((environment) => environment.direction === direction)?.name ?? ""
						}
					}),
					to: {
						name: PROMOTION_PREVIEW_VIEWS[direction],
						params: { projectId }
					}
				};
			});
		});
		return (_ctx, _cache) => {
			return badges.value.length > 0 ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.badges),
				"data-test-id": "promotion-preview-badges"
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(badges.value, (badge) => {
				return openBlock(), createBlock(unref(N8nTooltip_default), {
					key: `${badge.direction}-${badge.anchor}`,
					content: badge.label,
					disabled: badge.loading,
					"as-child": ""
				}, {
					default: withCtx(() => [badge.blocked ? (openBlock(), createElementBlock("span", {
						key: 0,
						role: "button",
						tabindex: "0",
						"aria-disabled": "true",
						"aria-label": badge.label,
						class: normalizeClass([_ctx.$style.link, _ctx.$style.blocked]),
						"data-test-id": `promotion-preview-badge-${badge.direction}`
					}, [createVNode(unref(N8nBadge_default), {
						class: normalizeClass(_ctx.$style.inert),
						variant: "subtle",
						size: "xsmall",
						"leading-icon": ICONS[badge.direction],
						clickable: "",
						disabled: "",
						"aria-hidden": "true"
					}, null, 8, ["class", "leading-icon"])], 10, _hoisted_1)) : (openBlock(), createBlock(resolveDynamicComponent(badge.disabled ? "span" : unref(RouterLink)), mergeProps({
						key: 1,
						ref_for: true
					}, badge.disabled ? {} : { to: badge.to }, {
						role: badge.loading ? "status" : void 0,
						"aria-label": badge.label,
						"aria-busy": badge.loading || void 0,
						"aria-disabled": badge.disabled || void 0,
						class: [_ctx.$style.link, { [_ctx.$style.disabled]: badge.disabled }],
						"data-test-id": `promotion-preview-badge-${badge.direction}`
					}), {
						default: withCtx(() => [createVNode(unref(N8nBadge_default), {
							variant: badge.failed ? "warning" : "subtle",
							size: "xsmall",
							"leading-icon": ICONS[badge.direction]
						}, {
							default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.count) }, [badge.loading ? (openBlock(), createBlock(unref(N8nIcon_default), {
								key: 0,
								icon: "loader-circle",
								size: "small",
								spin: ""
							})) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createTextVNode(toDisplayString(badge.failed ? "?" : badge.changeCount), 1)], 64))], 2)]),
							_: 2
						}, 1032, ["variant", "leading-icon"])]),
						_: 2
					}, 1040, [
						"role",
						"aria-label",
						"aria-busy",
						"aria-disabled",
						"class",
						"data-test-id"
					]))]),
					_: 2
				}, 1032, ["content", "disabled"]);
			}), 128))], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	badges: "_badges_18sd6_1",
	count: "_count_18sd6_7",
	link: "_link_18sd6_16",
	disabled: "_disabled_18sd6_26",
	blocked: "_blocked_18sd6_33",
	inert: "_inert_18sd6_38"
} }]]);
//#endregion
export { PromotionPreviewBadges_default as default };
