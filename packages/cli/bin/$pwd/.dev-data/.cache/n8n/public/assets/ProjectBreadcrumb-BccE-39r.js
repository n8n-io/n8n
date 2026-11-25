import { $d as init_runtime_core_esm_bundler, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler } from "./vendor-Hx42-oQF.js";
import { BC as ProjectTypes, SN as _plugin_vue_export_helper_default, VA as isIconOrEmoji, _N as N8nText_default, hM as N8nLink_default, jN as useI18n } from "./app-D5flEmb-.js";
import { t as ProjectIcon_default } from "./ProjectIcon-Dl4TMfdP.js";
//#region src/features/core/folders/components/ProjectBreadcrumb.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var ProjectBreadcrumb_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ProjectBreadcrumb",
	props: {
		currentProject: { default: void 0 },
		isDragging: {
			type: Boolean,
			default: false
		},
		isShared: {
			type: Boolean,
			default: false
		},
		icon: { default: void 0 },
		to: { default: void 0 }
	},
	emits: ["projectHover", "projectDrop"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const projectIcon = computed(() => {
			if (props.icon) return props.icon;
			if (props.isShared) return {
				type: "icon",
				value: "share"
			};
			if (props.currentProject?.type === ProjectTypes.Personal) return {
				type: "icon",
				value: "user"
			};
			if (props.currentProject?.name) return isIconOrEmoji(props.currentProject.icon) ? props.currentProject.icon : {
				type: "icon",
				value: "layers"
			};
			return {
				type: "icon",
				value: "house"
			};
		});
		const projectName = computed(() => {
			if (props.isShared) return i18n.baseText("projects.menu.shared");
			if (props.currentProject?.type === ProjectTypes.Personal) return i18n.baseText("projects.menu.personal");
			return props.currentProject?.name;
		});
		const projectLink = computed(() => {
			if (props.to) return props.to;
			if (props.isShared) return "/shared";
			if (props.currentProject) return `/projects/${props.currentProject.id}`;
			return "/home";
		});
		const onHover = () => {
			emit("projectHover");
		};
		const onProjectMouseUp = () => {
			if (props.isDragging) emit("projectDrop");
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass({
					[_ctx.$style["home-project"]]: true,
					[_ctx.$style.dragging]: __props.isDragging
				}),
				"data-test-id": "home-project",
				"data-droppable": "",
				onMouseenter: onHover,
				onMouseup: _cache[0] || (_cache[0] = ($event) => __props.isDragging ? onProjectMouseUp() : null)
			}, [createVNode(unref(N8nLink_default), {
				to: projectLink.value,
				underline: false,
				class: normalizeClass([_ctx.$style["project-link"]])
			}, {
				default: withCtx(() => [createVNode(ProjectIcon_default, {
					icon: projectIcon.value,
					"border-less": true,
					size: "mini",
					title: projectName.value
				}, null, 8, ["icon", "title"]), createVNode(unref(N8nText_default), {
					size: "medium",
					color: "text-base",
					class: normalizeClass(_ctx.$style["project-label"]),
					title: projectName.value
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(projectName.value), 1)]),
					_: 1
				}, 8, ["class", "title"])]),
				_: 1
			}, 8, ["to", "class"])], 34);
		};
	}
}), [["__cssModules", { "$style": {
	"home-project": "_home-project_1a0u6_1",
	dragging: "_dragging_1a0u6_6",
	"project-link": "_project-link_1a0u6_19",
	"project-label": "_project-label_1a0u6_25"
} }]]);
//#endregion
export { ProjectBreadcrumb_default as t };
