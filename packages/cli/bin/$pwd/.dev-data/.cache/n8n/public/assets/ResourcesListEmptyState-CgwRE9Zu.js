import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Xf as unref, ff as openBlock, ip as init_shared_esm_bundler } from "./vendor-Hx42-oQF.js";
import { jN as useI18n, xM as N8nEmptyState_default } from "./app-D5flEmb-.js";
//#region src/app/components/layouts/ResourcesListEmptyState.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var EMPTY_STATE_CONFIG = {
	workflows: {
		icon: "workflow",
		headingKey: "workflows.empty.list.heading",
		descriptionKey: "workflows.empty.list.description",
		ctaKey: "projects.header.create.workflow",
		disabledTooltipKey: "workflows.empty.button.disabled.tooltip"
	},
	credentials: {
		icon: "key-round",
		headingKey: "credentials.empty.heading",
		descriptionKey: "credentials.empty.description",
		ctaKey: "projects.header.create.credential",
		disabledTooltipKey: "credentials.empty.button.disabled.tooltip"
	},
	executions: {
		icon: "history",
		headingKey: "executions.empty.heading",
		descriptionKey: "executions.empty.description",
		ctaKey: "projects.header.create.workflow",
		disabledTooltipKey: "workflows.empty.button.disabled.tooltip"
	},
	variables: {
		icon: "variable",
		headingKey: "variables.empty.heading",
		descriptionKey: "variables.empty.description",
		ctaKey: "variables.add.button.label",
		disabledTooltipKey: "variables.empty.button.disabled.tooltip"
	},
	dataTable: {
		icon: "database",
		headingKey: "dataTable.empty.heading",
		descriptionKey: "dataTable.empty.description",
		ctaKey: "dataTable.add.button.label",
		disabledTooltipKey: "dataTable.empty.button.disabled.tooltip"
	},
	agents: {
		icon: "robot",
		headingKey: "agents.list.empty.heading",
		descriptionKey: "agents.list.empty.description",
		ctaKey: "projects.header.create.agent",
		disabledTooltipKey: "agents.list.empty.button.disabled.tooltip"
	}
};
function isEmptyStateResourceKey(key) {
	return key in EMPTY_STATE_CONFIG;
}
//#endregion
//#region src/app/components/layouts/ResourcesListEmptyState.vue
var ResourcesListEmptyState_default = /* @__PURE__ */ defineComponent({
	__name: "ResourcesListEmptyState",
	props: {
		resourceKey: {},
		buttonDisabled: {
			type: Boolean,
			default: false
		},
		disabledTooltipText: { default: void 0 }
	},
	emits: ["click:button"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const config = computed(() => EMPTY_STATE_CONFIG[props.resourceKey]);
		const tooltipText = computed(() => props.disabledTooltipText ?? i18n.baseText(config.value.disabledTooltipKey));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nEmptyState_default), {
				"data-test-id": "empty-resources-list",
				icon: {
					type: "icon",
					value: config.value.icon
				},
				heading: unref(i18n).baseText(config.value.headingKey),
				description: unref(i18n).baseText(config.value.descriptionKey),
				"button-text": unref(i18n).baseText(config.value.ctaKey),
				"button-disabled": __props.buttonDisabled,
				"button-icon": __props.buttonDisabled ? "lock" : void 0,
				"onClick:button": _cache[0] || (_cache[0] = ($event) => emit("click:button", $event))
			}, {
				disabledButtonTooltip: withCtx(() => [createTextVNode(toDisplayString(tooltipText.value), 1)]),
				_: 1
			}, 8, [
				"icon",
				"heading",
				"description",
				"button-text",
				"button-disabled",
				"button-icon"
			]);
		};
	}
});
//#endregion
export { isEmptyStateResourceKey as n, ResourcesListEmptyState_default as t };
