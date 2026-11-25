import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $v as SECURITY_INDUSTRY, AM as createFormEventBus, Av as PHYSICAL_RETAIL_OR_SERVICES, B_ as COMPANY_SIZE_1000_OR_MORE, Bv as REPORTED_SOURCE_TWITTER, Cv as MEDIA_INDUSTRY, Dv as OTHER_INDUSTRY_OPTION, Ev as OTHER_COMPANY_TYPE, F_ as AUTOMATION_BENEFICIARY_KEY, Fv as REPORTED_SOURCE_KEY, GA as DialogDescription_default, G_ as COMPANY_SIZE_PERSONAL_USE, Gv as ROLE_DEVOPS, H_ as COMPANY_SIZE_20_99, Hv as ROLE_BUSINESS_OWNER, I_ as AUTOMATION_BENEFICIARY_MY_TEAM, Iv as REPORTED_SOURCE_LINKEDIN, J_ as DEVOPS_AUTOMATION_CI_CD_GOAL, Jg as useUIStore, Jv as ROLE_OTHER, KA as Dialog_default, K_ as COMPANY_TYPE_KEY, Kv as ROLE_ENGINEERING, L_ as AUTOMATION_BENEFICIARY_OTHER_TEAMS, Lv as REPORTED_SOURCE_OTHER, Mv as REPORTED_SOURCE_EVENT, Nc as isInstanceAiChatRoute, Nv as REPORTED_SOURCE_FRIEND, Ov as OTHER_MARKETING_AUTOMATION_GOAL_KEY, Pv as REPORTED_SOURCE_GOOGLE, Q_ as DEVOPS_AUTOMATION_GOAL_OTHER_KEY, Qv as SAAS_COMPANY_TYPE, R_ as AUTOMATION_BENEFICIARY_SELF, Rv as REPORTED_SOURCE_OTHER_KEY, SN as _plugin_vue_export_helper_default, Sv as MARKETING_INDUSTRY, Tv as OTHER_COMPANY_INDUSTRY_EXTENDED_KEY, UA as DialogFooter_default, U_ as COMPANY_SIZE_500_999, Uv as ROLE_CUSTOMER_SUPPORT, V_ as COMPANY_SIZE_100_499, Vv as REPORTED_SOURCE_YOUTUBE, WA as DialogBody_default, W_ as COMPANY_SIZE_KEY, Wv as ROLE_DATA_SCIENCE, X_ as DEVOPS_AUTOMATION_DATA_SYNCING_GOAL, Xv as ROLE_SALES_AND_MARKETING, Y_ as DEVOPS_AUTOMATION_CLOUD_INFRASTRUCTURE_ORCHESTRATION_GOAL, Yv as ROLE_OTHER_KEY, Z_ as DEVOPS_AUTOMATION_GOAL_KEY, Zv as ROLE_SECURITY, _C as useUsersStore, _v as MARKETING_AUTOMATION_DATA_SYNCHING, av as ECOMMERCE_COMPANY_TYPE, bC as useRootStore, bv as MARKETING_AUTOMATION_OTHER, cv as GOVERNMENT_INDUSTRY, dC as useToast, dv as IT_INDUSTRY, ev as DEVOPS_INCIDENT_RESPONSE_GOAL, ey as SYSTEMS_INTEGRATOR_COMPANY_TYPE, fC as VIEWS, fv as LEGAL_INDUSTRY, gv as MARKETING_AUTOMATION_CUSTOMER_COMMUNICATION, hv as MARKETING_AUTOMATION_AD_CAMPAIGN, iv as DIGITAL_AGENCY_COMPANY_TYPE, jN as useI18n, jv as REAL_ESTATE_OR_CONSTRUCTION, kv as PERSONAL_COMPANY_TYPE, lM as N8nFormInputs_default, lv as HEALTHCARE_INDUSTRY, mv as MARKETING_AUTOMATION_ACTIONS, nD as getResourcePermissions, nv as DEVOPS_REPORTING_GOAL, ov as EDUCATION_TYPE, pv as MANUFACTURING_INDUSTRY, qv as ROLE_KEY, rv as DEVOPS_TICKETING_SYSTEMS_INTEGRATIONS_GOAL, sv as FINANCE_INSURANCE_INDUSTRY, tv as DEVOPS_MONITORING_AND_ALERTING_GOAL, ty as TELECOMS_INDUSTRY, vC as PERSONALIZATION_MODAL_KEY, v_ as COMMUNITY_PLUS_ENROLLMENT_MODAL, vd as useExternalHooks, vv as MARKETING_AUTOMATION_GOAL_KEY, vy as usePostHog, wv as OTHER_AUTOMATION_GOAL, xv as MARKETING_AUTOMATION_REPORTING, yC as useSettingsStore, yN as N8nButton_default, yv as MARKETING_AUTOMATION_LEAD_GENERATION_GOAL, z_ as COMPANY_INDUSTRY_EXTENDED_KEY, zv as REPORTED_SOURCE_PODCAST } from "./app-D5flEmb-.js";
//#region src/features/settings/users/components/PersonalizationModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var SURVEY_VERSION = "v4";
var PersonalizationModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "PersonalizationModal",
	setup(__props) {
		const externalHooks = useExternalHooks();
		const formBus = createFormEventBus();
		const { showError } = useToast();
		const i18n = useI18n();
		const rootStore = useRootStore();
		const usersStore = useUsersStore();
		const settingsStore = useSettingsStore();
		const posthogStore = usePostHog();
		const route = useRoute();
		const router = useRouter();
		const uiStore = useUIStore();
		const modalOpen = computed(() => uiStore.modalsById[PERSONALIZATION_MODAL_KEY]?.open === true);
		const formValues = ref({});
		const isSaving = ref(false);
		const userPermissions = computed(() => getResourcePermissions(usersStore.currentUser?.globalScopes));
		const survey = computed(() => [
			{
				name: COMPANY_TYPE_KEY,
				properties: {
					label: i18n.baseText("personalizationModal.whatBestDescribesYourCompany"),
					type: "select",
					placeholder: i18n.baseText("personalizationModal.select"),
					options: [
						{
							label: i18n.baseText("personalizationModal.saas"),
							value: SAAS_COMPANY_TYPE
						},
						{
							label: i18n.baseText("personalizationModal.eCommerce"),
							value: ECOMMERCE_COMPANY_TYPE
						},
						{
							label: i18n.baseText("personalizationModal.digitalAgencyOrConsultant"),
							value: DIGITAL_AGENCY_COMPANY_TYPE
						},
						{
							label: i18n.baseText("personalizationModal.systemsIntegrator"),
							value: SYSTEMS_INTEGRATOR_COMPANY_TYPE
						},
						{
							value: EDUCATION_TYPE,
							label: i18n.baseText("personalizationModal.education")
						},
						{
							label: i18n.baseText("personalizationModal.other"),
							value: OTHER_COMPANY_TYPE
						},
						{
							label: i18n.baseText("personalizationModal.imNotUsingN8nForWork"),
							value: PERSONAL_COMPANY_TYPE
						}
					]
				}
			},
			{
				name: COMPANY_INDUSTRY_EXTENDED_KEY,
				properties: {
					type: "multi-select",
					label: i18n.baseText("personalizationModal.whichIndustriesIsYourCompanyIn"),
					placeholder: i18n.baseText("personalizationModal.select"),
					options: [
						{
							value: FINANCE_INSURANCE_INDUSTRY,
							label: i18n.baseText("personalizationModal.financeOrInsurance")
						},
						{
							value: GOVERNMENT_INDUSTRY,
							label: i18n.baseText("personalizationModal.government")
						},
						{
							value: HEALTHCARE_INDUSTRY,
							label: i18n.baseText("personalizationModal.healthcare")
						},
						{
							value: IT_INDUSTRY,
							label: i18n.baseText("personalizationModal.it")
						},
						{
							value: LEGAL_INDUSTRY,
							label: i18n.baseText("personalizationModal.legal")
						},
						{
							value: "msp",
							label: i18n.baseText("personalizationModal.managedServiceProvider")
						},
						{
							value: MARKETING_INDUSTRY,
							label: i18n.baseText("personalizationModal.marketing")
						},
						{
							value: MEDIA_INDUSTRY,
							label: i18n.baseText("personalizationModal.media")
						},
						{
							value: MANUFACTURING_INDUSTRY,
							label: i18n.baseText("personalizationModal.manufacturing")
						},
						{
							value: PHYSICAL_RETAIL_OR_SERVICES,
							label: i18n.baseText("personalizationModal.physicalRetailOrServices")
						},
						{
							value: REAL_ESTATE_OR_CONSTRUCTION,
							label: i18n.baseText("personalizationModal.realEstateOrConstruction")
						},
						{
							value: SECURITY_INDUSTRY,
							label: i18n.baseText("personalizationModal.security")
						},
						{
							value: TELECOMS_INDUSTRY,
							label: i18n.baseText("personalizationModal.telecoms")
						},
						{
							value: OTHER_INDUSTRY_OPTION,
							label: i18n.baseText("personalizationModal.otherPleaseSpecify")
						}
					]
				},
				shouldDisplay(values) {
					return values[COMPANY_TYPE_KEY] === OTHER_COMPANY_TYPE;
				}
			},
			{
				name: OTHER_COMPANY_INDUSTRY_EXTENDED_KEY,
				properties: { placeholder: i18n.baseText("personalizationModal.specifyYourCompanysIndustry") },
				shouldDisplay(values) {
					const companyType = values[COMPANY_TYPE_KEY];
					const companyIndustry = values[COMPANY_INDUSTRY_EXTENDED_KEY];
					return companyType === "other" && !!companyIndustry && companyIndustry.includes("other");
				}
			},
			{
				name: ROLE_KEY,
				properties: {
					type: "select",
					label: i18n.baseText("personalizationModal.whichRoleBestDescribesYou"),
					placeholder: i18n.baseText("personalizationModal.select"),
					options: [
						{
							value: ROLE_BUSINESS_OWNER,
							label: i18n.baseText("personalizationModal.businessOwner")
						},
						{
							value: ROLE_CUSTOMER_SUPPORT,
							label: i18n.baseText("personalizationModal.customerSupport")
						},
						{
							value: ROLE_DATA_SCIENCE,
							label: i18n.baseText("personalizationModal.dataScience")
						},
						{
							value: ROLE_DEVOPS,
							label: i18n.baseText("personalizationModal.devops")
						},
						{
							value: "it",
							label: i18n.baseText("personalizationModal.it")
						},
						{
							value: ROLE_ENGINEERING,
							label: i18n.baseText("personalizationModal.engineering")
						},
						{
							value: ROLE_SALES_AND_MARKETING,
							label: i18n.baseText("personalizationModal.salesAndMarketing")
						},
						{
							value: ROLE_SECURITY,
							label: i18n.baseText("personalizationModal.security")
						},
						{
							value: ROLE_OTHER,
							label: i18n.baseText("personalizationModal.otherPleaseSpecify")
						}
					]
				},
				shouldDisplay(values) {
					return values[COMPANY_TYPE_KEY] !== PERSONAL_COMPANY_TYPE;
				}
			},
			{
				name: ROLE_OTHER_KEY,
				properties: { placeholder: i18n.baseText("personalizationModal.specifyYourRole") },
				shouldDisplay(values) {
					const companyType = values[COMPANY_TYPE_KEY];
					const role = values[ROLE_KEY];
					return companyType !== "personal" && role === "other";
				}
			},
			{
				name: DEVOPS_AUTOMATION_GOAL_KEY,
				properties: {
					type: "multi-select",
					label: i18n.baseText("personalizationModal.whatAreYouLookingToAutomate"),
					placeholder: i18n.baseText("personalizationModal.select"),
					options: [
						{
							value: DEVOPS_AUTOMATION_CI_CD_GOAL,
							label: i18n.baseText("personalizationModal.cicd")
						},
						{
							value: DEVOPS_AUTOMATION_CLOUD_INFRASTRUCTURE_ORCHESTRATION_GOAL,
							label: i18n.baseText("personalizationModal.cloudInfrastructureOrchestration")
						},
						{
							value: DEVOPS_AUTOMATION_DATA_SYNCING_GOAL,
							label: i18n.baseText("personalizationModal.dataSynching")
						},
						{
							value: DEVOPS_INCIDENT_RESPONSE_GOAL,
							label: i18n.baseText("personalizationModal.incidentResponse")
						},
						{
							value: DEVOPS_MONITORING_AND_ALERTING_GOAL,
							label: i18n.baseText("personalizationModal.monitoringAndAlerting")
						},
						{
							value: DEVOPS_REPORTING_GOAL,
							label: i18n.baseText("personalizationModal.reporting")
						},
						{
							value: DEVOPS_TICKETING_SYSTEMS_INTEGRATIONS_GOAL,
							label: i18n.baseText("personalizationModal.ticketingSystemsIntegrations")
						},
						{
							value: OTHER_AUTOMATION_GOAL,
							label: i18n.baseText("personalizationModal.other")
						}
					]
				},
				shouldDisplay(values) {
					const companyType = values[COMPANY_TYPE_KEY];
					const role = values[ROLE_KEY];
					return companyType !== "personal" && [
						"devops",
						"engineering",
						"it"
					].includes(role);
				}
			},
			{
				name: DEVOPS_AUTOMATION_GOAL_OTHER_KEY,
				properties: { placeholder: i18n.baseText("personalizationModal.specifyYourAutomationGoal") },
				shouldDisplay(values) {
					const companyType = values[COMPANY_TYPE_KEY];
					const goals = values[DEVOPS_AUTOMATION_GOAL_KEY];
					const role = values[ROLE_KEY];
					return companyType !== "personal" && [
						"devops",
						"engineering",
						"it"
					].includes(role) && !!goals && goals.includes("other");
				}
			},
			{
				name: MARKETING_AUTOMATION_GOAL_KEY,
				properties: {
					type: "multi-select",
					label: i18n.baseText("personalizationModal.specifySalesMarketingGoal"),
					placeholder: i18n.baseText("personalizationModal.select"),
					options: [
						{
							label: i18n.baseText("personalizationModal.leadGeneration"),
							value: MARKETING_AUTOMATION_LEAD_GENERATION_GOAL
						},
						{
							label: i18n.baseText("personalizationModal.customerCommunication"),
							value: MARKETING_AUTOMATION_CUSTOMER_COMMUNICATION
						},
						{
							label: i18n.baseText("personalizationModal.customerActions"),
							value: MARKETING_AUTOMATION_ACTIONS
						},
						{
							label: i18n.baseText("personalizationModal.adCampaign"),
							value: MARKETING_AUTOMATION_AD_CAMPAIGN
						},
						{
							label: i18n.baseText("personalizationModal.reporting"),
							value: MARKETING_AUTOMATION_REPORTING
						},
						{
							label: i18n.baseText("personalizationModal.dataSynching"),
							value: MARKETING_AUTOMATION_DATA_SYNCHING
						},
						{
							label: i18n.baseText("personalizationModal.other"),
							value: MARKETING_AUTOMATION_OTHER
						}
					]
				},
				shouldDisplay(values) {
					const companyType = values[COMPANY_TYPE_KEY];
					const role = values[ROLE_KEY];
					return companyType !== "personal" && role === "sales-and-marketing";
				}
			},
			{
				name: OTHER_MARKETING_AUTOMATION_GOAL_KEY,
				properties: { placeholder: i18n.baseText("personalizationModal.specifyOtherSalesAndMarketingGoal") },
				shouldDisplay(values) {
					const companyType = values[COMPANY_TYPE_KEY];
					const goals = values[MARKETING_AUTOMATION_GOAL_KEY];
					const role = values[ROLE_KEY];
					return companyType !== "personal" && role === "sales-and-marketing" && !!goals && goals.includes("other");
				}
			},
			{
				name: AUTOMATION_BENEFICIARY_KEY,
				properties: {
					type: "select",
					label: i18n.baseText("personalizationModal.specifyAutomationBeneficiary"),
					placeholder: i18n.baseText("personalizationModal.select"),
					options: [
						{
							label: i18n.baseText("personalizationModal.myself"),
							value: AUTOMATION_BENEFICIARY_SELF
						},
						{
							label: i18n.baseText("personalizationModal.myTeam"),
							value: AUTOMATION_BENEFICIARY_MY_TEAM
						},
						{
							label: i18n.baseText("personalizationModal.otherTeams"),
							value: AUTOMATION_BENEFICIARY_OTHER_TEAMS
						}
					]
				},
				shouldDisplay(values) {
					return values[COMPANY_TYPE_KEY] !== PERSONAL_COMPANY_TYPE;
				}
			},
			{
				name: COMPANY_SIZE_KEY,
				properties: {
					type: "select",
					label: i18n.baseText("personalizationModal.howBigIsYourCompany"),
					placeholder: i18n.baseText("personalizationModal.select"),
					options: [
						{
							label: i18n.baseText("personalizationModal.lessThan20People"),
							value: "<20"
						},
						{
							label: `20-99 ${i18n.baseText("personalizationModal.people")}`,
							value: COMPANY_SIZE_20_99
						},
						{
							label: `100-499 ${i18n.baseText("personalizationModal.people")}`,
							value: COMPANY_SIZE_100_499
						},
						{
							label: `500-999 ${i18n.baseText("personalizationModal.people")}`,
							value: COMPANY_SIZE_500_999
						},
						{
							label: `1000+ ${i18n.baseText("personalizationModal.people")}`,
							value: COMPANY_SIZE_1000_OR_MORE
						},
						{
							label: i18n.baseText("personalizationModal.imNotUsingN8nForWork"),
							value: COMPANY_SIZE_PERSONAL_USE
						}
					]
				},
				shouldDisplay(values) {
					return values[COMPANY_TYPE_KEY] !== PERSONAL_COMPANY_TYPE;
				}
			},
			{
				name: REPORTED_SOURCE_KEY,
				properties: {
					type: "select",
					label: i18n.baseText("personalizationModal.howDidYouHearAboutN8n"),
					placeholder: i18n.baseText("personalizationModal.select"),
					options: [
						{
							label: "Google",
							value: REPORTED_SOURCE_GOOGLE
						},
						{
							label: "Twitter",
							value: REPORTED_SOURCE_TWITTER
						},
						{
							label: "LinkedIn",
							value: REPORTED_SOURCE_LINKEDIN
						},
						{
							label: "YouTube",
							value: REPORTED_SOURCE_YOUTUBE
						},
						{
							label: "ChatGPT / LLM",
							value: "llm"
						},
						{
							label: i18n.baseText("personalizationModal.friendWordOfMouth"),
							value: REPORTED_SOURCE_FRIEND
						},
						{
							label: i18n.baseText("personalizationModal.podcast"),
							value: REPORTED_SOURCE_PODCAST
						},
						{
							label: i18n.baseText("personalizationModal.event"),
							value: REPORTED_SOURCE_EVENT
						},
						{
							label: i18n.baseText("personalizationModal.otherPleaseSpecify"),
							value: REPORTED_SOURCE_OTHER
						}
					]
				}
			},
			{
				name: REPORTED_SOURCE_OTHER_KEY,
				properties: { placeholder: i18n.baseText("personalizationModal.specifyReportedSource") },
				shouldDisplay(values) {
					return values[REPORTED_SOURCE_KEY] === REPORTED_SOURCE_OTHER;
				}
			}
		]);
		const onSave = () => {
			formBus.emit("submit");
		};
		const closeCallback = () => {
			if (route.name !== VIEWS.HOMEPAGE && !isInstanceAiChatRoute(route.name)) router.replace({ name: VIEWS.HOMEPAGE });
		};
		const closeDialog = () => {
			if (uiStore.modalsById["personalization"]?.open !== true) return;
			uiStore.closeModal(PERSONALIZATION_MODAL_KEY);
			if (settingsStore.deploymentType === "default" && userPermissions.value.community.register) uiStore.openModalWithData({
				name: COMMUNITY_PLUS_ENROLLMENT_MODAL,
				data: {
					closeCallback,
					customHeading: void 0
				}
			});
			else closeCallback();
		};
		function onDialogOpenUpdate(open) {
			if (!open) closeDialog();
		}
		const onSubmit = async (values) => {
			isSaving.value = true;
			try {
				const completedSurvey = {
					...values,
					version: SURVEY_VERSION,
					personalization_survey_submitted_at: (/* @__PURE__ */ new Date()).toISOString(),
					personalization_survey_n8n_version: rootStore.versionCli
				};
				await externalHooks.run("personalizationModal.onSubmit", completedSurvey);
				await usersStore.submitPersonalizationSurvey(completedSurvey);
				posthogStore.setMetadata(completedSurvey, "user");
			} catch (e) {
				showError(e, "Error while submitting results");
			} finally {
				isSaving.value = false;
				closeDialog();
			}
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: modalOpen.value,
				size: "medium",
				header: unref(i18n).baseText("personalizationModal.customizeN8n"),
				"show-close-button": false,
				"close-on-overlay-click": false,
				"close-on-escape": false,
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), { "data-test-id": `${unref(PERSONALIZATION_MODAL_KEY)}-modal` }, {
					default: withCtx(() => [createVNode(unref(DialogDescription_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("personalizationModal.theseQuestionsHelpUs")), 1)]),
						_: 1
					}), createBaseVNode("div", {
						class: normalizeClass(_ctx.$style.container),
						"data-test-id": "personalization-form"
					}, [createVNode(unref(N8nFormInputs_default), {
						modelValue: formValues.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => formValues.value = $event),
						inputs: survey.value,
						"column-view": true,
						"event-bus": unref(formBus),
						teleported: false,
						"tag-size": "small",
						onSubmit
					}, null, 8, [
						"modelValue",
						"inputs",
						"event-bus"
					])], 2)]),
					_: 1
				}, 8, ["data-test-id"]), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						loading: isSaving.value,
						label: unref(i18n).baseText("personalizationModal.getStarted"),
						float: "right",
						onClick: onSave
					}, null, 8, ["loading", "label"])]),
					_: 1
				})]),
				_: 1
			}, 8, ["open", "header"]);
		};
	}
}), [["__cssModules", { "$style": { container: "_container_2zzx1_1" } }]]);
//#endregion
export { PersonalizationModal_default as default };
