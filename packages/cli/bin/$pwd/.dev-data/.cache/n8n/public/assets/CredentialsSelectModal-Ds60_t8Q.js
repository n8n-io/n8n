import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, If as isRef, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $d as injectWorkflowDocumentStore, Jg as useUIStore, Mp as useCredentialsStore, SN as _plugin_vue_export_helper_default, Sr as useContactAdminDialog, Xf as ContactAdminModal_default, _N as N8nText_default, hC as useTelemetry, hp as useTypeAvailabilityPoliciesStore, jM as createEventBus, jN as useI18n, mM as N8nOption_default, op as getCredentialTypeRestriction, pM as N8nSelect_default, ry as CREDENTIAL_SELECT_MODAL_KEY, vd as useExternalHooks, wr as CredentialTypeRestrictedMarker_default, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { t as useInstanceAiCredentialHelp } from "./useInstanceAiCredentialHelp-3exi7OdU.js";
import { r as useCredentialTypeUsability } from "./useCredentialTypeUsability-CwHqqYxq.js";
//#region src/features/credentials/components/CredentialsSelectModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var CredentialsSelectModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CredentialsSelectModal",
	setup(__props) {
		const externalHooks = useExternalHooks();
		const telemetry = useTelemetry();
		const i18n = useI18n();
		const modalBus = ref(createEventBus());
		const selected = ref("");
		const loading = ref(true);
		const selectRef = ref();
		const credentialsStore = useCredentialsStore();
		const uiStore = useUIStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const instanceAiCredentialHelp = useInstanceAiCredentialHelp();
		const typeAvailabilityPoliciesStore = useTypeAvailabilityPoliciesStore();
		const { getCredentialTypeUsability, describeCredentialTypeUsability } = useCredentialTypeUsability();
		const { isOpen: isContactAdminOpen, state: contactAdmin, request: requestContactAdmin } = useContactAdminDialog(() => selectRef.value?.blur());
		const hasListOpened = ref(false);
		const searchQuery = ref("");
		const presetUsageScope = computed(() => {
			return (uiStore.modalsById["selectCredential"]?.data)?.usageScope === "instance" ? "instance" : void 0;
		});
		const isListLoading = computed(() => loading.value || typeAvailabilityPoliciesStore.isLoading);
		onMounted(async () => {
			try {
				await credentialsStore.fetchCredentialTypes(false);
			} catch (e) {}
			loading.value = false;
		});
		watch(isListLoading, (isLoading) => {
			if (isLoading) return;
			setTimeout(() => {
				if (selectRef.value) selectRef.value.focus();
			}, 0);
		});
		const allSelectableCredentialTypes = computed(() => credentialsStore.allCredentialTypes.filter((credentialType) => !credentialType.hidden && !credentialType.name.startsWith("chatHub")));
		function toOption(type) {
			const usability = getCredentialTypeUsability(type.name);
			return {
				type,
				restricted: usability ? describeCredentialTypeUsability(usability, type.displayName) : null
			};
		}
		const optionRank = (option) => !option.restricted ? 0 : option.restricted.blocked ? 1 : 2;
		/**
		* Usable types first, then the types a policy blocks, then the types whose nodes it blocks.
		* The sort is stable and the store sorts the types by name, so each group keeps that order.
		* It does not depend on the search, so typing only filters.
		*/
		const credentialTypeOptions = computed(() => allSelectableCredentialTypes.value.map(toOption).toSorted((a, b) => optionRank(a) - optionRank(b)));
		const selectableCredentialTypes = computed(() => {
			const q = searchQuery.value.toLowerCase();
			if (!q) return credentialTypeOptions.value;
			return credentialTypeOptions.value.filter(({ type }) => type.displayName.toLowerCase().includes(q));
		});
		function filterCredentials(query) {
			searchQuery.value = query;
		}
		function onSelect(type) {
			if (getCredentialTypeRestriction(type)) return;
			selected.value = type;
		}
		function openCredentialType() {
			modalBus.value.emit("close");
			uiStore.openNewCredential(selected.value, false, false, void 0, void 0, void 0, void 0, {
				instanceAiCredentialHelp: instanceAiCredentialHelp(),
				usageScope: presetUsageScope.value
			});
			const telemetryPayload = {
				credential_type: selected.value,
				source: "primary_menu",
				new_credential: true,
				workflow_id: workflowDocumentStore.value.workflowId
			};
			telemetry.track("User opened Credential modal", telemetryPayload);
			externalHooks.run("credentialsSelectModal.openCredentialType", telemetryPayload);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				name: unref(CREDENTIAL_SELECT_MODAL_KEY),
				"event-bus": modalBus.value,
				width: "50%",
				center: true,
				loading: isListLoading.value,
				"max-width": "460px",
				"min-height": "250px"
			}, {
				header: withCtx(() => [createBaseVNode("h2", { class: normalizeClass(_ctx.$style.title) }, toDisplayString(unref(i18n).baseText("credentialSelectModal.addNewCredential")), 3)]),
				content: withCtx(() => [createBaseVNode("div", null, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.subtitle) }, toDisplayString(unref(i18n).baseText("credentialSelectModal.selectAnAppOrServiceToConnectTo")), 3),
					createVNode(unref(N8nSelect_default), {
						ref_key: "selectRef",
						ref: selectRef,
						filterable: "",
						"default-first-option": "",
						placeholder: unref(i18n).baseText("credentialSelectModal.searchForApp"),
						size: "xlarge",
						"model-value": selected.value,
						"filter-method": filterCredentials,
						"data-test-id": "new-credential-type-select",
						"onUpdate:modelValue": onSelect,
						onVisibleChange: _cache[0] || (_cache[0] = (visible) => visible && (hasListOpened.value = true))
					}, {
						prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "search" })]),
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(selectableCredentialTypes.value, ({ type: credential, restricted }) => {
							return openBlock(), createBlock(unref(N8nOption_default), {
								key: credential.name,
								value: credential.name,
								label: credential.displayName,
								disabled: restricted?.blocked,
								filterable: "",
								"data-test-id": "new-credential-type-select-option",
								onMousedown: (event) => restricted?.blocked && event.preventDefault()
							}, {
								default: withCtx(() => [restricted ? (openBlock(), createElementBlock("div", {
									key: 0,
									class: normalizeClass(_ctx.$style.restrictedOption)
								}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.restrictedName) }, toDisplayString(credential.displayName), 3), createBaseVNode("span", { class: normalizeClass(_ctx.$style.restrictedScope) }, [createVNode(unref(N8nText_default), {
									size: "small",
									color: "text-light"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(restricted.scopeLabel), 1)]),
									_: 2
								}, 1024), hasListOpened.value ? (openBlock(), createBlock(CredentialTypeRestrictedMarker_default, {
									key: 0,
									name: credential.displayName,
									restriction: restricted.restriction,
									kind: restricted.kind,
									"scope-label": restricted.popoverScopeLabel,
									description: restricted.description,
									onContactAdmin: (audience) => unref(requestContactAdmin)(restricted.contactSubject, audience, restricted.kind)
								}, null, 8, [
									"name",
									"restriction",
									"kind",
									"scope-label",
									"description",
									"onContactAdmin"
								])) : createCommentVNode("", true)], 2)], 2)) : createCommentVNode("", true)]),
								_: 2
							}, 1032, [
								"value",
								"label",
								"disabled",
								"onMousedown"
							]);
						}), 128))]),
						_: 1
					}, 8, ["placeholder", "model-value"]),
					createVNode(unref(ContactAdminModal_default), {
						open: unref(isContactAdminOpen),
						"onUpdate:open": _cache[1] || (_cache[1] = ($event) => isRef(isContactAdminOpen) ? isContactAdminOpen.value = $event : null),
						kind: unref(contactAdmin).kind,
						"type-name": unref(contactAdmin).subject,
						audience: unref(contactAdmin).audience
					}, null, 8, [
						"open",
						"kind",
						"type-name",
						"audience"
					])
				])]),
				footer: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), {
					label: unref(i18n).baseText("credentialSelectModal.continue"),
					float: "right",
					size: "large",
					disabled: !selected.value || !!unref(getCredentialTypeRestriction)(selected.value),
					"data-test-id": "new-credential-type-button",
					onClick: openCredentialType
				}, null, 8, ["label", "disabled"])], 2)]),
				_: 1
			}, 8, [
				"name",
				"event-bus",
				"loading"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	title: "_title_x1s3q_1",
	subtitle: "_subtitle_x1s3q_6",
	restrictedOption: "_restrictedOption_x1s3q_12",
	restrictedName: "_restrictedName_x1s3q_19",
	restrictedScope: "_restrictedScope_x1s3q_28"
} }]]);
//#endregion
export { CredentialsSelectModal_default as default };
