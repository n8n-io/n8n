import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Ud as createSlots, Xf as unref, ff as openBlock, ip as init_shared_esm_bundler, nf as mergeModels, xf as useModel } from "./vendor-Hx42-oQF.js";
import { Ai as useInstanceAiSettingsStore, Bj as SettingsRow_default, Lj as SettingsRowConfigure_default, Mc as SANDBOX_PROVIDER_LABELS, _N as N8nText_default, jN as useI18n, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { n as InstanceAiOnboardingWizard_default, t as useInstanceAiConfiguration } from "./useInstanceAiConfiguration-cCPtcGs6.js";
//#region src/features/ai/instanceAi/components/settings/ConnectionDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler();
//#endregion
//#region src/features/ai/instanceAi/components/settings/ConnectionDialog.vue
var ConnectionDialog_default = /* @__PURE__ */ defineComponent({
	__name: "ConnectionDialog",
	props: /*@__PURE__*/ mergeModels({
		kind: {},
		setup: {
			type: Boolean,
			default: false
		}
	}, {
		"open": {
			type: Boolean,
			required: true
		},
		"openModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels(["saved"], ["update:open"]),
	setup(__props, { emit: __emit }) {
		const open = useModel(__props, "open");
		const props = __props;
		const emit = __emit;
		const setupSequence = [
			"model",
			"sandbox",
			"search",
			"done"
		];
		function handleAdvance() {
			emit("saved");
			if (!props.setup) open.value = false;
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(InstanceAiOnboardingWizard_default, {
				open: open.value,
				step: __props.kind,
				"edit-mode": true,
				"allow-unchanged": __props.setup,
				sequence: setupSequence,
				"model-value": "",
				"sandbox-value": "",
				"search-value": "",
				"compose-fast-path": false,
				surface: "settings",
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => open.value = $event),
				onAdvance: handleAdvance
			}, null, 8, [
				"open",
				"step",
				"allow-unchanged"
			]);
		};
	}
});
//#endregion
//#region src/features/ai/instanceAi/components/settings/SandboxSettingsRow.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region src/features/ai/instanceAi/components/settings/SandboxSettingsRow.vue
var SandboxSettingsRow_default = /* @__PURE__ */ defineComponent({
	__name: "SandboxSettingsRow",
	props: { disabled: {
		type: Boolean,
		default: false
	} },
	emits: ["configure", "enable"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const store = useInstanceAiSettingsStore();
		const { sandboxCredentialId, sandboxConfigured } = useInstanceAiConfiguration();
		const isEnvironmentManaged = computed(() => !store.isProxyEnabled && !store.isCloudManaged && (store.settings?.sandboxEnvConfigured ?? false));
		const sandboxValue = computed(() => {
			if (isEnvironmentManaged.value) return i18n.baseText("instanceAi.onboarding.foundOnServer");
			if (sandboxCredentialId.value) return store.settings?.sandboxProvider === "daytona" ? SANDBOX_PROVIDER_LABELS.daytona : SANDBOX_PROVIDER_LABELS["n8n-sandbox"];
			return i18n.baseText("settings.n8nAgent.sandbox.env.value");
		});
		const sandboxDescription = computed(() => {
			if (isEnvironmentManaged.value) return {
				key: "settings.n8nAgent.sandbox.env.description",
				warning: false
			};
			if (sandboxCredentialId.value) return {
				key: "settings.n8nAgent.sandbox.set.description",
				warning: false
			};
			return {
				key: "settings.n8nAgent.sandbox.missing.description",
				warning: !props.disabled
			};
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsRow_default), {
				title: unref(i18n).baseText("settings.n8nAgent.sandbox.label"),
				clickable: !__props.disabled && unref(sandboxConfigured) && !isEnvironmentManaged.value,
				"data-test-id": "n8n-agent-sandbox-row",
				onClick: _cache[2] || (_cache[2] = ($event) => emit("configure"))
			}, createSlots({
				info: withCtx(() => [createVNode(unref(N8nText_default), {
					bold: "",
					size: "medium",
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.n8nAgent.sandbox.label")), 1)]),
					_: 1
				}), createVNode(unref(N8nText_default), {
					size: "small",
					color: sandboxDescription.value.warning ? "warning" : "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(sandboxDescription.value.key)), 1)]),
					_: 1
				}, 8, ["color"])]),
				_: 2
			}, [!__props.disabled ? {
				name: "action",
				fn: withCtx(() => [isEnvironmentManaged.value && !unref(sandboxConfigured) ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "solid",
					size: "medium",
					label: unref(i18n).baseText("settings.n8nAgent.sandbox.enable"),
					disabled: unref(store).isSaving,
					"data-test-id": "n8n-agent-sandbox-enable",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("enable"))
				}, null, 8, ["label", "disabled"])) : isEnvironmentManaged.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					size: "small",
					color: "text-light",
					"data-test-id": "n8n-agent-sandbox-env-value"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(sandboxValue.value), 1)]),
					_: 1
				})) : !unref(sandboxConfigured) ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 2,
					variant: "solid",
					size: "medium",
					label: unref(i18n).baseText("settings.n8nAgent.sandbox.add"),
					disabled: unref(store).isSaving,
					"data-test-id": "n8n-agent-sandbox-add",
					onClick: _cache[1] || (_cache[1] = ($event) => emit("configure"))
				}, null, 8, ["label", "disabled"])) : (openBlock(), createBlock(unref(SettingsRowConfigure_default), {
					key: 3,
					value: sandboxValue.value
				}, null, 8, ["value"]))]),
				key: "0"
			} : void 0]), 1032, ["title", "clickable"]);
		};
	}
});
//#endregion
export { ConnectionDialog_default as n, SandboxSettingsRow_default as t };
