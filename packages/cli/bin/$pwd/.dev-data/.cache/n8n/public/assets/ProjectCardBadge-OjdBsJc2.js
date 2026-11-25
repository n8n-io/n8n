import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Of as withDirectives, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Xf as unref, _f as resolveDirective, _p as normalizeClass, ff as openBlock, gf as resolveComponent, hf as renderSlot, ip as init_shared_esm_bundler, rf as mergeProps, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { BC as ProjectTypes, SN as _plugin_vue_export_helper_default, VA as isIconOrEmoji, fC as VIEWS, fN as N8nTooltip_default, hm as splitName, jN as useI18n, lm as ResourceType, nN as N8nBadge_default } from "./app-D5flEmb-.js";
import { t as ProjectIcon_default } from "./ProjectIcon-Dl4TMfdP.js";
//#region src/features/collaboration/projects/components/ProjectCardBadge.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var ProjectCardBadge_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ProjectCardBadge",
	props: {
		resource: {},
		resourceType: {},
		resourceTypeLabel: {},
		personalProject: {},
		showBadgeBorder: {
			type: Boolean,
			default: true
		},
		global: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const homeProject = computed(() => {
			if (props.resource.resourceType === "dataTable") return props.resource.project;
			return props.resource.homeProject;
		});
		const i18n = useI18n();
		const isShared = computed(() => {
			return "sharedWithProjects" in props.resource && props.resource.sharedWithProjects?.length;
		});
		const projectState = computed(() => {
			if (!homeProject.value || props.personalProject && homeProject.value?.id === props.personalProject.id) {
				if (isShared.value) return "shared-owned";
				return "owned";
			} else if (homeProject.value?.type !== ProjectTypes.Team) {
				if (isShared.value) return "shared-personal";
				return "personal";
			} else if (homeProject.value?.type === ProjectTypes.Team) {
				if (isShared.value) return "shared-team";
				return "team";
			}
			return "unknown";
		});
		const numberOfMembersInHomeTeamProject = computed(() => "sharedWithProjects" in props.resource ? props.resource.sharedWithProjects?.length ?? 0 : 0);
		const badgeText = computed(() => {
			if (projectState.value === "owned" || projectState.value === "shared-owned") return i18n.baseText("projects.menu.personal");
			else {
				const { name, email } = splitName(homeProject.value?.name ?? "");
				return name ?? email ?? "";
			}
		});
		const badgeIcon = computed(() => {
			switch (projectState.value) {
				case "owned":
				case "shared-owned":
				case "personal":
				case "shared-personal": return {
					type: "icon",
					value: "user"
				};
				case "team":
				case "shared-team": return isIconOrEmoji(homeProject.value?.icon) ? homeProject.value?.icon : {
					type: "icon",
					value: "layers"
				};
				default: return {
					type: "icon",
					value: "layers"
				};
			}
		});
		const badgeTooltip = computed(() => {
			switch (projectState.value) {
				case "shared-owned": return i18n.baseText("projects.badge.tooltip.sharedOwned", { interpolate: {
					resourceTypeLabel: props.resourceTypeLabel,
					count: numberOfMembersInHomeTeamProject.value
				} });
				case "shared-personal": return i18n.baseText("projects.badge.tooltip.sharedPersonal", { interpolate: {
					resourceTypeLabel: props.resourceTypeLabel,
					name: badgeText.value,
					count: numberOfMembersInHomeTeamProject.value
				} });
				case "personal": return i18n.baseText("projects.badge.tooltip.personal", { interpolate: {
					resourceTypeLabel: props.resourceTypeLabel,
					name: badgeText.value
				} });
				case "team": return i18n.baseText("projects.badge.tooltip.team", { interpolate: {
					resourceTypeLabel: props.resourceTypeLabel,
					name: badgeText.value
				} });
				case "shared-team": return i18n.baseText("projects.badge.tooltip.sharedTeam", { interpolate: {
					resourceTypeLabel: props.resourceTypeLabel,
					name: badgeText.value,
					count: numberOfMembersInHomeTeamProject.value
				} });
				default: return "";
			}
		});
		const projectLocation = computed(() => {
			if (projectState.value !== "personal" && projectState.value !== "shared-personal" && homeProject.value?.id && props.resourceType === ResourceType.Workflow) return {
				name: VIEWS.PROJECTS_WORKFLOWS,
				params: { projectId: homeProject.value?.id }
			};
			return null;
		});
		return (_ctx, _cache) => {
			const _component_RouterLink = resolveComponent("RouterLink");
			const _directive_n8n_truncate = resolveDirective("n8n-truncate");
			return openBlock(), createElementBlock("div", mergeProps({ class: _ctx.$style.wrapper }, _ctx.$attrs), [
				badgeText.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 0,
					disabled: !badgeTooltip.value || numberOfMembersInHomeTeamProject.value !== 0,
					placement: "top"
				}, {
					content: withCtx(() => [createTextVNode(toDisplayString(badgeTooltip.value), 1)]),
					default: withCtx(() => [createVNode(unref(N8nBadge_default), {
						class: normalizeClass([
							_ctx.$style.badge,
							_ctx.$style.projectBadge,
							projectLocation.value && _ctx.$style.link
						]),
						variant: __props.showBadgeBorder ? "outline" : "ghost",
						"data-test-id": "card-badge"
					}, {
						default: withCtx(() => [
							createVNode(ProjectIcon_default, {
								icon: badgeIcon.value,
								"border-less": true,
								size: "mini"
							}, null, 8, ["icon"]),
							projectLocation.value ? (openBlock(), createBlock(_component_RouterLink, {
								key: 0,
								to: projectLocation.value
							}, {
								default: withCtx(() => [withDirectives(createBaseVNode("span", { class: normalizeClass(_ctx.$style.nowrap) }, null, 2), [[
									_directive_n8n_truncate,
									badgeText.value,
									"20"
								]])]),
								_: 1
							}, 8, ["to"])) : withDirectives((openBlock(), createElementBlock("span", {
								key: 1,
								class: normalizeClass(_ctx.$style.nowrap)
							}, null, 2)), [[
								_directive_n8n_truncate,
								badgeText.value,
								"20"
							]]),
							renderSlot(_ctx.$slots, "default")
						]),
						_: 3
					}, 8, ["class", "variant"])]),
					_: 3
				}, 8, ["disabled"])) : createCommentVNode("", true),
				__props.global ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 1,
					placement: "top"
				}, {
					content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projects.badge.tooltip.global", { interpolate: { resourceTypeLabel: props.resourceTypeLabel } })), 1)]),
					default: withCtx(() => [createBaseVNode("div", {
						class: normalizeClass(_ctx.$style["global-badge"]),
						"data-test-id": "credential-global-badge",
						theme: "tertiary",
						bold: ""
					}, [createVNode(ProjectIcon_default, {
						icon: {
							type: "icon",
							value: "globe"
						},
						"border-less": true,
						size: "mini"
					}), createTextVNode(" " + toDisplayString(unref(i18n).baseText("projects.badge.global")), 1)], 2)]),
					_: 1
				})) : createCommentVNode("", true),
				numberOfMembersInHomeTeamProject.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 2,
					disabled: !badgeTooltip.value || numberOfMembersInHomeTeamProject.value === 0,
					placement: "top"
				}, {
					content: withCtx(() => [createTextVNode(toDisplayString(badgeTooltip.value), 1)]),
					default: withCtx(() => [createBaseVNode("div", {
						class: normalizeClass(_ctx.$style["count-badge"]),
						theme: "tertiary",
						bold: ""
					}, " +" + toDisplayString(numberOfMembersInHomeTeamProject.value), 3)]),
					_: 1
				}, 8, ["disabled"])) : createCommentVNode("", true)
			], 16);
		};
	}
}), [["__cssModules", { "$style": {
	wrapper: "_wrapper_2ck6b_1",
	badge: "_badge_2ck6b_7",
	projectBadge: "_projectBadge_2ck6b_17",
	link: "_link_2ck6b_24",
	"count-badge": "_count-badge_2ck6b_28",
	"global-badge": "_global-badge_2ck6b_36 _count-badge_2ck6b_28",
	nowrap: "_nowrap_2ck6b_43"
} }]]);
//#endregion
export { ProjectCardBadge_default as t };
