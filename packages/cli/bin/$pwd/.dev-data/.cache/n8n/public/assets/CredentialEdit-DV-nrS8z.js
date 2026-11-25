import "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Md as withKeys, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Pu as useElementSize, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, af as onBeforeMount, bf as useId, du as ElCol, ff as openBlock, fu as ElRow, ip as init_shared_esm_bundler, jd as vShow, lf as onMounted, mf as renderList, of as onBeforeUnmount, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $A as N8nInlineTextEdit_default, $M as DropdownMenu_default, $d as injectWorkflowDocumentStore, Ar as hasOAuthTokenData, Ay as BUILTIN_CREDENTIALS_DOCS_URL, BC as ProjectTypes, Bm as getAuthTypeForNodeCredential, Cr as useAiGateway, Dr as useQuickConnect, Er as GoogleAuthButton_default, GA as DialogDescription_default, GS as EnterpriseEditionFeature, Gr as useAssistantStore, Hc as CredentialIcon_default, Hm as getNodeCredentialForSelectedAuthType, Iy as END_USER_CREDENTIALS_DOCS_URL, JA as DialogHeader_default, Jg as useUIStore, Jp as useNDVStore, KA as Dialog_default, Kf as RestrictedTypeCallout_default, Km as updateNodeAuthType, Kp as injectNDVStore, LM as N8nCallout_default, Lk as isCommunityPackageName, Lw as assert, Mp as useCredentialsStore, Mr as isOAuthTokenDataSet, Nr as openOAuthPopup, Or as useCredentialOAuth, PA as useMessage, Pg as isValidCredentialResponse, Pr as waitForOAuthCallback, Rm as getAppNameFromCredType, Ru as usePageRedirectionHelper, SN as _plugin_vue_export_helper_default, Tr as QuickConnectButton_default, Tw as sendUserEvent, UA as DialogFooter_default, Ul as hasAutomaticOAuthApp, Vm as getNodeAuthOptions, WA as DialogBody_default, Wl as hasManagedOAuthApp, Wr as useChatPanelStore, Xm as useCredentialDescriptionsExperiment, YA as DialogClose_default, Yj as N8nMenuItem_default, Zf as useRolesStore, Zj as PreviewBadge_default, _C as useUsersStore, _N as N8nText_default, _m as useRemoteProjectSearch, bC as useRootStore, bN as N8nSpinner_default, cN as Input_default, dC as useToast, dd as useNodeHelpers, dx as MODAL_CONFIRM, ef as provideWorkflowDocumentStore, fN as N8nTooltip_default, fd as usePrivateCredentials, fp as useCredentialTypeRestriction, fx as NEW_ASSISTANT_SESSION_MODAL, gM as N8nInputLabel_default, hC as useTelemetry, hM as N8nLink_default, hm as splitName, hp as useTypeAvailabilityPoliciesStore, hr as useExternalSecretsStore, jM as createEventBus, jN as useI18n, kN as addCredentialTranslation, kp as useAiGatewayStore, kr as getTrustedOAuthOrigins, mM as N8nOption_default, nD as getResourcePermissions, ny as CREDENTIAL_EDIT_MODAL_KEY, pM as N8nSelect_default, pk as getNodeParameters, qA as DialogTitle_default, rM as InlineAskAssistantButton_default, tM as N8nInfoTip_default, uf as useNodeTypesStore, vN as N8nIconButton_default, vd as useExternalHooks, vm as useProjectsStore, wg as isCredentialModalState, wy as TELEMETRY_EVENT, xM as N8nEmptyState_default, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default, yu as TimeAgo_default } from "./app-D5flEmb-.js";
import { t as EnterpriseEdition_ee_default } from "./EnterpriseEdition.ee-Bv-_EZth.js";
import { t as ProjectSharing_default } from "./ProjectSharing-CHLhYej8.js";
import { t as useDependencies } from "./useDependencies-C0z0nXRY.js";
import { t as CharacterCount_default } from "./CharacterCount-LwZS4Nnd.js";
import { t as FreeAiCreditsCallout_default } from "./FreeAiCreditsCallout-DX3YcSkq.js";
import { n as useGatewayCreditsPromotion, r as QuickConnectBanner_default, t as GatewayCreditsPromotion_default } from "./GatewayCreditsPromotion-DZRlGjzW.js";
import { t as DependencyPill_default } from "./DependencyPill-CgrjeV7z.js";
import { t as PrivateCredentialIcon_default } from "./PrivateCredentialIcon-LztlyFmz.js";
import { c as parseHttpUrl, s as listPlaceholderTitles, t as TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE } from "./templatedAuth.utils-BSmmAPGQ.js";
import { t as useAgentAssistantCredentialHelp } from "./useAgentAssistantCredentialHelp-RmZi0Ada.js";
import { n as useCredentialForm, t as TemplatedAuthSimpleView_default } from "./TemplatedAuthSimpleView-B-xmsE0e.js";
import { t as CopyInput_default } from "./CopyInput-OmhSMN7b.js";
import { t as CredentialInputs_default } from "./CredentialInputs-DxL-Pnkh.js";
import { t as Banner_default } from "./Banner-DceNkpG_.js";
import { t as SaveButton_default } from "./SaveButton-B2zcJp0p.js";
//#region src/features/credentials/components/CredentialEdit/CredentialModeSelector.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$2 = {
	key: 0,
	"data-test-id": "credential-mode-selector"
};
var CredentialModeSelector_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CredentialModeSelector",
	props: {
		credentialType: {},
		useCustomOauth: { type: Boolean },
		showManagedOauthOptions: { type: Boolean },
		quickConnectAvailable: { type: Boolean },
		isQuickConnectMode: { type: Boolean },
		contextNode: {}
	},
	emits: ["update:authType"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const nodeTypesStore = useNodeTypesStore();
		const credentialsStore = useCredentialsStore();
		const ndvStore = injectNDVStore();
		const i18n = useI18n();
		const { isOAuthCredentialType, hasManualCredentialInputFields } = useCredentialOAuth();
		const activeNode = computed(() => props.contextNode ?? ndvStore.value.activeNode);
		const activeNodeType = computed(() => {
			if (!activeNode.value) return null;
			return nodeTypesStore.getNodeType(activeNode.value.type, activeNode.value.typeVersion);
		});
		const selectedAuthType = computed(() => {
			const selectedCredentialDescription = activeNodeType.value?.credentials?.find((cred) => cred.name === props.credentialType.name);
			return getAuthTypeForNodeCredential(activeNodeType.value, selectedCredentialDescription);
		});
		const managedFallbackType = computed(() => selectedAuthType.value?.value ?? "oAuth2");
		const isOAuthCredential = computed(() => isOAuthCredentialType(props.credentialType.name));
		const hasManagedOAuth = computed(() => isOAuthCredential.value && props.showManagedOauthOptions);
		const hasManualCredentialFields = computed(() => hasManualCredentialInputFields(props.credentialType));
		const OAUTH_APP_LABEL_KEYS = {
			automatic: {
				plain: "credentialEdit.credentialConfig.oauthModeAutomatic",
				withAuthType: "credentialEdit.credentialConfig.oauthModeAutomaticWithAuthType"
			},
			managed: {
				plain: "credentialEdit.credentialConfig.oauthModeManaged",
				withAuthType: "credentialEdit.credentialConfig.oauthModeManagedWithAuthType"
			}
		};
		function getManagedOAuthOptions(authType, automatic, authTypeLabel) {
			const keys = OAUTH_APP_LABEL_KEYS[automatic ? "automatic" : "managed"];
			return [{
				name: authTypeLabel ? i18n.baseText(keys.withAuthType, { interpolate: { authType: authTypeLabel } }) : i18n.baseText(keys.plain),
				value: {
					type: authType,
					customOauth: false
				}
			}, {
				name: authTypeLabel ? i18n.baseText("credentialEdit.credentialConfig.oauthModeCustomWithAuthType", { interpolate: { authType: authTypeLabel } }) : i18n.baseText("credentialEdit.credentialConfig.oauthModeCustom"),
				value: {
					type: authType,
					customOauth: true
				}
			}];
		}
		const quickConnectOption = computed(() => {
			if (!props.quickConnectAvailable) return null;
			return {
				name: i18n.baseText("credentialEdit.credentialConfig.quickConnect"),
				value: {
					type: selectedAuthType.value?.value ?? "",
					quickConnectEnabled: true
				}
			};
		});
		const manualOptions = computed(() => {
			if (activeNodeType.value && !selectedAuthType.value && !hasManagedOAuth.value) return [];
			const authOptions = getNodeAuthOptions(activeNodeType.value, activeNode.value?.typeVersion);
			if (authOptions.length === 0 && hasManagedOAuth.value) return getManagedOAuthOptions(managedFallbackType.value, hasAutomaticOAuthApp(props.credentialType));
			const withExpansion = authOptions.map((option) => {
				const credential = activeNodeType.value ? getNodeCredentialForSelectedAuthType(activeNodeType.value, option.value) : null;
				const type = credential ? credentialsStore.getCredentialTypeByName(credential.name) : void 0;
				const automatic = hasAutomaticOAuthApp(type);
				return {
					option,
					splitsIntoManagedPair: !!(credential && props.showManagedOauthOptions && isOAuthCredentialType(credential.name) && (hasManagedOAuthApp(type) || automatic)),
					automatic
				};
			});
			const managedPairCount = withExpansion.filter((o) => o.splitsIntoManagedPair).length;
			const recommendedSuffix = i18n.baseText("credentialEdit.credentialConfig.recommendedAuthTypeSuffix");
			return withExpansion.flatMap(({ option, splitsIntoManagedPair, automatic }) => {
				if (splitsIntoManagedPair) {
					const label = option.name.endsWith(recommendedSuffix) ? option.name.slice(0, -recommendedSuffix.length).trimEnd() : option.name;
					return getManagedOAuthOptions(option.value, automatic, managedPairCount > 1 ? label : void 0);
				}
				return {
					name: option.name,
					value: { type: option.value }
				};
			});
		});
		const options = computed(() => {
			const manual = manualOptions.value;
			const qc = quickConnectOption.value;
			if (!qc) return manual;
			return [qc, ...manual.length ? manual : hasManualCredentialFields.value ? [{
				name: i18n.baseText("credentialEdit.credentialConfig.setupManually"),
				value: { type: "" }
			}] : []];
		});
		function isSelected(option) {
			if (option.quickConnectEnabled) return !!props.isQuickConnectMode;
			if (props.isQuickConnectMode) return false;
			if (option.type === "" && option.customOauth === void 0) return true;
			if (option.customOauth !== void 0) return isOAuthCredential.value && option.type === managedFallbackType.value && !!props.useCustomOauth === option.customOauth;
			return option.type === selectedAuthType.value?.value;
		}
		const showSelector = computed(() => options.value.length >= 2);
		const selectedOption = computed(() => {
			return options.value.find((option) => isSelected(option.value)) ?? null;
		});
		const headingText = computed(() => {
			if (props.isQuickConnectMode) return i18n.baseText("credentialEdit.credentialConfig.quickConnectTitle");
			return i18n.baseText("credentialEdit.credentialConfig.setupCredential");
		});
		const menuItems = computed(() => {
			return options.value.map((opt) => ({
				id: opt.value,
				label: opt.name,
				checked: isSelected(opt.value)
			}));
		});
		function onOptionChange(value) {
			if (isSelected(value)) return;
			emit("update:authType", value);
		}
		return (_ctx, _cache) => {
			return showSelector.value ? (openBlock(), createElementBlock("div", _hoisted_1$2, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerRow) }, [createVNode(unref(N8nText_default), {
				tag: "span",
				bold: true,
				size: "large"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(headingText.value), 1)]),
				_: 1
			}), createVNode(unref(DropdownMenu_default), {
				items: menuItems.value,
				placement: "bottom-end",
				"extra-popper-class": _ctx.$style.dropdownContent,
				"data-test-id": "credential-mode-dropdown",
				onSelect: onOptionChange
			}, {
				trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "outline",
					text: "",
					"data-test-id": "credential-mode-dropdown-trigger"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(selectedOption.value?.name) + " ", 1), createVNode(unref(N8nIcon_default), {
						icon: "chevron-down",
						size: "small"
					})]),
					_: 1
				})]),
				_: 1
			}, 8, ["items", "extra-popper-class"])], 2)])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	headerRow: "_headerRow_5kybp_1",
	dropdownContent: "_dropdownContent_5kybp_7"
} }]]);
//#endregion
//#region src/features/credentials/components/CredentialEdit/CredentialTypeSelector.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var CredentialTypeSelector_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CredentialTypeSelector",
	props: {
		modelValue: { type: Boolean },
		infoTip: { default: void 0 },
		disabled: {
			type: Boolean,
			default: false
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const selected = computed(() => props.modelValue ? "endUser" : "fixed");
		const options = computed(() => [{
			value: "fixed",
			icon: "key-round",
			title: i18n.baseText("credentialEdit.credentialConfig.credentialType.fixed.title"),
			subtitle: i18n.baseText("credentialEdit.credentialConfig.credentialType.fixed.subtitle")
		}, {
			value: "endUser",
			icon: "user-round",
			title: i18n.baseText("credentialEdit.credentialConfig.credentialType.endUser.title"),
			subtitle: i18n.baseText("credentialEdit.credentialConfig.credentialType.endUser.subtitle")
		}]);
		function onSelect(value) {
			const asBoolean = value === "endUser";
			if (asBoolean === props.modelValue) return;
			emit("update:modelValue", asBoolean);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.container),
				"data-test-id": "credential-type-selector"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [
				createVNode(unref(N8nText_default), {
					size: "medium",
					bold: true
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialConfig.credentialType.title")), 1)]),
					_: 1
				}),
				createVNode(unref(PreviewBadge_default), { size: "xxsmall" }),
				__props.infoTip ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 0,
					placement: "top"
				}, {
					content: withCtx(() => [createBaseVNode("div", null, [createTextVNode(toDisplayString(__props.infoTip) + " ", 1), createVNode(unref(N8nLink_default), {
						bold: "",
						to: unref(END_USER_CREDENTIALS_DOCS_URL),
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.learnMore")), 1)]),
						_: 1
					}, 8, ["to"])])]),
					default: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "circle-help",
						size: "small",
						color: "text-light"
					})]),
					_: 1
				})) : createCommentVNode("", true)
			], 2), createVNode(unref(N8nTooltip_default), {
				disabled: !__props.disabled,
				placement: "top"
			}, {
				content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialConfig.credentialType.disabledTooltip")), 1)]),
				default: withCtx(() => [createVNode(unref(N8nSelect_default), {
					"model-value": selected.value,
					disabled: __props.disabled,
					size: "large",
					teleported: false,
					"popper-class": _ctx.$style.popper,
					"data-test-id": "credential-type-select",
					"onUpdate:modelValue": onSelect
				}, {
					prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: options.value.find((o) => o.value === selected.value)?.icon ?? "key-round" }, null, 8, ["icon"])]),
					default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(options.value, (option) => {
						return openBlock(), createBlock(unref(N8nOption_default), {
							key: option.value,
							value: option.value,
							label: option.title,
							"data-test-id": `credential-type-option-${option.value}`
						}, {
							default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.option) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.optionTitle) }, [createVNode(unref(N8nIcon_default), {
								icon: option.icon,
								size: "small"
							}, null, 8, ["icon"]), createVNode(unref(N8nText_default), {
								size: "medium",
								bold: true
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(option.title), 1)]),
								_: 2
							}, 1024)], 2), createVNode(unref(N8nText_default), {
								size: "small",
								color: "text-light",
								class: normalizeClass(_ctx.$style.optionSubtitle)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(option.subtitle), 1)]),
								_: 2
							}, 1032, ["class"])], 2)]),
							_: 2
						}, 1032, [
							"value",
							"label",
							"data-test-id"
						]);
					}), 128))]),
					_: 1
				}, 8, [
					"model-value",
					"disabled",
					"popper-class"
				])]),
				_: 1
			}, 8, ["disabled"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_by2fm_1",
	header: "_header_by2fm_7",
	popper: "_popper_by2fm_13",
	option: "_option_by2fm_20",
	optionTitle: "_optionTitle_by2fm_27",
	optionSubtitle: "_optionSubtitle_by2fm_34"
} }]]);
//#endregion
//#region src/features/credentials/components/CredentialEdit/CredentialConfig.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$1 = { key: 1 };
var _hoisted_2$1 = {
	key: 0,
	"data-test-id": "quick-connect-button"
};
var CredentialConfig_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CredentialConfig",
	props: {
		mode: {},
		credentialType: {},
		credentialProperties: {},
		credentialData: {},
		credentialId: { default: "" },
		n8nProjectId: {},
		isInstanceCredential: { type: Boolean },
		credentialPermissions: { default: () => ({}) },
		parentTypes: { default: () => [] },
		showValidationWarning: {
			type: Boolean,
			default: false
		},
		authError: { default: "" },
		testedSuccessfully: { type: Boolean },
		isOAuthType: { type: Boolean },
		isOAuthConnected: { type: Boolean },
		isRetesting: { type: Boolean },
		requiredPropertiesFilled: { type: Boolean },
		isManaged: { type: Boolean },
		isPrivateCredentialsEnabled: { type: Boolean },
		isResolvable: { type: Boolean },
		fixedCredentialsOnly: { type: Boolean },
		connectedByMe: { type: Boolean },
		connectedAccountIdentifier: { default: void 0 },
		isNewCredential: { type: Boolean },
		newCredentialProjectType: {},
		managedOauthAvailable: { type: Boolean },
		useCustomOauth: { type: Boolean },
		isQuickConnectMode: { type: Boolean },
		contextNode: {},
		showAiGatewayErrorNudge: { type: Boolean },
		aiGatewayCreditsAreFree: { type: Boolean },
		hideAskAssistant: { type: Boolean },
		instanceAiCredentialHelp: {
			type: Function,
			default: void 0
		}
	},
	emits: [
		"update",
		"authTypeChanged",
		"scrollToTop",
		"retest",
		"oauth",
		"disconnect",
		"quickConnect",
		"claimed",
		"useGatewayCredits",
		"update:isResolvable"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const credentialsStore = useCredentialsStore();
		const ndvStore = injectNDVStore();
		const rootStore = useRootStore();
		const uiStore = useUIStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const assistantStore = useAssistantStore();
		const chatPanelStore = useChatPanelStore();
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const { getQuickConnectOption } = useQuickConnect();
		const { promotionText } = useGatewayCreditsPromotion({
			nodeType: () => props.contextNode?.type,
			credentialType: () => props.credentialType.name
		});
		onBeforeMount(async () => {
			uiStore.activeCredentialType = props.credentialType.name;
			if (rootStore.defaultLocale === "en") return;
			const key = `n8n-nodes-base.credentials.${props.credentialType.name}`;
			if (i18n.exists(key)) return;
			const credTranslation = await credentialsStore.getCredentialTranslation(props.credentialType.name);
			if (!credTranslation) return;
			addCredentialTranslation({ [props.credentialType.name]: credTranslation }, rootStore.defaultLocale);
		});
		const serviceName = computed(() => props.credentialType ? getAppNameFromCredType(props.credentialType.displayName) : "");
		const appName = computed(() => serviceName.value || i18n.baseText("credentialEdit.credentialConfig.theServiceYouReConnectingTo"));
		const credentialTypeName = computed(() => props.credentialType?.name);
		const credentialOwnerName = computed(() => credentialsStore.getCredentialOwnerNameById(`${props.credentialId}`));
		const isHomeTeamProject = computed(() => credentialsStore.getCredentialById(`${props.credentialId}`)?.homeProject?.type === ProjectTypes.Team);
		const documentationUrl = computed(() => {
			const type = props.credentialType;
			const activeNode = ndvStore.value.activeNode;
			const isCommunityNode = activeNode ? isCommunityPackageName(activeNode.type) : false;
			const docUrl = type?.documentationUrl;
			if (!docUrl) return "";
			let url;
			if (docUrl.startsWith("https://") || docUrl.startsWith("http://")) {
				url = new URL(docUrl);
				if (url.hostname !== "docs.n8n.io") return docUrl;
			} else if (isCommunityNode) return "";
			else url = new URL(`${BUILTIN_CREDENTIALS_DOCS_URL}${docUrl}/`);
			if (url.hostname === "docs.n8n.io") {
				url.searchParams.set("utm_source", "n8n_app");
				url.searchParams.set("utm_medium", "credential_settings");
				url.searchParams.set("utm_campaign", "create_new_credentials_modal");
			}
			return url.href;
		});
		const isGoogleOAuthType = computed(() => credentialTypeName.value === "googleOAuth2Api" || props.parentTypes.includes("googleOAuth2Api"));
		const oAuthCallbackUrl = computed(() => {
			const oauthType = credentialTypeName.value === "oAuth2Api" || props.parentTypes.includes("oAuth2Api") ? "oauth2" : "oauth1";
			return rootStore.OAuthCallbackUrls[oauthType];
		});
		const showOAuthSuccessBanner = computed(() => {
			return props.isOAuthType && props.requiredPropertiesFilled && props.isOAuthConnected && !props.authError;
		});
		const showOAuthNotConnectedBanner = computed(() => {
			return props.isOAuthType && props.requiredPropertiesFilled && !props.isOAuthConnected && !props.authError;
		});
		const isConnectedOAuth = computed(() => !!props.isOAuthType && !!props.requiredPropertiesFilled && !!props.isOAuthConnected);
		const isStale = computed(() => isConnectedOAuth.value && !!props.authError);
		const connectedAccountName = computed(() => {
			if (props.isResolvable) return props.connectedAccountIdentifier;
			const identifier = props.credentialData?.accountIdentifier;
			return typeof identifier === "string" && identifier ? identifier : void 0;
		});
		const connectedBannerMessage = computed(() => connectedAccountName.value ? i18n.baseText("credentialEdit.credentialConfig.connectedAs", { interpolate: { account: connectedAccountName.value } }) : i18n.baseText("credentialEdit.credentialConfig.accountConnected"));
		const isMissingCredentials = computed(() => props.credentialType === null);
		const isNewCredential = computed(() => props.mode === "new" && !props.credentialId);
		const isAskAssistantAvailable = computed(() => !props.hideAskAssistant && documentationUrl.value && documentationUrl.value.includes("docs.n8n.io") && props.credentialProperties.length && props.credentialPermissions.update && !(props.isOAuthType && props.requiredPropertiesFilled) && assistantStore.isAssistantEnabled);
		const assistantAlreadyAsked = computed(() => {
			return assistantStore.isCredTypeActive(props.credentialType);
		});
		const canCreate = computed(() => isNewCredential.value && !!props.credentialPermissions.create);
		const canEdit = computed(() => {
			return !isNewCredential.value && !!props.credentialPermissions.update;
		});
		const canWrite = computed(() => {
			return canCreate.value || canEdit.value;
		});
		const canSelectEndUserType = computed(() => canWrite.value && !!props.credentialPermissions.createEndUser);
		const isEndUserTypeAvailable = computed(() => {
			if (props.isResolvable) return true;
			if (props.isNewCredential) return props.newCredentialProjectType === ProjectTypes.Team;
			return isHomeTeamProject.value;
		});
		const canConnect = computed(() => {
			if (!isNewCredential.value && props.isResolvable) return !!props.credentialPermissions.connect;
			return canWrite.value;
		});
		const isInstanceAiCredentialHelpAvailable = computed(() => !props.hideAskAssistant && !!props.instanceAiCredentialHelp && !!props.credentialProperties.length && canWrite.value && !(props.isOAuthType && props.requiredPropertiesFilled));
		const activeNode = computed(() => ndvStore.value.activeNode);
		const quickConnectOption = computed(() => {
			if (!activeNode.value) return void 0;
			return getQuickConnectOption(props.credentialType.name, activeNode.value.type);
		});
		const quickConnectAvailable = computed(() => !!quickConnectOption.value);
		const quickConnectBannerText = computed(() => quickConnectOption.value?.text ?? "");
		const isManagedOAuth = computed(() => props.isOAuthType && props.managedOauthAvailable && !props.useCustomOauth);
		function onDataChange(event) {
			emit("update", event);
		}
		const isTemplatedAuthType = computed(() => props.credentialType?.name === TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE);
		const testSuccessMessage = computed(() => isTemplatedAuthType.value ? i18n.baseText("credentialEdit.credentialConfig.authProbeAccepted") : i18n.baseText("credentialEdit.credentialConfig.connectionTestedSuccessfully"));
		function onDocumentationUrlClick() {
			telemetry.track("User clicked credential modal docs link", {
				docs_link: documentationUrl.value,
				credential_type: credentialTypeName.value,
				source: "modal",
				workflow_id: workflowDocumentStore.value.workflowId
			});
		}
		function onAuthTypeChange(value) {
			emit("authTypeChanged", value);
		}
		async function onInstanceAiCredentialHelpClick() {
			const placeholderTitles = isTemplatedAuthType.value ? listPlaceholderTitles(props.credentialData) : [];
			const recipeDocsUrl = isTemplatedAuthType.value ? parseHttpUrl(props.credentialData.docsUrl) : void 0;
			if (await props.instanceAiCredentialHelp?.({
				credentialType: props.credentialType.name,
				displayName: props.credentialType.displayName,
				nodeName: activeNode.value?.name,
				nodeType: activeNode.value?.type,
				id: props.credentialId || void 0,
				...placeholderTitles.length ? { placeholderTitles } : {},
				...recipeDocsUrl ? { docsUrl: recipeDocsUrl } : {},
				documentationUrl: documentationUrl.value || void 0,
				oauthRedirectUrl: props.isOAuthType ? oAuthCallbackUrl.value : void 0
			})) {
				uiStore.closeModal(CREDENTIAL_EDIT_MODAL_KEY);
				ndvStore.value.unsetActiveNodeName();
			}
		}
		async function onAskAssistantClick() {
			if (!assistantStore.isSessionEnded) {
				uiStore.openModalWithData({
					name: NEW_ASSISTANT_SESSION_MODAL,
					data: { context: { credHelp: { credType: props.credentialType } } }
				});
				return;
			}
			await chatPanelStore.openWithCredHelp(props.credentialType);
		}
		watch(showOAuthSuccessBanner, (newValue, oldValue) => {
			if (newValue && !oldValue) emit("scrollToTop");
		});
		return (_ctx, _cache) => {
			return __props.isManaged ? (openBlock(), createBlock(unref(N8nCallout_default), {
				key: 0,
				theme: "warning",
				icon: "triangle-alert"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("freeAi.credits.credentials.edit")), 1)]),
				_: 1
			})) : (openBlock(), createElementBlock("div", _hoisted_1$1, [createBaseVNode("div", {
				class: normalizeClass(_ctx.$style.config),
				"data-test-id": "node-credentials-config-container"
			}, [
				createVNode(FreeAiCreditsCallout_default, {
					"credential-type-name": __props.credentialType?.name,
					onClaimed: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("claimed"))
				}, null, 8, ["credential-type-name"]),
				canWrite.value ? (openBlock(), createBlock(CredentialModeSelector_default, {
					key: 0,
					"credential-type": __props.credentialType,
					"use-custom-oauth": __props.useCustomOauth,
					"show-managed-oauth-options": __props.managedOauthAvailable,
					"quick-connect-available": quickConnectAvailable.value,
					"is-quick-connect-mode": __props.isQuickConnectMode,
					"context-node": __props.contextNode,
					"onUpdate:authType": onAuthTypeChange
				}, null, 8, [
					"credential-type",
					"use-custom-oauth",
					"show-managed-oauth-options",
					"quick-connect-available",
					"is-quick-connect-mode",
					"context-node"
				])) : createCommentVNode("", true),
				__props.isQuickConnectMode ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
					quickConnectBannerText.value || quickConnectOption.value?.disclaimer ? (openBlock(), createBlock(QuickConnectBanner_default, {
						key: 0,
						text: quickConnectBannerText.value,
						disclaimer: quickConnectOption.value?.disclaimer
					}, null, 8, ["text", "disclaimer"])) : createCommentVNode("", true),
					unref(promotionText) ? (openBlock(), createBlock(GatewayCreditsPromotion_default, {
						key: 1,
						text: unref(promotionText)
					}, null, 8, ["text"])) : createCommentVNode("", true),
					createVNode(QuickConnectButton_default, {
						"service-name": serviceName.value,
						"credential-type-name": __props.credentialType.name,
						"data-test-id": "quick-connect-modal-button",
						onClick: _cache[1] || (_cache[1] = ($event) => _ctx.$emit("quickConnect"))
					}, null, 8, ["service-name", "credential-type-name"])
				], 64)) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [
					unref(promotionText) ? (openBlock(), createBlock(GatewayCreditsPromotion_default, {
						key: 0,
						text: unref(promotionText)
					}, null, 8, ["text"])) : createCommentVNode("", true),
					!isInstanceAiCredentialHelpAvailable.value && documentationUrl.value && __props.credentialProperties.length && !isManagedOAuth.value && canWrite.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 1,
						class: normalizeClass(_ctx.$style.docsCallout),
						theme: "custom",
						iconless: ""
					}, {
						actions: withCtx(() => [createVNode(unref(N8nLink_default), {
							to: documentationUrl.value,
							size: "small",
							onClick: onDocumentationUrlClick
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialConfig.openDocs")), 1)]),
							_: 1
						}, 8, ["to"])]),
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialConfig.needHelpFillingOutTheseFields")) + " ", 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true),
					canWrite.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [isInstanceAiCredentialHelpAvailable.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.askAssistantButton),
						"data-test-id": "credential-edit-instance-ai-help-button"
					}, [createVNode(unref(InlineAskAssistantButton_default), {
						label: unref(i18n).baseText("instanceAi.askAiAssistant"),
						onClick: onInstanceAiCredentialHelpClick
					}, null, 8, ["label"]), createBaseVNode("span", null, [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialConfig.assistantHelp.forSetupInstructions")) + " ", 1), documentationUrl.value && __props.credentialProperties.length && !isManagedOAuth.value && canWrite.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialConfig.assistantHelp.orReadThe")) + " ", 1), createVNode(unref(N8nLink_default), {
						to: documentationUrl.value,
						size: "small",
						onClick: onDocumentationUrlClick
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialConfig.assistantHelp.docs")), 1)]),
						_: 1
					}, 8, ["to"])], 64)) : createCommentVNode("", true)])], 2)) : isAskAssistantAvailable.value ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.askAssistantButton),
						"data-test-id": "credential-edit-ask-assistant-button"
					}, [createVNode(unref(InlineAskAssistantButton_default), {
						asked: assistantAlreadyAsked.value,
						onClick: onAskAssistantClick
					}, null, 8, ["asked"]), createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("credentialEdit.credentialConfig.assistantHelp.forSetupInstructions")), 1)], 2)) : createCommentVNode("", true)], 64)) : createCommentVNode("", true),
					withDirectives(createVNode(Banner_default, {
						theme: "danger",
						message: unref(i18n).baseText(`credentialEdit.credentialConfig.pleaseCheckTheErrorsBelow${__props.credentialPermissions.update ? "" : ".sharee"}`, { interpolate: { owner: credentialOwnerName.value } })
					}, null, 8, ["message"]), [[vShow, __props.showValidationWarning]]),
					__props.authError && !__props.showValidationWarning ? (openBlock(), createBlock(Banner_default, {
						key: 3,
						theme: "danger",
						message: unref(i18n).baseText(`credentialEdit.credentialConfig.couldntConnectWithTheseSettings${__props.credentialPermissions.update ? "" : ".sharee"}`, { interpolate: { owner: credentialOwnerName.value } }),
						details: __props.authError,
						"button-label": unref(i18n).baseText("credentialEdit.credentialConfig.retry"),
						"button-loading-label": unref(i18n).baseText("credentialEdit.credentialConfig.retrying"),
						"button-title": unref(i18n).baseText("credentialEdit.credentialConfig.retryCredentialTest"),
						"button-loading": __props.isRetesting,
						onClick: _cache[4] || (_cache[4] = ($event) => _ctx.$emit("retest"))
					}, createSlots({ _: 2 }, [isStale.value && canConnect.value ? {
						name: "button",
						fn: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.bannerActions) }, [createVNode(unref(N8nButton_default), {
							size: "small",
							label: unref(i18n).baseText("credentialEdit.credentialConfig.switchAccount"),
							"data-test-id": "oauth-stale-switch-account-button",
							onClick: _cache[2] || (_cache[2] = ($event) => _ctx.$emit("oauth"))
						}, null, 8, ["label"]), createVNode(unref(N8nButton_default), {
							variant: "outline",
							size: "small",
							class: normalizeClass(_ctx.$style.disconnectButton),
							label: unref(i18n).baseText("credentialEdit.credentialConfig.disconnect"),
							"data-test-id": "oauth-stale-disconnect-button",
							onClick: _cache[3] || (_cache[3] = ($event) => _ctx.$emit("disconnect"))
						}, null, 8, ["class", "label"])], 2)]),
						key: "0"
					} : void 0]), 1032, [
						"message",
						"details",
						"button-label",
						"button-loading-label",
						"button-title",
						"button-loading"
					])) : createCommentVNode("", true),
					__props.showAiGatewayErrorNudge ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 4,
						class: normalizeClass(_ctx.$style.aiGatewayErrorNudge),
						theme: "custom",
						icon: "sparkles",
						"icon-size": "large",
						"data-test-id": "gateway-credits-credential-error-nudge"
					}, {
						trailingContent: withCtx(() => [createVNode(unref(N8nButton_default), {
							size: "small",
							label: unref(i18n).baseText(__props.aiGatewayCreditsAreFree ? "credentialEdit.credentialConfig.aiGatewayErrorNudge.action.free" : "credentialEdit.credentialConfig.aiGatewayErrorNudge.action"),
							"data-test-id": "gateway-credits-credential-error-nudge-action",
							onClick: _cache[5] || (_cache[5] = ($event) => _ctx.$emit("useGatewayCredits"))
						}, null, 8, ["label"])]),
						default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.aiGatewayErrorNudgeCopy) }, [createBaseVNode("strong", null, toDisplayString(unref(i18n).baseText("credentialEdit.credentialConfig.aiGatewayErrorNudge.title")), 1), createBaseVNode("span", null, toDisplayString(unref(i18n).baseText(__props.aiGatewayCreditsAreFree ? "credentialEdit.credentialConfig.aiGatewayErrorNudge.description.free" : "credentialEdit.credentialConfig.aiGatewayErrorNudge.description")), 1)], 2)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true),
					!__props.fixedCredentialsOnly && __props.isPrivateCredentialsEnabled && __props.isOAuthType && !!__props.credentialPermissions.createEndUser && isEndUserTypeAvailable.value ? (openBlock(), createBlock(CredentialTypeSelector_default, {
						key: 5,
						"model-value": Boolean(__props.isResolvable),
						disabled: !canSelectEndUserType.value,
						"info-tip": unref(i18n).baseText("credentialEdit.credentialConfig.dynamicCredentials.infoTip"),
						"onUpdate:modelValue": _cache[6] || (_cache[6] = (val) => _ctx.$emit("update:isResolvable", val))
					}, null, 8, [
						"model-value",
						"disabled",
						"info-tip"
					])) : createCommentVNode("", true),
					withDirectives(createVNode(Banner_default, {
						theme: "success",
						message: connectedBannerMessage.value,
						"data-test-id": "oauth-connect-success-banner"
					}, createSlots({ _: 2 }, [__props.isResolvable ? {
						name: "subtitle",
						fn: withCtx(() => [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialConfig.endUserCredential.connectedSubtext")) + "\xA0 ", 1)]),
							_: 1
						}), createVNode(unref(N8nLink_default), {
							theme: "text",
							underline: "",
							to: unref(END_USER_CREDENTIALS_DOCS_URL),
							size: "small"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.learnMore")), 1)]),
							_: 1
						}, 8, ["to"])]),
						key: "0"
					} : void 0, canConnect.value ? {
						name: "button",
						fn: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.bannerActions) }, [createVNode(unref(N8nButton_default), {
							variant: "outline",
							size: "small",
							label: unref(i18n).baseText("credentialEdit.credentialConfig.switchAccount"),
							"data-test-id": "oauth-switch-account-button",
							onClick: _cache[7] || (_cache[7] = ($event) => _ctx.$emit("oauth"))
						}, null, 8, ["label"]), createVNode(unref(N8nButton_default), {
							variant: "outline",
							size: "small",
							class: normalizeClass(_ctx.$style.disconnectButton),
							label: unref(i18n).baseText("credentialEdit.credentialConfig.disconnect"),
							"data-test-id": "oauth-disconnect-button",
							onClick: _cache[8] || (_cache[8] = ($event) => _ctx.$emit("disconnect"))
						}, null, 8, ["class", "label"])], 2)]),
						key: "1"
					} : void 0]), 1032, ["message"]), [[vShow, showOAuthSuccessBanner.value && !__props.showValidationWarning]]),
					withDirectives(createVNode(Banner_default, {
						theme: "success",
						message: testSuccessMessage.value,
						"button-label": unref(i18n).baseText("credentialEdit.credentialConfig.retry"),
						"button-loading-label": unref(i18n).baseText("credentialEdit.credentialConfig.retrying"),
						"button-title": unref(i18n).baseText("credentialEdit.credentialConfig.retryCredentialTest"),
						"button-loading": __props.isRetesting,
						"data-test-id": "credentials-config-container-test-success",
						onClick: _cache[9] || (_cache[9] = ($event) => _ctx.$emit("retest"))
					}, null, 8, [
						"message",
						"button-label",
						"button-loading-label",
						"button-title",
						"button-loading"
					]), [[vShow, __props.testedSuccessfully && !__props.showValidationWarning]]),
					withDirectives(createVNode(Banner_default, {
						theme: __props.isResolvable ? "info" : "warning",
						message: __props.isResolvable ? unref(i18n).baseText("credentialEdit.credentialConfig.accountNotConnected.endUser", { interpolate: { service: serviceName.value } }) : unref(i18n).baseText("credentialEdit.credentialConfig.accountNotConnected"),
						"button-label": unref(i18n).baseText("credentialEdit.credentialConfig.connect"),
						"button-title": unref(i18n).baseText("credentialEdit.credentialConfig.connectOAuth2Credential"),
						"data-test-id": "oauth-not-connected-banner",
						onClick: _cache[12] || (_cache[12] = ($event) => _ctx.$emit("oauth"))
					}, createSlots({ _: 2 }, [__props.isResolvable ? {
						name: "subtitle",
						fn: withCtx(() => [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialConfig.endUserCredential.connectSubtext")) + "\xA0 ", 1)]),
							_: 1
						}), createVNode(unref(N8nLink_default), {
							theme: "text",
							underline: "",
							to: unref(END_USER_CREDENTIALS_DOCS_URL),
							size: "small"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.learnMore")), 1)]),
							_: 1
						}, 8, ["to"])]),
						key: "0"
					} : void 0, isGoogleOAuthType.value ? {
						name: "button",
						fn: withCtx(() => [canConnect.value ? (openBlock(), createElementBlock("div", _hoisted_2$1, [createVNode(GoogleAuthButton_default, { onClick: _cache[10] || (_cache[10] = ($event) => _ctx.$emit("oauth")) })])) : createCommentVNode("", true)]),
						key: "1"
					} : {
						name: "button",
						fn: withCtx(() => [canConnect.value ? (openBlock(), createBlock(QuickConnectButton_default, {
							key: 0,
							size: "small",
							"service-name": serviceName.value,
							"credential-type-name": __props.credentialType.name,
							label: unref(i18n).baseText("credentialEdit.credentialConfig.connect"),
							"data-test-id": "quick-connect-button",
							onClick: _cache[11] || (_cache[11] = ($event) => _ctx.$emit("oauth"))
						}, null, 8, [
							"service-name",
							"credential-type-name",
							"label"
						])) : createCommentVNode("", true)]),
						key: "2"
					}]), 1032, [
						"theme",
						"message",
						"button-label",
						"button-title"
					]), [[vShow, showOAuthNotConnectedBanner.value && !__props.showValidationWarning]]),
					canWrite.value ? (openBlock(), createElementBlock(Fragment, { key: 6 }, [__props.isOAuthType && !isManagedOAuth.value ? (openBlock(), createBlock(CopyInput_default, {
						key: 0,
						label: unref(i18n).baseText("credentialEdit.credentialConfig.oAuthRedirectUrl"),
						value: oAuthCallbackUrl.value,
						"copy-button-text": unref(i18n).baseText("credentialEdit.credentialConfig.clickToCopy"),
						hint: unref(i18n).baseText("credentialEdit.credentialConfig.subtitle", { interpolate: { appName: appName.value } }),
						"toast-title": unref(i18n).baseText("credentialEdit.credentialConfig.redirectUrlCopiedToClipboard"),
						"redact-value": true
					}, null, 8, [
						"label",
						"value",
						"copy-button-text",
						"hint",
						"toast-title"
					])) : createCommentVNode("", true)], 64)) : (openBlock(), createBlock(EnterpriseEdition_ee_default, {
						key: 7,
						features: [unref(EnterpriseEditionFeature).Sharing]
					}, {
						default: withCtx(() => [createBaseVNode("div", null, [createVNode(unref(N8nInfoTip_default), { bold: false }, {
							default: withCtx(() => [createTextVNode(toDisplayString(isHomeTeamProject.value ? unref(i18n).baseText("credentialEdit.credentialEdit.info.sharee.team") : unref(i18n).baseText("credentialEdit.credentialEdit.info.sharee", { interpolate: { credentialOwnerName: credentialOwnerName.value } })), 1)]),
							_: 1
						})])]),
						_: 1
					}, 8, ["features"])),
					__props.credentialType && canWrite.value && isTemplatedAuthType.value ? (openBlock(), createBlock(TemplatedAuthSimpleView_default, {
						key: 8,
						"credential-data": __props.credentialData,
						onUpdate: onDataChange
					}, null, 8, ["credential-data"])) : __props.credentialType && canWrite.value ? (openBlock(), createBlock(CredentialInputs_default, {
						key: 9,
						"credential-type": __props.credentialType.name,
						"credential-id": __props.credentialId,
						"n8n-project-id": __props.n8nProjectId,
						"is-instance-credential": __props.isInstanceCredential,
						"credential-data": __props.credentialData,
						"credential-properties": __props.credentialProperties,
						"documentation-url": documentationUrl.value,
						"show-validation-warnings": __props.showValidationWarning,
						onUpdate: onDataChange
					}, null, 8, [
						"credential-type",
						"credential-id",
						"n8n-project-id",
						"is-instance-credential",
						"credential-data",
						"credential-properties",
						"documentation-url",
						"show-validation-warnings"
					])) : createCommentVNode("", true),
					isMissingCredentials.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 10,
						color: "text-base",
						size: "medium"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialConfig.missingCredentialType")), 1)]),
						_: 1
					})) : createCommentVNode("", true),
					createVNode(EnterpriseEdition_ee_default, { features: [unref(EnterpriseEditionFeature).ExternalSecrets] }, {
						fallback: withCtx(() => [createVNode(unref(N8nInfoTip_default), { class: "mt-s" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialConfig.externalSecrets")) + " ", 1), createVNode(unref(N8nLink_default), {
								bold: "",
								to: unref(i18n).baseText("settings.externalSecrets.docs"),
								size: "small"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialConfig.externalSecrets.moreInfo")), 1)]),
								_: 1
							}, 8, ["to"])]),
							_: 1
						})]),
						_: 1
					}, 8, ["features"])
				], 64))
			], 2)]));
		};
	}
}), [["__cssModules", { "$style": {
	config: "_config_e3gpm_1",
	bannerActions: "_bannerActions_e3gpm_9",
	aiGatewayErrorNudge: "_aiGatewayErrorNudge_e3gpm_15",
	aiGatewayErrorNudgeCopy: "_aiGatewayErrorNudgeCopy_e3gpm_24",
	disconnectButton: "_disconnectButton_e3gpm_30",
	askAssistantButton: "_askAssistantButton_e3gpm_39",
	docsCallout: "_docsCallout_e3gpm_48"
} }]]);
//#endregion
//#region src/features/credentials/components/CredentialEdit/CredentialInfo.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var CredentialInfo_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CredentialInfo",
	props: {
		currentCredential: {},
		description: {},
		readonly: { type: Boolean }
	},
	emits: ["update:description"],
	setup(__props, { emit: __emit }) {
		const { isEnabled: credentialDescriptionsEnabled } = useCredentialDescriptionsExperiment();
		const emit = __emit;
		const i18n = useI18n();
		const descriptionId = useId();
		const descriptionCountId = `${descriptionId}-count`;
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [
				unref(credentialDescriptionsEnabled) ? (openBlock(), createBlock(unref(ElRow), { key: 0 }, {
					default: withCtx(() => [createVNode(unref(ElCol), {
						span: 8,
						class: normalizeClass(_ctx.$style.label)
					}, {
						default: withCtx(() => [createVNode(unref(N8nInputLabel_default), {
							"input-name": unref(descriptionId),
							label: unref(i18n).baseText("credentialEdit.credentialInfo.description")
						}, null, 8, ["input-name", "label"])]),
						_: 1
					}, 8, ["class"]), createVNode(unref(ElCol), { span: 16 }, {
						default: withCtx(() => [createVNode(unref(Input_default), {
							id: unref(descriptionId),
							"aria-describedby": __props.readonly ? void 0 : descriptionCountId,
							"model-value": __props.description,
							type: "textarea",
							autosize: {
								minRows: 4,
								maxRows: 8
							},
							maxlength: unref(512),
							readonly: __props.readonly,
							placeholder: __props.readonly ? void 0 : unref(i18n).baseText("credentialEdit.credentialInfo.description.placeholder"),
							"data-test-id": "credential-description",
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => emit("update:description", $event))
						}, null, 8, [
							"id",
							"aria-describedby",
							"model-value",
							"maxlength",
							"readonly",
							"placeholder"
						]), !__props.readonly ? (openBlock(), createBlock(CharacterCount_default, {
							key: 0,
							id: descriptionCountId,
							value: __props.description,
							max: unref(512),
							"show-when-empty": "",
							"data-test-id": "credential-description-character-count"
						}, null, 8, ["value", "max"])) : createCommentVNode("", true)]),
						_: 1
					})]),
					_: 1
				})) : createCommentVNode("", true),
				__props.currentCredential ? (openBlock(), createBlock(unref(ElRow), { key: 1 }, {
					default: withCtx(() => [createVNode(unref(ElCol), {
						span: 8,
						class: normalizeClass(_ctx.$style.label)
					}, {
						default: withCtx(() => [createVNode(unref(N8nText_default), {
							compact: true,
							bold: true
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialInfo.created")), 1)]),
							_: 1
						})]),
						_: 1
					}, 8, ["class"]), createVNode(unref(ElCol), {
						span: 16,
						class: normalizeClass(_ctx.$style.valueLabel)
					}, {
						default: withCtx(() => [createVNode(unref(N8nText_default), { compact: true }, {
							default: withCtx(() => [createVNode(TimeAgo_default, {
								date: __props.currentCredential.createdAt,
								capitalize: true
							}, null, 8, ["date"])]),
							_: 1
						})]),
						_: 1
					}, 8, ["class"])]),
					_: 1
				})) : createCommentVNode("", true),
				__props.currentCredential ? (openBlock(), createBlock(unref(ElRow), { key: 2 }, {
					default: withCtx(() => [createVNode(unref(ElCol), {
						span: 8,
						class: normalizeClass(_ctx.$style.label)
					}, {
						default: withCtx(() => [createVNode(unref(N8nText_default), {
							compact: true,
							bold: true
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialInfo.lastModified")), 1)]),
							_: 1
						})]),
						_: 1
					}, 8, ["class"]), createVNode(unref(ElCol), {
						span: 16,
						class: normalizeClass(_ctx.$style.valueLabel)
					}, {
						default: withCtx(() => [createVNode(unref(N8nText_default), { compact: true }, {
							default: withCtx(() => [createVNode(TimeAgo_default, {
								date: __props.currentCredential.updatedAt,
								capitalize: true
							}, null, 8, ["date"])]),
							_: 1
						})]),
						_: 1
					}, 8, ["class"])]),
					_: 1
				})) : createCommentVNode("", true),
				__props.currentCredential ? (openBlock(), createBlock(unref(ElRow), { key: 3 }, {
					default: withCtx(() => [createVNode(unref(ElCol), {
						span: 8,
						class: normalizeClass(_ctx.$style.label)
					}, {
						default: withCtx(() => [createVNode(unref(N8nText_default), {
							compact: true,
							bold: true
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialInfo.id")), 1)]),
							_: 1
						})]),
						_: 1
					}, 8, ["class"]), createVNode(unref(ElCol), {
						span: 16,
						class: normalizeClass(_ctx.$style.valueLabel)
					}, {
						default: withCtx(() => [createVNode(unref(N8nText_default), { compact: true }, {
							default: withCtx(() => [createTextVNode(toDisplayString(__props.currentCredential.id), 1)]),
							_: 1
						})]),
						_: 1
					}, 8, ["class"])]),
					_: 1
				})) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_teenq_1",
	label: "_label_teenq_5",
	accessLabel: "_accessLabel_teenq_10 _label_teenq_5",
	valueLabel: "_valueLabel_teenq_15"
} }]]);
//#endregion
//#region src/features/credentials/components/CredentialEdit/CredentialSharing.ee.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { key: 0 };
var _hoisted_2 = { key: 1 };
var CredentialSharing_ee_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CredentialSharing.ee",
	props: {
		credentialId: {},
		credentialData: {},
		credentialPermissions: {},
		credential: { default: null },
		modalBus: {},
		isSharedGlobally: {
			type: Boolean,
			default: false
		}
	},
	emits: ["update:modelValue", "update:shareWithAllUsers"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const usersStore = useUsersStore();
		const uiStore = useUIStore();
		const settingsStore = useSettingsStore();
		const projectsStore = useProjectsStore();
		const rolesStore = useRolesStore();
		const pageRedirectionHelper = usePageRedirectionHelper();
		const sharedWithProjects = ref([...props.credential?.sharedWithProjects ?? []]);
		const isSharingEnabled = computed(() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing]);
		const credentialOwnerName = computed(() => {
			const { name, email } = splitName(props.credential?.homeProject?.name ?? "");
			return name ?? email ?? "";
		});
		const credentialDataHomeProject = computed(() => {
			const credentialContainsProjectSharingData = (data) => {
				return "homeProject" in data;
			};
			return props.credentialData && credentialContainsProjectSharingData(props.credentialData) ? props.credentialData.homeProject : void 0;
		});
		const searchFn = useRemoteProjectSearch();
		const filterFn = (project) => project.id !== props.credential?.homeProject?.id && project.id !== credentialDataHomeProject.value?.id;
		const homeProject = computed(() => props.credential?.homeProject ?? credentialDataHomeProject.value);
		const isHomeTeamProject = computed(() => homeProject.value?.type === ProjectTypes.Team);
		const isPersonalSpaceRestricted = computed(() => homeProject.value?.type === ProjectTypes.Personal && homeProject.value?.id === projectsStore.personalProject?.id && !props.credentialPermissions.share);
		const credentialRoleTranslations = computed(() => {
			return { "credential:user": i18n.baseText("credentialEdit.credentialSharing.role.user.canUse") };
		});
		const credentialRoleDescriptions = computed(() => ({ "credential:user": i18n.baseText("credentialEdit.credentialSharing.role.user.canUse.description") }));
		const credentialRoles = computed(() => {
			return rolesStore.processedCredentialRoles.map(({ slug, scopes, licensed, description, systemRole, roleType }) => ({
				slug,
				displayName: credentialRoleTranslations.value[slug],
				scopes,
				licensed,
				description,
				systemRole,
				roleType
			}));
		});
		const confirmRemoval = (project) => {
			const { name } = splitName(project.name ?? "");
			return {
				title: i18n.baseText("credentialEdit.credentialSharing.unshare.confirm.title"),
				message: i18n.baseText("credentialEdit.credentialSharing.unshare.confirm.message", { interpolate: { name: name ?? project.name ?? "" } }),
				confirmButtonText: i18n.baseText("credentialEdit.credentialSharing.unshare.confirm.confirmButtonText"),
				cancelButtonText: i18n.baseText("credentialEdit.credentialSharing.unshare.confirm.cancelButtonText")
			};
		};
		const { fetchDependencies, getDependencies } = useDependencies();
		onMounted(() => {
			fetchDependencies([props.credentialId], "credential");
		});
		/**
		* Projects where the credential is used without a share. The rows stay visible
		* when the viewer cannot share: where a credential is used is audit information,
		* so the share permission only gates the Share button.
		*/
		const usedInProjects = computed(() => {
			const deps = getDependencies(props.credentialId, "credential");
			if (!deps) return [];
			const sharedProjectIds = new Set(sharedWithProjects.value.map((project) => project.id));
			const workflowNamesByProjectId = /* @__PURE__ */ new Map();
			for (const dependency of deps.dependencies) {
				if (dependency.type !== "workflowParent" || !dependency.projectId) continue;
				if (dependency.projectId === homeProject.value?.id) continue;
				if (sharedProjectIds.has(dependency.projectId)) continue;
				const names = workflowNamesByProjectId.get(dependency.projectId) ?? [];
				names.push(dependency.name);
				workflowNamesByProjectId.set(dependency.projectId, names);
			}
			const result = [];
			for (const [projectId, workflowNames] of workflowNamesByProjectId) {
				const project = projectsStore.myProjects.find((p) => p.id === projectId);
				if (!project) continue;
				const subtitle = workflowNames.length === 1 ? i18n.baseText("credentialEdit.credentialSharing.usedIn", { interpolate: { workflowName: workflowNames[0] } }) : i18n.baseText("credentialEdit.credentialSharing.usedIn.count", { interpolate: { count: `${workflowNames.length}` } });
				result.push({
					project,
					subtitle
				});
			}
			return result;
		});
		/** A personal project is named "Name <email>"; the project row hides the email, so the copy does too. */
		function usedInProjectName(project) {
			return splitName(project.name ?? "").name;
		}
		function usedInShareTooltip(project) {
			if (!props.credentialPermissions.share) return isPersonalSpaceRestricted.value ? i18n.baseText("credentialEdit.credentialSharing.info.personalSpaceRestricted") : "";
			const name = usedInProjectName(project);
			if (hasInstanceWideUse(project)) return i18n.baseText("credentialEdit.credentialSharing.share.teamProjects.tooltip", { interpolate: { name: name ?? "" } });
			return name ? i18n.baseText("credentialEdit.credentialSharing.share.tooltip", { interpolate: { project: name } }) : "";
		}
		const viewerHasInstanceWideUse = computed(() => getResourcePermissions(usersStore.currentUser?.globalScopes).credential?.use === true);
		/**
		* The viewer's own personal project, when their instance role lets them use
		* every credential: they already use this one there without a share. "Used in"
		* lists only the viewer's projects, so this is the only personal project it shows.
		*/
		function hasInstanceWideUse(project) {
			return viewerHasInstanceWideUse.value && project.type === ProjectTypes.Personal && project.id === projectsStore.personalProject?.id;
		}
		function shareUsedInProject(projectId) {
			const project = projectsStore.myProjects.find((p) => p.id === projectId);
			if (!project) return;
			sharedWithProjects.value = [...sharedWithProjects.value, project];
		}
		const canShareGlobally = computed(() => {
			return getResourcePermissions(usersStore.currentUser?.globalScopes).credential?.shareGlobally ?? false;
		});
		watch(sharedWithProjects, (changedSharedWithProjects) => {
			emit("update:modelValue", changedSharedWithProjects);
		}, { deep: true });
		function goToUpgrade() {
			pageRedirectionHelper.goToUpgrade("credential_sharing", "upgrade-credentials-sharing");
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [!isSharingEnabled.value ? (openBlock(), createElementBlock("div", _hoisted_1, [createVNode(unref(N8nEmptyState_default), {
				heading: unref(i18n).baseText(unref(uiStore).contextBasedTranslationKeys.credentials.sharing.unavailable.title),
				description: unref(i18n).baseText(unref(uiStore).contextBasedTranslationKeys.credentials.sharing.unavailable.description),
				"button-text": unref(i18n).baseText(unref(uiStore).contextBasedTranslationKeys.credentials.sharing.unavailable.button),
				"onClick:button": goToUpgrade
			}, null, 8, [
				"heading",
				"description",
				"button-text"
			])])) : (openBlock(), createElementBlock("div", _hoisted_2, [__props.credentialPermissions.share || isPersonalSpaceRestricted.value ? (openBlock(), createBlock(unref(N8nInfoTip_default), {
				key: 0,
				bold: false,
				class: "mb-s"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialSharing.info.owner")), 1)]),
				_: 1
			})) : isHomeTeamProject.value ? (openBlock(), createBlock(unref(N8nInfoTip_default), {
				key: 1,
				bold: false,
				class: "mb-s"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialSharing.info.sharee.team")), 1)]),
				_: 1
			})) : (openBlock(), createBlock(unref(N8nInfoTip_default), {
				key: 2,
				bold: false,
				class: "mb-s"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialSharing.info.sharee.personal", { interpolate: { credentialOwnerName: credentialOwnerName.value } })), 1)]),
				_: 1
			})), createVNode(ProjectSharing_default, {
				modelValue: sharedWithProjects.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => sharedWithProjects.value = $event),
				"search-fn": unref(searchFn),
				"filter-fn": filterFn,
				roles: credentialRoles.value,
				"role-descriptions": credentialRoleDescriptions.value,
				"confirm-removal": confirmRemoval,
				"sort-selected": "",
				"unshared-projects": usedInProjects.value,
				"home-project": homeProject.value,
				readonly: !__props.credentialPermissions.share,
				static: !__props.credentialPermissions.share,
				"disabled-tooltip": isPersonalSpaceRestricted.value ? unref(i18n).baseText("credentialEdit.credentialSharing.info.personalSpaceRestricted") : void 0,
				placeholder: unref(i18n).baseText("projects.sharing.select.placeholder.project"),
				"show-suffix": true,
				"can-share-globally": canShareGlobally.value,
				"is-shared-globally": __props.isSharedGlobally,
				teleported: false,
				"onUpdate:shareWithAllUsers": _cache[1] || (_cache[1] = ($event) => emit("update:shareWithAllUsers", $event))
			}, {
				"unshared-actions": withCtx(({ project }) => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.usedInActions) }, [hasInstanceWideUse(project) ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 0,
					placement: "top"
				}, {
					content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialSharing.usedIn.personalSpace.tooltip", { interpolate: { name: usedInProjectName(project) ?? "" } })), 1)]),
					default: withCtx(() => [createVNode(unref(N8nText_default), {
						class: normalizeClass(_ctx.$style.accessText),
						color: "text-light",
						"data-test-id": "credential-used-in-personal-space"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialSharing.usedIn.personalSpace")), 1)]),
						_: 1
					}, 8, ["class"])]),
					_: 2
				}, 1024)) : (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 1,
					content: unref(i18n).baseText("credentialEdit.credentialSharing.canView.tooltip"),
					placement: "top"
				}, {
					default: withCtx(() => [createVNode(unref(N8nText_default), {
						class: normalizeClass(_ctx.$style.accessText),
						color: "text-light",
						"data-test-id": "credential-used-in-can-view"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialSharing.canView")), 1)]),
						_: 1
					}, 8, ["class"])]),
					_: 1
				}, 8, ["content"])), createVNode(unref(N8nTooltip_default), {
					content: usedInShareTooltip(project),
					disabled: !usedInShareTooltip(project),
					placement: "top"
				}, {
					default: withCtx(() => [createBaseVNode("span", null, [createVNode(unref(N8nButton_default), {
						variant: "outline",
						disabled: !__props.credentialPermissions.share,
						"data-test-id": "credential-used-in-project-share",
						onClick: ($event) => shareUsedInProject(project.id)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.credentialSharing.share")), 1)]),
						_: 1
					}, 8, ["disabled", "onClick"])])]),
					_: 2
				}, 1032, ["content", "disabled"])], 2)]),
				_: 1
			}, 8, [
				"modelValue",
				"search-fn",
				"roles",
				"role-descriptions",
				"unshared-projects",
				"home-project",
				"readonly",
				"static",
				"disabled-tooltip",
				"placeholder",
				"can-share-globally",
				"is-shared-globally"
			])]))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1hvf6_1",
	usedInActions: "_usedInActions_1hvf6_8",
	accessText: "_accessText_1hvf6_15"
} }]]);
//#endregion
//#region src/features/credentials/components/CredentialEdit/TypeToConfirmDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
//#endregion
//#region src/features/credentials/components/CredentialEdit/TypeToConfirmDialog.vue
var TypeToConfirmDialog_default = /* @__PURE__ */ defineComponent({
	__name: "TypeToConfirmDialog",
	props: {
		open: { type: Boolean },
		title: {},
		message: {},
		confirmLabel: {},
		confirmKeyword: {},
		loading: {
			type: Boolean,
			default: false
		}
	},
	emits: ["confirm", "update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const typed = ref("");
		const canConfirm = computed(() => typed.value.trim() === props.confirmKeyword);
		watch(() => props.open, (open) => {
			if (open) typed.value = "";
		});
		function onConfirm() {
			if (!canConfirm.value || props.loading) return;
			emit("confirm");
		}
		function close() {
			emit("update:open", false);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.open,
				header: __props.title,
				size: "medium",
				stacked: "",
				"data-test-id": "credential-type-to-confirm-dialog",
				"onUpdate:open": _cache[1] || (_cache[1] = ($event) => emit("update:open", $event))
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createVNode(unref(DialogDescription_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.message), 1)]),
						_: 1
					}), createVNode(unref(N8nInputLabel_default), { label: unref(i18n).baseText("credentialEdit.credentialEdit.confirmMessage.typeToConfirm", { interpolate: { keyword: __props.confirmKeyword } }) }, {
						default: withCtx(() => [createVNode(unref(Input_default), {
							modelValue: typed.value,
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => typed.value = $event),
							"data-test-id": "credential-type-to-confirm-input",
							onKeyup: withKeys(onConfirm, ["enter"])
						}, null, 8, ["modelValue"])]),
						_: 1
					}, 8, ["label"])]),
					_: 1
				}), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "outline",
						label: unref(i18n).baseText("generic.cancel"),
						"data-test-id": "credential-type-to-confirm-cancel",
						onClick: close
					}, null, 8, ["label"]), createVNode(unref(N8nButton_default), {
						variant: "destructive",
						label: __props.confirmLabel,
						disabled: !canConfirm.value,
						loading: __props.loading,
						"data-test-id": "credential-type-to-confirm-button",
						onClick: onConfirm
					}, null, 8, [
						"label",
						"disabled",
						"loading"
					])]),
					_: 1
				})]),
				_: 1
			}, 8, ["open", "header"]);
		};
	}
});
//#endregion
//#region src/features/credentials/components/CredentialEdit/CredentialEdit.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var I18N_PREFIX = "credentialEdit.credentialEdit.confirmMessage";
var CredentialEdit_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CredentialEdit",
	props: {
		modalName: {},
		activeId: { default: void 0 },
		mode: { default: "new" }
	},
	setup(__props) {
		const { isEnabled: credentialDescriptionsEnabled } = useCredentialDescriptionsExperiment();
		const props = __props;
		const credentialsStore = useCredentialsStore();
		const settingsStore = useSettingsStore();
		const uiStore = useUIStore();
		const projectsStore = useProjectsStore();
		const externalSecretsStore = useExternalSecretsStore();
		const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
		const nodeHelpers = useNodeHelpers();
		const externalHooks = useExternalHooks();
		const toast = useToast();
		const message = useMessage();
		const i18n = useI18n();
		async function confirmModal(key, interpolate, extra) {
			const t = (suffix) => i18n.baseText(`${I18N_PREFIX}.${key}.${suffix}`, interpolate ? { interpolate } : {});
			const cancelButton = extra?.cancelButtonText !== void 0 ? { cancelButtonText: extra.cancelButtonText } : {};
			return await message.confirm(t("message"), t("headline"), {
				confirmButtonText: i18n.baseText(`${I18N_PREFIX}.${key}.confirmButtonText`),
				...cancelButton
			});
		}
		const typeToConfirmDialog = ref(null);
		let typeToConfirmResolve = null;
		async function openTypeToConfirm(opts) {
			return await new Promise((resolve) => {
				typeToConfirmResolve = resolve;
				typeToConfirmDialog.value = {
					open: true,
					...opts
				};
			});
		}
		function resolveTypeToConfirm(confirmed) {
			if (typeToConfirmDialog.value) typeToConfirmDialog.value.open = false;
			typeToConfirmResolve?.(confirmed);
			typeToConfirmResolve = null;
		}
		function connectedPeopleText(count) {
			return i18n.baseText("credentialEdit.credentialEdit.confirmMessage.connectedPeople", {
				adjustToNumber: count,
				interpolate: { count }
			});
		}
		const telemetry = useTelemetry();
		const router = useRouter();
		const rootStore = useRootStore();
		const { isEnabled: isPrivateCredentialsEnabled } = usePrivateCredentials();
		const { getQuickConnectOption, connect: quickConnect } = useQuickConnect();
		const aiGateway = useAiGateway();
		const aiGatewayStore = useAiGatewayStore();
		const { fetchDependencyCounts, hasDependencies } = useDependencies();
		const isQuickConnectMode = ref(false);
		const activeTab = ref("connection");
		const modalBus = ref(createEventBus());
		const closing = ref(false);
		const isDeleting = ref(false);
		const hasUnsavedChanges = ref(false);
		const credentialDescription = ref("");
		const isSaved = ref(false);
		const loading = ref(false);
		const savedCredentialNeedsLoad = ref(false);
		let closeAfterSave = false;
		const hasUserSpecifiedName = ref(false);
		const isSharedWithChanged = ref(false);
		const requiredCredentials = ref(false);
		const contentRef = ref();
		const isSharedGlobally = ref(false);
		const pendingAuthType = ref(null);
		const oauthFlowAbortController = ref(null);
		let isUnmounted = false;
		onBeforeUnmount(() => {
			isUnmounted = true;
			oauthFlowAbortController.value?.abort();
		});
		const credentialDataCache = ref({});
		const workflowDocumentStore = provideWorkflowDocumentStore();
		const ndvStore = computed(() => useNDVStore(workflowDocumentStore.value.documentId));
		const modalOptions = computed(() => {
			const state = uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY];
			return isCredentialModalState(state) ? state : void 0;
		});
		const telemetryWorkflowId = computed(() => {
			return modalOptions.value?.workflowId ?? workflowDocumentStore.value.workflowId;
		});
		const contextNode = computed(() => {
			if (modalOptions.value?.destination) return null;
			if (modalOptions.value?.contextNode) return modalOptions.value.contextNode;
			if (ndvStore.value.activeNode) return ndvStore.value.activeNode;
			const fallbackName = modalOptions.value?.nodeName;
			return fallbackName ? workflowDocumentStore.value?.getNodeByName(fallbackName) ?? null : null;
		});
		const workflowContextNode = computed(() => {
			const modalState = uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY];
			if (!isCredentialModalState(modalState) || !modalState.contextNode) return null;
			return workflowDocumentStore.value.getNodeById(modalState.contextNode.id);
		});
		const overrideProjectId = computed(() => {
			return modalOptions.value?.projectId;
		});
		const form = useCredentialForm({
			mode: () => props.mode,
			activeId: () => props.activeId,
			contextNode: () => contextNode.value,
			projectId: () => overrideProjectId.value,
			destination: () => modalOptions.value?.destination,
			initialName: () => modalOptions.value?.initialName,
			initialData: () => modalOptions.value?.initialData,
			showAuthSelector: () => requiredCredentials.value,
			suggestedName: () => {
				return modalOptions.value?.suggestedName;
			},
			setupHint: () => {
				return modalOptions.value?.credentialSetupHint;
			},
			onTestComplete: scrollToTop
		});
		const { credentialData, credentialName, credentialId, currentCredential, selectedCredential, authError, testedSuccessfully, isRetesting, isSaving, isTesting, showValidationWarning, isResolvable, connectedByMe, connectedAccountIdentifier, useCustomOAuth, activeNodeType, credentialTypeName, credentialType, parentTypes, isOAuthType, isOAuthConnected, managedOAuthAvailable, isEditingManagedCredential, isNewCredential, credentialProperties, requiredPropertiesFilled, isCredentialTestable, credentialPermissions, usesExternalSecrets, homeProject, setCredentialPropertyDefaults, resetCredentialData, clearOverwrittenProperties, testCredential, retestCredential, initialize, getChangedSharedFields } = form;
		watch(currentCredential, (credential) => {
			credentialDescription.value = credential?.description ?? "";
		});
		const canEditDescription = computed(() => credentialDescriptionsEnabled.value && !isEditingManagedCredential.value && (isNewCredential.value ? credentialPermissions.value.create : credentialPermissions.value.update));
		const hideAskAssistant = computed(() => {
			return modalOptions.value?.hideAskAssistant === true;
		});
		const { isAgentUi, getCredentialHelp } = useAgentAssistantCredentialHelp();
		const instanceAiCredentialHelp = computed(() => {
			return isAgentUi.value ? getCredentialHelp() : modalOptions.value?.instanceAiCredentialHelp;
		});
		const closeOnSave = computed(() => {
			return modalOptions.value?.closeOnSave === true;
		});
		const onCredentialCreated = computed(() => {
			return modalOptions.value?.onCredentialCreated;
		});
		const presetUsageScope = computed(() => {
			if (props.mode !== "new") return void 0;
			return modalOptions.value?.usageScope;
		});
		const appendToBody = computed(() => {
			return modalOptions.value?.appendToBody === true;
		});
		const isInstanceCredential = computed(() => presetUsageScope.value === "instance" || currentCredential.value?.usageScope === "instance");
		const sidebarItems = computed(() => {
			return [
				{
					id: "connection",
					label: i18n.baseText("credentialEdit.credentialEdit.connection"),
					position: "top"
				},
				...isInstanceCredential.value || modalOptions.value?.destination || credentialDescriptionsEnabled.value && isEditingManagedCredential.value ? [] : [{
					id: "sharing",
					label: i18n.baseText("credentialEdit.credentialEdit.sharing"),
					position: "top"
				}],
				...credentialDescriptionsEnabled.value || credentialTypeName.value !== "httpTemplatedCustomAuth" ? [{
					id: "details",
					label: i18n.baseText("credentialEdit.credentialEdit.details"),
					position: "top"
				}] : []
			];
		});
		const defaultCredentialTypeName = computed(() => {
			let defaultName = credentialTypeName.value;
			if (!defaultName || defaultName === "null") {
				if (activeNodeType.value?.credentials && activeNodeType.value.credentials.length > 0) defaultName = activeNodeType.value.credentials[0].name;
			}
			return defaultName ?? "";
		});
		const showSaveButton = computed(() => {
			if (isQuickConnectMode.value || credentialDescriptionsEnabled.value && isEditingManagedCredential.value) return false;
			if (!(credentialPermissions.value.create ?? credentialPermissions.value.update)) return false;
			return true;
		});
		const credentialHasDependents = computed(() => !!credentialId.value && hasDependencies(credentialId.value, "credential"));
		const showHeaderSaveButton = computed(() => showSaveButton.value && !!credentialType.value && (credentialDescriptionsEnabled.value || activeTab.value === "connection" || activeTab.value === "sharing"));
		const showSharingContent = computed(() => activeTab.value === "sharing" && !!credentialType.value);
		const showAiGatewayErrorNudge = computed(() => {
			const node = workflowContextNode.value;
			const type = credentialTypeName.value;
			const nodeType = activeNodeType.value;
			if (activeTab.value !== "connection" || !authError.value || !node || !type || !nodeType || !aiGateway.isEnabled.value || aiGateway.balance.value === void 0 || aiGateway.balance.value <= 0) return false;
			if (!nodeType.credentials?.some((credential) => credential.name === type)) return false;
			if (node.credentials?.[type]?.id !== credentialId.value) return false;
			if (node.credentials?.[type]?.__aiGatewayManaged === true) return false;
			const resolvedParameters = getNodeParameters(nodeType.properties, node.parameters, true, false, node, nodeType) ?? node.parameters;
			return aiGatewayStore.isNodeEligible(node, type, resolvedParameters);
		});
		let hasTrackedAiGatewayErrorNudge = false;
		watch(showAiGatewayErrorNudge, (isVisible) => {
			const node = workflowContextNode.value;
			const type = credentialTypeName.value;
			if (!isVisible || hasTrackedAiGatewayErrorNudge || !node || !type) return;
			hasTrackedAiGatewayErrorNudge = true;
			telemetry.track(TELEMETRY_EVENT.CREDENTIALS.USER_VIEWED_GATEWAY_CREDITS_CREDENTIAL_ERROR_NUDGE, {
				credential_type: type,
				node_type: node.type,
				workflow_id: telemetryWorkflowId.value || void 0
			});
		});
		onMounted(async () => {
			loading.value = !!modalOptions.value?.createCredential;
			if (modalOptions.value?.initialTab) activeTab.value = modalOptions.value.initialTab;
			aiGateway.fetchConfig();
			aiGateway.fetchWallet();
			try {
				requiredCredentials.value = modalOptions.value?.showAuthSelector === true;
				const forceManual = modalOptions.value?.forceManualMode === true;
				const projectId = modalOptions.value?.destination ? homeProject.value?.id : modalOptions.value?.projectId ?? projectsStore.currentProjectId ?? projectsStore.personalProject?.id;
				if (projectId) try {
					await externalSecretsStore.fetchSecretsForProject(projectId);
				} catch {}
				if (modalOptions.value?.createCredential) {
					await credentialsStore.fetchCredentialTypes(false);
					if (!credentialType.value) throw new Error(i18n.baseText("credentialEdit.typeUnavailable"));
				}
				try {
					await initialize();
				} catch (error) {
					if (props.mode === "edit") {
						toast.showError(error, i18n.baseText("credentialEdit.credentialEdit.showError.loadCredential.title"));
						closeDialog();
					}
					throw error;
				}
				if (props.mode === "edit") {
					const cred = currentCredential.value;
					isSharedGlobally.value = !!cred && "isGlobal" in cred && typeof cred.isGlobal === "boolean" ? cred.isGlobal : false;
					if (credentialId.value) fetchDependencyCounts([credentialId.value], "credential");
				}
				if (props.mode === "new" && !forceManual && credentialTypeName.value && ndvStore.value.activeNode) {
					if (getQuickConnectOption(credentialTypeName.value, ndvStore.value.activeNode.type)) isQuickConnectMode.value = true;
				}
				externalHooks.run("credentialsEdit.credentialModalOpened", {
					credentialType: credentialTypeName.value,
					isEditingCredential: props.mode === "edit",
					activeNode: ndvStore.value.activeNode
				}).catch((error) => {
					console.error("[CredentialEdit] External hooks execution failed", error);
				});
				setTimeout(async () => {
					if (credentialId.value) {
						if (!requiredPropertiesFilled.value && credentialPermissions.value.update) showValidationWarning.value = true;
						else await retestCredential();
					}
				}, 0);
			} catch (error) {
				console.error("[CredentialEdit] Initialization error", error);
				modalOptions.value?.onInitializeError?.(error);
			} finally {
				loading.value = false;
			}
		});
		watch(requiredPropertiesFilled, (filled) => {
			if (filled) showValidationWarning.value = false;
		});
		async function beforeClose() {
			let keepEditing = false;
			if (hasUnsavedChanges.value && !isNewCredential.value) keepEditing = await confirmModal("beforeClose1", { credentialDisplayName: credentialType.value ? credentialType.value.displayName : "" }, { cancelButtonText: i18n.baseText(`${I18N_PREFIX}.beforeClose1.cancelButtonText`) }) === MODAL_CONFIRM;
			else if (credentialPermissions.value.update && isOAuthType.value && !isOAuthConnected.value && !isResolvable.value) keepEditing = await confirmModal("beforeClose2", void 0, { cancelButtonText: i18n.baseText(`${I18N_PREFIX}.beforeClose2.cancelButtonText`) }) === MODAL_CONFIRM;
			if (!keepEditing) {
				pendingAuthType.value = null;
				uiStore.activeCredentialType = null;
				return true;
			} else if (!requiredPropertiesFilled.value) {
				showValidationWarning.value = true;
				scrollToTop();
			} else if (isOAuthType.value) scrollToBottom();
			return false;
		}
		async function loadCurrentCredential(id = props.activeId ?? "") {
			try {
				await form.loadCurrentCredential(id);
				const cred = currentCredential.value;
				isSharedGlobally.value = !!cred && "isGlobal" in cred && typeof cred.isGlobal === "boolean" ? cred.isGlobal : false;
			} catch (error) {
				toast.showError(error, i18n.baseText("credentialEdit.credentialEdit.showError.loadCredential.title"));
				closeDialog();
				throw error;
			}
		}
		function onTabSelect(tab) {
			activeTab.value = tab;
			const credType = credentialType.value ? credentialType.value.name : "";
			const activeNode = ndvStore.value.activeNode;
			telemetry.track("User viewed credential tab", {
				credential_type: credType,
				node_type: activeNode ? activeNode.type : null,
				tab,
				workflow_id: telemetryWorkflowId.value,
				credential_id: credentialId.value,
				sharing_enabled: EnterpriseEditionFeature.Sharing
			});
		}
		function onChangeSharedWith(sharedWithProjects) {
			credentialData.value = {
				...credentialData.value,
				sharedWithProjects
			};
			isSharedWithChanged.value = true;
			hasUnsavedChanges.value = true;
		}
		function onShareWithAllUsersUpdate(shareWithAllUsers) {
			isSharedGlobally.value = shareWithAllUsers;
			hasUnsavedChanges.value = true;
		}
		function getCurrentModeCacheKey() {
			const base = credentialTypeName.value ?? "";
			if (isOAuthType.value) return `${base}:${useCustomOAuth.value ? "custom" : "managed"}`;
			return base;
		}
		function cacheCurrentData() {
			const key = getCurrentModeCacheKey();
			if (!key) return;
			credentialDataCache.value[key] = { ...credentialData.value };
		}
		function restoreCachedData(cached) {
			const { sharedWithProjects, homeProject } = credentialData.value;
			credentialData.value = {
				...cached,
				sharedWithProjects,
				homeProject
			};
		}
		function restoreOrReset() {
			const cached = credentialDataCache.value[getCurrentModeCacheKey()];
			if (cached) restoreCachedData(cached);
			else resetCredentialData();
		}
		async function onResolvableChange(value) {
			const credName = credentialName.value;
			const isTogglingToPrivate = value && !isResolvable.value;
			const isTogglingToStatic = !value && isResolvable.value;
			if (isTogglingToPrivate && credentialData.value.oauthTokenData) {
				if (await confirmModal("switchToEndUser", { credentialName: credName }) !== "confirm") return;
			} else if (isTogglingToStatic) {
				const serverConnectedCount = currentCredential.value?.connectedUserCount ?? 0;
				const connectedUserCount = Math.max(serverConnectedCount, connectedByMe.value ? 1 : 0);
				if (connectedUserCount > 0) {
					if (!await openTypeToConfirm({
						title: i18n.baseText("credentialEdit.credentialEdit.confirmMessage.switchToFixed.headline", { interpolate: { credentialName: credName } }),
						message: i18n.baseText("credentialEdit.credentialEdit.confirmMessage.switchToFixed.message", { interpolate: { people: connectedPeopleText(connectedUserCount) } }),
						confirmLabel: i18n.baseText("credentialEdit.credentialEdit.confirmMessage.switchToFixed.confirmButtonText"),
						keyword: "disconnect"
					})) return;
				}
			}
			isResolvable.value = value;
			connectedByMe.value = false;
			connectedAccountIdentifier.value = void 0;
			credentialData.value = {
				...credentialData.value,
				oauthTokenData: null
			};
			hasUnsavedChanges.value = true;
		}
		function onDataChange(update) {
			if (form.onDataChange(update)) hasUnsavedChanges.value = true;
		}
		async function closeDialog() {
			if (isSaving.value) {
				closeAfterSave = true;
				return;
			}
			if (closing.value) return;
			closing.value = true;
			try {
				if (await beforeClose() === false) return;
				uiStore.closeModal(props.modalName);
				modalBus.value.emit("closed");
			} finally {
				closing.value = false;
			}
		}
		function onDialogOpenUpdate(open) {
			if (!open && !isSaving.value) closeDialog();
		}
		async function useGatewayCredits() {
			const node = workflowContextNode.value;
			const type = credentialTypeName.value;
			if (!node || !type || !showAiGatewayErrorNudge.value) return;
			const sourceWorkflowDocumentStore = workflowDocumentStore.value;
			const previousCredentials = { ...node.credentials ?? {} };
			const updateCredentials = (credentials, nodeName = node.name) => {
				sourceWorkflowDocumentStore.updateNodeProperties({
					name: nodeName,
					properties: { credentials }
				});
				nodeHelpers.updateNodesCredentialsIssues();
			};
			const getCurrentContextNode = () => {
				if (isUnmounted || workflowDocumentStore.value !== sourceWorkflowDocumentStore || credentialTypeName.value !== type) return null;
				const currentNode = workflowContextNode.value;
				return currentNode?.id === node.id ? currentNode : null;
			};
			updateCredentials({
				...previousCredentials,
				[type]: {
					id: null,
					name: "",
					__aiGatewayManaged: true
				}
			});
			if (!await aiGateway.saveAfterToggle()) {
				const currentNode = getCurrentContextNode();
				if (currentNode) updateCredentials(previousCredentials, currentNode.name);
				return;
			}
			if (!getCurrentContextNode()) return;
			const workflowId = telemetryWorkflowId.value || void 0;
			telemetry.track("User toggled n8n connect credential", {
				credential_type: type,
				node_type: node.type,
				mode: "n8n_connect",
				workflow_id: workflowId
			});
			telemetry.track("Node credential assigned", {
				credential_type: type,
				node_type: node.type,
				workflow_id: workflowId,
				credential_id: null,
				credential_kind: "n8n_connect",
				source: "credential_error_nudge"
			});
			closeDialog();
			toast.showMessage({
				title: i18n.baseText("credentialEdit.credentialConfig.aiGatewayErrorNudge.toast.title"),
				type: "success"
			});
		}
		function onNameEdit(text) {
			hasUnsavedChanges.value = true;
			hasUserSpecifiedName.value = true;
			credentialName.value = text;
		}
		function onDescriptionEdit(text) {
			if (!canEditDescription.value || text === credentialDescription.value) return;
			credentialDescription.value = text;
			hasUnsavedChanges.value = true;
		}
		const typeAvailabilityPoliciesStore = useTypeAvailabilityPoliciesStore();
		const policyProjectId = computed(() => {
			if (props.mode !== "edit") return homeProject.value?.id;
			if (!currentCredential.value) return void 0;
			return currentCredential.value.homeProject?.id ?? homeProject.value?.id;
		});
		const projectBeforeEdit = typeAvailabilityPoliciesStore.requestedProjectId;
		watch(policyProjectId, (projectId) => {
			if (projectId) typeAvailabilityPoliciesStore.fetchForProject(projectId);
		}, { immediate: true });
		onBeforeUnmount(() => {
			if (projectBeforeEdit && projectBeforeEdit !== policyProjectId.value) typeAvailabilityPoliciesStore.fetchForProject(projectBeforeEdit);
		});
		const { restriction: credentialTypeRestriction } = useCredentialTypeRestriction(() => credentialTypeName.value);
		function scrollToTop() {
			setTimeout(() => {
				if (contentRef.value) contentRef.value.scrollTop = 0;
			}, 0);
		}
		function scrollToBottom() {
			setTimeout(() => {
				if (contentRef.value) contentRef.value.scrollTop = contentRef.value.scrollHeight;
			}, 0);
		}
		async function retrySavedCredentialLoad() {
			if (isSaving.value) return;
			isSaving.value = true;
			try {
				await form.loadCurrentCredential(credentialId.value);
				setCredentialPropertyDefaults();
				savedCredentialNeedsLoad.value = false;
			} catch (error) {
				toast.showError(error, i18n.baseText("credentialEdit.credentialEdit.showError.loadCredential.title"));
			} finally {
				isSaving.value = false;
			}
		}
		async function saveCredential() {
			if (isSaving.value || loading.value || savedCredentialNeedsLoad.value || !credentialType.value) return null;
			if (!(credentialId.value ? credentialPermissions.value.update || credentialPermissions.value.share : credentialPermissions.value.create)) return null;
			isSaving.value = true;
			try {
				return await persistCredential();
			} catch (error) {
				toast.showError(error, i18n.baseText("credentialEdit.credentialEdit.showError.createCredential.title"));
				return null;
			} finally {
				isSaving.value = false;
				isTesting.value = false;
				if (closeAfterSave) {
					closeAfterSave = false;
					closeDialog();
				}
			}
		}
		async function persistCredential() {
			if (!requiredPropertiesFilled.value) {
				showValidationWarning.value = true;
				scrollToTop();
				return null;
			} else showValidationWarning.value = false;
			assert(credentialType.value);
			const data = getNodeParameters(credentialType.value.properties, credentialData.value, false, false, null, null);
			const savedData = data ?? {};
			assert(credentialTypeName.value);
			const credentialDetails = {
				id: credentialId.value,
				name: credentialName.value,
				...canEditDescription.value ? { description: credentialDescription.value } : {},
				type: credentialTypeName.value,
				data,
				isGlobal: isSharedGlobally.value,
				isResolvable: isResolvable.value
			};
			if (settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing] && credentialData.value.sharedWithProjects) credentialDetails.sharedWithProjects = credentialData.value.sharedWithProjects;
			if (credentialData.value.homeProject) credentialDetails.homeProject = credentialData.value.homeProject;
			const appliedAuthType = pendingAuthType.value;
			if (appliedAuthType && contextNode.value) {
				updateNodeAuthType(workflowDocumentStore.value.updateNodeProperties, contextNode.value, appliedAuthType);
				pendingAuthType.value = null;
			}
			let credential = null;
			const isNewCredential = props.mode === "new" && !credentialId.value;
			if (isNewCredential) {
				if (presetUsageScope.value) credentialDetails.usageScope = presetUsageScope.value;
				credential = await createCredential(credentialDetails, homeProject.value);
				if (credential) onCredentialCreated.value?.(credential);
			} else {
				if (settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing]) credentialDetails.sharedWithProjects = credentialData.value.sharedWithProjects;
				if (isResolvable.value && getChangedSharedFields(savedData).length) {
					if (await confirmModal("sharedFieldsChanged", { credentialName: credentialName.value }) !== "confirm") return null;
				}
				credential = await updateCredential(credentialDetails);
			}
			if (credential) {
				credentialId.value = credential.id;
				const updatedCredential = {
					...credential,
					data: savedData
				};
				if (!modalOptions.value?.createCredential || !isNewCredential) currentCredential.value = updatedCredential;
				connectedByMe.value = credential.connectedByMe === true;
				if ((!modalOptions.value?.createCredential || !isNewCredential) && credentialProperties.value.some((p) => p.typeOptions?.redactJsonLeaves)) {
					await loadCurrentCredential(credential.id);
					setCredentialPropertyDefaults();
				}
				if (isCredentialTestable.value) {
					isTesting.value = true;
					credentialDetails.data = credentialData.value;
					credentialDetails.id = credentialId.value;
					await testCredential(credentialDetails);
					isTesting.value = false;
					if (testedSuccessfully.value && closeOnSave.value) closeDialog();
				} else {
					authError.value = "";
					testedSuccessfully.value = false;
					if (!isOAuthType.value && closeOnSave.value) closeDialog();
				}
				const trackProperties = {
					credential_type: credentialDetails.type,
					workflow_id: telemetryWorkflowId.value,
					credential_id: credential.id,
					is_complete: !!requiredPropertiesFilled.value,
					is_new: isNewCredential,
					uses_external_secrets: usesExternalSecrets(credentialDetails.data ?? {})
				};
				if (isOAuthType.value) trackProperties.is_valid = !!isOAuthConnected.value;
				else if (isCredentialTestable.value) trackProperties.is_valid = !!testedSuccessfully.value;
				if (ndvStore.value.activeNode) trackProperties.node_type = ndvStore.value.activeNode.type;
				if (authError.value && authError.value !== "") trackProperties.authError = authError.value;
				/**
				* For non-OAuth credentials we track saving on clicking the `Save` button, but for
				* OAuth credentials we track saving at the end of the flow (BroastcastChannel event)
				* so that the `is_valid` property is correct.
				*/
				if (!isOAuthType.value) {
					telemetry.track("User saved credentials", trackProperties);
					handleDynamicNotification(!!trackProperties.is_valid);
				}
				await externalHooks.run("credentialEdit.saveCredential", trackProperties);
			}
			return credential;
		}
		async function handleDynamicNotification(isValid) {
			if (!isValid || !settingsStore.isCloudDeployment) return;
			try {
				const response = await sendUserEvent(rootStore.restApiContext, {
					eventType: "credential-saved",
					metadata: { credential_type: credentialTypeName.value }
				});
				if (response.title && response.message) setTimeout(async () => {
					try {
						await message.confirm(response.message, response.title, {
							confirmButtonText: i18n.baseText("generic.keepBuilding"),
							cancelButtonText: "",
							showCancelButton: false,
							closeOnClickModal: true,
							closeOnPressEscape: true
						});
					} catch (error) {}
				}, 15e3);
			} catch (error) {}
		}
		const createToastMessagingForNewCredentials = (project) => {
			let toastTitle = i18n.baseText("credentials.create.personal.toast.title");
			let toastText = "";
			if (project && project.id !== projectsStore.personalProject?.id) {
				toastTitle = i18n.baseText("credentials.create.project.toast.title", { interpolate: { projectName: project?.name ?? "" } });
				toastText = i18n.baseText("credentials.create.project.toast.text", { interpolate: { projectName: project?.name ?? "" } });
			}
			return {
				title: toastTitle,
				message: toastText
			};
		};
		async function createCredential(credentialDetails, project) {
			let credential;
			try {
				const override = modalOptions.value?.createCredential;
				const destination = modalOptions.value?.destination;
				if (override && destination) {
					const projectId = destination.kind === "resolved" ? destination.project.id : destination.id;
					credentialId.value = await override(credentialDetails, projectId);
					hasUnsavedChanges.value = false;
					savedCredentialNeedsLoad.value = true;
					try {
						await form.loadCurrentCredential(credentialId.value);
						setCredentialPropertyDefaults();
					} catch (error) {
						toast.showError(error, i18n.baseText("credentialEdit.credentialEdit.showError.loadCredential.title"));
						return null;
					}
					savedCredentialNeedsLoad.value = false;
					credential = currentCredential.value;
					if (!credential) return null;
				} else {
					credential = await credentialsStore.createNewCredential(credentialDetails, project?.id, router.currentRoute.value.query.uiContext?.toString());
					credentialId.value = credential.id;
				}
				const { uiContext, ...rest } = router.currentRoute.value.query;
				router.replace({ query: rest });
				hasUnsavedChanges.value = false;
				const { title, message } = createToastMessagingForNewCredentials(homeProject.value ?? project);
				toast.showMessage({
					title,
					message,
					type: "success"
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("credentialEdit.credentialEdit.showError.createCredential.title"));
				return null;
			}
			await externalHooks.run("credential.saved", {
				credential_type: credentialDetails.type,
				credential_id: credential.id,
				is_new: true
			});
			telemetry.track("User created credentials", {
				credential_type: credentialDetails.type,
				credential_id: credential.id,
				workflow_id: telemetryWorkflowId.value
			});
			return credential;
		}
		async function updateCredential(credentialDetails) {
			let credential = null;
			try {
				if (credentialPermissions.value.update) credential = await credentialsStore.updateCredential({
					id: credentialId.value,
					data: credentialDetails
				});
				if (credentialPermissions.value.share && isSharedWithChanged.value && credentialDetails.sharedWithProjects) {
					credential = await credentialsStore.setCredentialSharedWith({
						credentialId: credentialDetails.id,
						sharedWithProjects: credentialDetails.sharedWithProjects
					});
					isSharedWithChanged.value = false;
				}
				hasUnsavedChanges.value = false;
				isSaved.value = true;
				if (credential) {
					toast.showMessage({
						title: i18n.baseText("credentials.update.toast.title"),
						type: "success"
					});
					await externalHooks.run("credential.saved", {
						credential_type: credentialDetails.type,
						credential_id: credential.id,
						is_new: false
					});
				}
			} catch (error) {
				toast.showError(error, i18n.baseText("credentialEdit.credentialEdit.showError.updateCredential.title"));
				return null;
			}
			nodeHelpers.updateNodesCredentialsIssues();
			return credential;
		}
		async function deleteCredential() {
			if (!currentCredential.value) return;
			const savedCredentialName = currentCredential.value.name;
			const serverConnectedCount = currentCredential.value.connectedUserCount ?? 0;
			const connectedUserCount = Math.max(serverConnectedCount, connectedByMe.value ? 1 : 0);
			if (isResolvable.value && connectedUserCount > 0) {
				if (!await openTypeToConfirm({
					title: i18n.baseText("credentialEdit.credentialEdit.confirmMessage.deleteConnected.headline", { interpolate: { credentialName: savedCredentialName } }),
					message: i18n.baseText("credentialEdit.credentialEdit.confirmMessage.deleteConnected.message", { interpolate: { people: connectedPeopleText(connectedUserCount) } }),
					confirmLabel: i18n.baseText("credentialEdit.credentialEdit.confirmMessage.deleteConnected.confirmButtonText"),
					keyword: "delete"
				})) return;
			} else if (await confirmModal("deleteCredential", { savedCredentialName }) !== "confirm") return;
			try {
				isDeleting.value = true;
				await credentialsStore.deleteCredential({ id: credentialId.value });
				hasUnsavedChanges.value = false;
				isSaved.value = true;
			} catch (error) {
				toast.showError(error, i18n.baseText("credentialEdit.credentialEdit.showError.deleteCredential.title"));
				isDeleting.value = false;
				return;
			}
			isDeleting.value = false;
			nodeHelpers.updateNodesCredentialsIssues();
			credentialData.value = {};
			toast.showMessage({
				title: i18n.baseText("credentialEdit.credentialEdit.showMessage.title"),
				type: "success"
			});
			closeDialog();
		}
		async function oAuthCredentialAuthorize() {
			if (isSaving.value || loading.value || savedCredentialNeedsLoad.value) return;
			let url;
			credentialsStore.pendingOAuthRefresh = true;
			const oauthPopup = openOAuthPopup();
			if (!oauthPopup) {
				toast.showError(new Error(i18n.baseText("credentialEdit.credentialEdit.showError.oauthPopupBlocked.message")), i18n.baseText("credentialEdit.credentialEdit.showError.oauthPopupBlocked.title"));
				return;
			}
			const credential = credentialPermissions.value.update || credentialPermissions.value.create ? await saveCredential() : currentCredential.value;
			if (!credential) {
				oauthPopup.close();
				return;
			}
			const types = parentTypes.value;
			try {
				const credData = { id: credential.id };
				if (credentialTypeName.value === "oAuth2Api" || types.includes("oAuth2Api")) {
					if (isValidCredentialResponse(credData)) url = await credentialsStore.oAuth2Authorize(credData);
				} else if (credentialTypeName.value === "oAuth1Api" || types.includes("oAuth1Api")) {
					if (isValidCredentialResponse(credData)) url = await credentialsStore.oAuth1Authorize(credData);
				}
			} catch (error) {
				oauthPopup.close();
				toast.showError(error, i18n.baseText("credentialEdit.credentialEdit.showError.generateAuthorizationUrl.title"), { message: i18n.baseText("credentialEdit.credentialEdit.showError.generateAuthorizationUrl.message") });
				return;
			}
			if (url === void 0 || url === "") {
				oauthPopup.close();
				toast.showError(new Error(i18n.baseText("credentialEdit.credentialEdit.showError.invalidOAuthUrl.message")), i18n.baseText("credentialEdit.credentialEdit.showError.invalidOAuthUrl.title"));
				return;
			}
			const allowedOAuthUrlProtocols = ["http:", "https:"];
			try {
				const parsedUrl = new URL(url);
				if (!allowedOAuthUrlProtocols.includes(parsedUrl.protocol)) {
					oauthPopup.close();
					toast.showError(new Error(i18n.baseText("credentialEdit.credentialEdit.showError.invalidOAuthUrl.message")), i18n.baseText("credentialEdit.credentialEdit.showError.invalidOAuthUrl.title"));
					return;
				}
			} catch {
				oauthPopup.close();
				toast.showError(new Error(i18n.baseText("credentialEdit.credentialEdit.showError.invalidOAuthUrl.message")), i18n.baseText("credentialEdit.credentialEdit.showError.invalidOAuthUrl.title"));
				return;
			}
			oauthPopup.location.href = url;
			const canVerifyConnected = !credential.isResolvable && !isOAuthTokenDataSet(credentialData.value);
			credentialData.value = {
				...credentialData.value,
				oauthTokenData: null
			};
			const handleOAuthResult = (successfullyConnected) => {
				const trackProperties = {
					credential_type: credentialTypeName.value,
					workflow_id: telemetryWorkflowId.value || null,
					credential_id: credentialId.value,
					is_complete: !!requiredPropertiesFilled.value,
					is_new: props.mode === "new" && !credentialId.value,
					is_valid: successfullyConnected,
					uses_external_secrets: usesExternalSecrets(credentialData.value)
				};
				if (ndvStore.value.activeNode) trackProperties.node_type = ndvStore.value.activeNode.type;
				telemetry.track("User saved credentials", trackProperties);
				handleDynamicNotification(successfullyConnected);
				if (successfullyConnected) {
					credentialData.value = {
						...credentialData.value,
						oauthTokenData: {}
					};
					connectedByMe.value = true;
					credentialsStore.fetchAllCredentials().then((credentials) => {
						nodeHelpers.updateNodesCredentialsIssues();
						connectedAccountIdentifier.value = credentials.find((credential) => credential.id === credentialId.value)?.connectedAccountIdentifier;
					});
					oauthPopup.close();
					if (closeOnSave.value) closeDialog();
				}
			};
			oauthFlowAbortController.value?.abort();
			const abortController = new AbortController();
			abortController.signal.addEventListener("abort", () => oauthPopup.close(), { once: true });
			oauthFlowAbortController.value = abortController;
			const outcome = await waitForOAuthCallback({
				popup: oauthPopup,
				trustedOrigins: getTrustedOAuthOrigins(rootStore.urlBaseEditor),
				signal: abortController.signal,
				verifyConnected: canVerifyConnected ? async () => hasOAuthTokenData(await credentialsStore.getCredentialData({ id: credential.id })) : void 0
			});
			if (outcome === "aborted") return;
			handleOAuthResult(outcome === "success");
		}
		async function onDisconnectMyConnection() {
			if (!credentialId.value) return;
			if (await message.confirm(i18n.baseText("credentialEdit.credentialEdit.confirmMessage.disconnectCredential.message", { interpolate: { savedCredentialName: credentialName.value } }), i18n.baseText("credentialEdit.credentialEdit.confirmMessage.disconnectCredential.headline"), { confirmButtonText: i18n.baseText("credentialEdit.credentialEdit.confirmMessage.disconnectCredential.confirmButtonText") }) !== "confirm") return;
			try {
				if (isResolvable.value) {
					await credentialsStore.disconnectMyConnection({ id: credentialId.value });
					connectedByMe.value = false;
				} else await credentialsStore.disconnectOauthToken({ id: credentialId.value });
				connectedAccountIdentifier.value = void 0;
				credentialData.value = {
					...credentialData.value,
					oauthTokenData: null
				};
				toast.showMessage({
					title: i18n.baseText("credentialEdit.credentialEdit.showMessage.disconnected.title"),
					type: "success"
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("credentialEdit.credentialEdit.showError.disconnectCredential.title"));
			}
		}
		function applySelectedOAuthMode() {
			if (!useCustomOAuth.value) clearOverwrittenProperties();
			connectedByMe.value = false;
			connectedAccountIdentifier.value = void 0;
			credentialData.value = {
				...credentialData.value,
				oauthTokenData: null
			};
			hasUnsavedChanges.value = true;
		}
		async function onAuthTypeChanged(payload) {
			if (payload.quickConnectEnabled) {
				isQuickConnectMode.value = true;
				return;
			}
			isQuickConnectMode.value = false;
			cacheCurrentData();
			authError.value = "";
			useCustomOAuth.value = payload.customOauth ?? false;
			if (!activeNodeType.value?.credentials) {
				const cached = credentialDataCache.value[getCurrentModeCacheKey()];
				if (cached) restoreCachedData(cached);
				applySelectedOAuthMode();
				return;
			}
			const credentialsForType = getNodeCredentialForSelectedAuthType(activeNodeType.value, payload.type);
			if (credentialsForType) {
				selectedCredential.value = credentialsForType.name;
				uiStore.activeCredentialType = credentialsForType.name;
				restoreOrReset();
				applySelectedOAuthMode();
				pendingAuthType.value = payload.type;
				if (!hasUserSpecifiedName.value) {
					const newDefaultName = await credentialsStore.getNewCredentialName({ credentialTypeName: defaultCredentialTypeName.value });
					credentialName.value = newDefaultName;
				}
			}
		}
		async function onQuickConnect() {
			if (!credentialTypeName.value || !ndvStore.value.activeNode) return;
			const serviceName = getAppNameFromCredType(credentialType.value?.displayName ?? "");
			const credential = await quickConnect({
				credentialTypeName: credentialTypeName.value,
				...canEditDescription.value ? { description: credentialDescription.value } : {},
				nodeType: ndvStore.value.activeNode.type,
				source: "credential_type",
				serviceName
			});
			if (credential) {
				await loadCurrentCredential(credential.id);
				setCredentialPropertyDefaults();
				isQuickConnectMode.value = false;
				testedSuccessfully.value = true;
			}
		}
		const credNameRef = useTemplateRef("credNameRef");
		const { width } = useElementSize(credNameRef);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [createVNode(unref(Dialog_default), {
				open: modalOpen.value,
				size: "fit",
				stacked: appendToBody.value,
				"show-close-button": loading.value,
				"container-class": _ctx.$style.dialogShell,
				"aria-label": loading.value ? unref(i18n).baseText("credentials.heading") : void 0,
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [!loading.value ? (openBlock(), createBlock(unref(DialogHeader_default), {
					key: 0,
					class: normalizeClass(_ctx.$style.header)
				}, {
					default: withCtx(() => [createVNode(unref(DialogTitle_default), { "as-child": "" }, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.credInfo) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.credIcon) }, [createVNode(CredentialIcon_default, { "credential-type-name": defaultCredentialTypeName.value }, null, 8, ["credential-type-name"])], 2), createBaseVNode("div", {
							ref_key: "credNameRef",
							ref: credNameRef,
							class: normalizeClass(_ctx.$style.credName)
						}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.credNameRow) }, [unref(credentialName) ? (openBlock(), createBlock(unref(N8nInlineTextEdit_default), {
							key: 0,
							"data-test-id": "credential-name",
							"model-value": unref(credentialName),
							"max-width": unref(width) - 10,
							readonly: !(unref(credentialPermissions).create && props.mode === "new" || unref(credentialPermissions).update) || !unref(credentialType) || unref(isEditingManagedCredential),
							"onUpdate:modelValue": onNameEdit
						}, null, 8, [
							"model-value",
							"max-width",
							"readonly"
						])) : createCommentVNode("", true), unref(isResolvable) ? (openBlock(), createElementBlock("span", {
							key: 1,
							class: normalizeClass(_ctx.$style.dynamicTag),
							"data-test-id": "credential-dynamic-tag"
						}, [createVNode(PrivateCredentialIcon_default, {
							"tooltip-title": unref(i18n).baseText("credentials.private.tooltipTitle"),
							"tooltip-text": unref(i18n).baseText("credentials.private.tooltip")
						}, null, 8, ["tooltip-title", "tooltip-text"])], 2)) : createCommentVNode("", true)], 2), unref(credentialType) ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							size: "small",
							tag: "p",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(credentialType).displayName), 1)]),
							_: 1
						})) : createCommentVNode("", true)], 2)], 2)]),
						_: 1
					}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.credActions) }, [
						credentialHasDependents.value ? (openBlock(), createBlock(DependencyPill_default, {
							key: 0,
							"resource-type": "credential",
							"resource-id": unref(credentialId),
							source: "credential_modal",
							"in-dialog": "",
							"data-test-id": "credential-edit-dependents"
						}, null, 8, ["resource-id"])) : createCommentVNode("", true),
						showHeaderSaveButton.value ? (openBlock(), createBlock(SaveButton_default, {
							key: 1,
							class: normalizeClass(_ctx.$style.saveButton),
							disabled: unref(isSaving) || savedCredentialNeedsLoad.value || !unref(isNewCredential) && !hasUnsavedChanges.value && !unref(isTesting) || !unref(requiredPropertiesFilled),
							variant: hasUnsavedChanges.value || unref(isTesting) ? "solid" : "outline",
							"is-saving": unref(isSaving) || unref(isTesting),
							saved: !unref(isNewCredential) && isSaved.value && !hasUnsavedChanges.value && !unref(isTesting),
							"saving-label": unref(isTesting) ? unref(i18n).baseText("credentialEdit.credentialEdit.testing") : unref(i18n).baseText("credentialEdit.credentialEdit.saving"),
							"data-test-id": "credential-save-button",
							onClick: saveCredential
						}, null, 8, [
							"class",
							"disabled",
							"variant",
							"is-saving",
							"saved",
							"saving-label"
						])) : createCommentVNode("", true),
						unref(currentCredential) && !modalOptions.value?.destination && unref(credentialPermissions).delete && (!unref(isResolvable) || unref(credentialPermissions).createEndUser) ? (openBlock(), createBlock(unref(N8nIconButton_default), {
							key: 2,
							variant: "outline",
							title: unref(i18n).baseText("credentialEdit.credentialEdit.delete"),
							icon: "trash-2",
							disabled: unref(isSaving),
							loading: isDeleting.value,
							"data-test-id": "credential-delete-button",
							onClick: deleteCredential
						}, null, 8, [
							"title",
							"disabled",
							"loading"
						])) : createCommentVNode("", true),
						createVNode(unref(DialogClose_default), { "as-child": "" }, {
							default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
								variant: "ghost",
								icon: "x",
								"aria-label": unref(i18n).baseText("generic.close"),
								"data-test-id": "dialog-close-button"
							}, null, 8, ["aria-label"])]),
							_: 1
						})
					], 2)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true), createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createBaseVNode("div", {
						class: normalizeClass(_ctx.$style.credentialDialog),
						"data-test-id": "editCredential-modal"
					}, [!loading.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.container),
						"data-test-id": "credential-edit-dialog"
					}, [unref(credentialDescriptionsEnabled) || !unref(isEditingManagedCredential) ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.sidebar)
					}, [(openBlock(true), createElementBlock(Fragment, null, renderList(sidebarItems.value, (item) => {
						return openBlock(), createBlock(unref(N8nMenuItem_default), {
							key: item.id,
							item,
							active: activeTab.value === item.id,
							onClick: () => onTabSelect(item.id)
						}, null, 8, [
							"item",
							"active",
							"onClick"
						]);
					}), 128))], 2)) : createCommentVNode("", true), activeTab.value === "connection" && unref(credentialType) ? (openBlock(), createElementBlock("div", {
						key: 1,
						ref_key: "contentRef",
						ref: contentRef,
						class: normalizeClass(_ctx.$style.mainContent)
					}, [
						modalOptions.value?.destination ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							tag: "p"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(homeProject)?.name ?? (modalOptions.value.destination.kind === "pending" ? modalOptions.value.destination.name : "")), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						modalOptions.value?.notice ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 1,
							theme: "info"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(modalOptions.value.notice()), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						savedCredentialNeedsLoad.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 2,
							theme: "warning"
						}, {
							actions: withCtx(() => [createVNode(unref(N8nButton_default), {
								disabled: unref(isSaving),
								onClick: retrySavedCredentialLoad
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
								_: 1
							}, 8, ["disabled"])]),
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.savedLoadFailed")) + " ", 1)]),
							_: 1
						})) : createCommentVNode("", true),
						unref(credentialTypeRestriction) ? (openBlock(), createBlock(unref(RestrictedTypeCallout_default), {
							key: 3,
							surface: "credential",
							"type-name": unref(credentialType).displayName,
							restriction: unref(credentialTypeRestriction)
						}, null, 8, ["type-name", "restriction"])) : createCommentVNode("", true),
						createVNode(CredentialConfig_default, {
							"credential-type": unref(credentialType),
							"credential-properties": unref(credentialProperties),
							"credential-data": unref(credentialData),
							"credential-id": unref(credentialId),
							"n8n-project-id": unref(homeProject)?.id,
							"is-instance-credential": isInstanceCredential.value,
							"is-managed": unref(isEditingManagedCredential),
							"show-validation-warning": unref(showValidationWarning),
							"auth-error": unref(authError),
							"tested-successfully": unref(testedSuccessfully),
							"is-o-auth-type": unref(isOAuthType),
							"is-o-auth-connected": unref(isOAuthConnected),
							"is-retesting": unref(isRetesting),
							"parent-types": unref(parentTypes),
							"required-properties-filled": unref(requiredPropertiesFilled),
							"credential-permissions": unref(credentialPermissions),
							mode: __props.mode,
							"selected-credential": unref(selectedCredential),
							"is-private-credentials-enabled": unref(isPrivateCredentialsEnabled) && !isInstanceCredential.value && !modalOptions.value?.destination,
							"is-resolvable": unref(isResolvable),
							"connected-by-me": unref(connectedByMe),
							"connected-account-identifier": unref(connectedAccountIdentifier),
							"is-new-credential": unref(isNewCredential),
							"new-credential-project-type": unref(homeProject)?.type,
							"managed-oauth-available": unref(managedOAuthAvailable),
							"use-custom-oauth": unref(useCustomOAuth),
							"is-quick-connect-mode": isQuickConnectMode.value,
							"context-node": contextNode.value,
							"show-ai-gateway-error-nudge": showAiGatewayErrorNudge.value,
							"ai-gateway-credits-are-free": unref(aiGateway).creditsLabelKey.value === "generic.freeCredits",
							"fixed-credentials-only": modalOptions.value?.fixedCredentialsOnly,
							"hide-ask-assistant": hideAskAssistant.value,
							"instance-ai-credential-help": instanceAiCredentialHelp.value,
							onUpdate: onDataChange,
							onOauth: oAuthCredentialAuthorize,
							onDisconnect: onDisconnectMyConnection,
							onQuickConnect,
							onRetest: unref(retestCredential),
							onScrollToTop: scrollToTop,
							onAuthTypeChanged,
							onClaimed: closeDialog,
							onUseGatewayCredits: useGatewayCredits,
							"onUpdate:isResolvable": onResolvableChange
						}, null, 8, [
							"credential-type",
							"credential-properties",
							"credential-data",
							"credential-id",
							"n8n-project-id",
							"is-instance-credential",
							"is-managed",
							"show-validation-warning",
							"auth-error",
							"tested-successfully",
							"is-o-auth-type",
							"is-o-auth-connected",
							"is-retesting",
							"parent-types",
							"required-properties-filled",
							"credential-permissions",
							"mode",
							"selected-credential",
							"is-private-credentials-enabled",
							"is-resolvable",
							"connected-by-me",
							"connected-account-identifier",
							"is-new-credential",
							"new-credential-project-type",
							"managed-oauth-available",
							"use-custom-oauth",
							"is-quick-connect-mode",
							"context-node",
							"show-ai-gateway-error-nudge",
							"ai-gateway-credits-are-free",
							"fixed-credentials-only",
							"hide-ask-assistant",
							"instance-ai-credential-help",
							"onRetest"
						])
					], 2)) : showSharingContent.value ? (openBlock(), createElementBlock("div", {
						key: 2,
						class: normalizeClass(_ctx.$style.mainContent)
					}, [createVNode(CredentialSharing_ee_default, {
						credential: unref(currentCredential),
						"credential-data": unref(credentialData),
						"credential-id": unref(credentialId),
						"credential-permissions": unref(credentialPermissions),
						"is-shared-globally": isSharedGlobally.value,
						"modal-bus": modalBus.value,
						"onUpdate:modelValue": onChangeSharedWith,
						"onUpdate:shareWithAllUsers": onShareWithAllUsersUpdate
					}, null, 8, [
						"credential",
						"credential-data",
						"credential-id",
						"credential-permissions",
						"is-shared-globally",
						"modal-bus"
					])], 2)) : activeTab.value === "details" && unref(credentialType) ? (openBlock(), createElementBlock("div", {
						key: 3,
						class: normalizeClass(_ctx.$style.mainContent)
					}, [createVNode(CredentialInfo_default, {
						"current-credential": unref(currentCredential),
						description: credentialDescription.value,
						readonly: !canEditDescription.value,
						"onUpdate:description": onDescriptionEdit
					}, null, 8, [
						"current-credential",
						"description",
						"readonly"
					])], 2)) : createCommentVNode("", true)], 2)) : (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.loader)
					}, [createVNode(unref(N8nSpinner_default))], 2))], 2)]),
					_: 1
				})]),
				_: 1
			}, 8, [
				"open",
				"stacked",
				"show-close-button",
				"container-class",
				"aria-label"
			]), typeToConfirmDialog.value ? (openBlock(), createBlock(TypeToConfirmDialog_default, {
				key: 0,
				open: typeToConfirmDialog.value.open,
				title: typeToConfirmDialog.value.title,
				message: typeToConfirmDialog.value.message,
				"confirm-label": typeToConfirmDialog.value.confirmLabel,
				"confirm-keyword": typeToConfirmDialog.value.keyword,
				loading: isDeleting.value,
				onConfirm: _cache[0] || (_cache[0] = ($event) => resolveTypeToConfirm(true)),
				"onUpdate:open": _cache[1] || (_cache[1] = (open) => !open && resolveTypeToConfirm(false))
			}, null, 8, [
				"open",
				"title",
				"message",
				"confirm-label",
				"confirm-keyword",
				"loading"
			])) : createCommentVNode("", true)]);
		};
	}
}), [["__cssModules", { "$style": {
	credentialDialog: "_credentialDialog_fjqp3_1",
	mainContent: "_mainContent_fjqp3_9",
	credName: "_credName_fjqp3_16",
	credNameRow: "_credNameRow_fjqp3_23",
	dynamicTag: "_dynamicTag_fjqp3_30",
	sidebar: "_sidebar_fjqp3_35",
	dialogShell: "_dialogShell_fjqp3_48",
	header: "_header_fjqp3_62",
	container: "_container_fjqp3_71",
	credInfo: "_credInfo_fjqp3_77",
	credActions: "_credActions_fjqp3_84",
	loader: "_loader_fjqp3_92",
	credIcon: "_credIcon_fjqp3_100",
	saveButton: "_saveButton_fjqp3_106"
} }]]);
//#endregion
export { CredentialEdit_default as default };
