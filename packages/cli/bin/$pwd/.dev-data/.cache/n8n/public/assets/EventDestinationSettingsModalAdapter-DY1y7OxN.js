import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Aa as require_isEqual, Bd as createBlock, Br as require_unset, Cf as useTemplateRef, Df as withCtx, Eo as require_get, Gd as createTextVNode, Gf as toRaw, Hd as createElementBlock, Hr as require_set, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Pu as useElementSize, Rd as computed, Sp as toDisplayString, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, of as onBeforeUnmount, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $A as N8nInlineTextEdit_default, GO as defaultMessageEventBusDestinationOptions, HO as MessageEventBusDestinationSyslogOptionsSchema, Ik as deepCopy, JO as defaultMessageEventBusDestinationWebhookOptions, Jg as useUIStore, Jp as useNDVStore, KO as defaultMessageEventBusDestinationSentryOptions, PA as useMessage, SN as _plugin_vue_export_helper_default, Sn as ParameterInputList_default, UO as MessageEventBusDestinationTypeNames, VO as MessageEventBusDestinationSentryOptionsSchema, WO as MessageEventBusDestinationWebhookOptionsSchema, YO as messageEventBusDestinationTypeNames, Yj as N8nMenuItem_default, _M as Checkbox_default, _N as N8nText_default, ak as LOGSTREAMING_CB_DEFAULT_FAILURE_WINDOW_MS, bC as useRootStore, dC as useToast, ef as provideWorkflowDocumentStore, fN as N8nTooltip_default, gM as N8nInputLabel_default, hC as useTelemetry, jM as createEventBus, jN as useI18n, mM as N8nOption_default, mk as getNodeParametersIssues, pM as N8nSelect_default, qO as defaultMessageEventBusDestinationSyslogOptions, vN as N8nIconButton_default, xN as N8nIcon_default, xm as hasPermission, y as LOG_STREAM_MODAL_KEY, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { t as SaveButton_default } from "./SaveButton-B2zcJp0p.js";
import { t as useLogStreamingStore } from "./logStreaming.store-83whA4Mu.js";
//#region src/features/integrations/logStreaming.ee/logStreaming.utils.ts
var import_get = /* @__PURE__ */ __toESM(require_get(), 1);
var import_isEqual = /* @__PURE__ */ __toESM(require_isEqual(), 1);
var import_set = /* @__PURE__ */ __toESM(require_set(), 1);
var import_unset = /* @__PURE__ */ __toESM(require_unset(), 1);
function destinationToFakeINodeUi(destination, fakeType = "n8n-nodes-base.stickyNote") {
	return {
		id: destination.id,
		name: destination.id,
		typeVersion: 1,
		type: fakeType,
		position: [0, 0],
		credentials: { ...destination.credentials },
		parameters: { ...destination }
	};
}
/** Whether a log streaming destination has all required fields filled in (telemetry only). */
function isDestinationComplete(options) {
	const webhook = MessageEventBusDestinationWebhookOptionsSchema.safeParse(options);
	if (webhook.success) return webhook.data.url !== "";
	const sentry = MessageEventBusDestinationSentryOptionsSchema.safeParse(options);
	if (sentry.success) return sentry.data.dsn !== "";
	const syslog = MessageEventBusDestinationSyslogOptionsSchema.safeParse(options);
	if (syslog.success) return syslog.data.host !== "" && syslog.data.port !== void 0 && syslog.data.protocol !== void 0 && syslog.data.facility !== void 0 && syslog.data.app_name !== "";
	return false;
}
//#endregion
//#region src/features/integrations/logStreaming.ee/components/EventSelection.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var EventSelection_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "EventSelection",
	props: {
		destinationId: { default: "defaultDestinationId" },
		readonly: {
			type: Boolean,
			default: false
		}
	},
	emits: ["input", "change"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const logStreamingStore = useLogStreamingStore();
		const anonymizeAuditMessages = computed(() => logStreamingStore.items[props.destinationId]?.destination.anonymizeAuditMessages);
		function onInput() {
			emit("input");
		}
		function onCheckboxChecked(eventName, checked) {
			logStreamingStore.setSelectedInGroup(props.destinationId, eventName, checked);
		}
		function anonymizeAuditMessagesChanged(value) {
			logStreamingStore.items[props.destinationId].destination.anonymizeAuditMessages = value;
			emit("change", {
				name: "anonymizeAuditMessages",
				node: props.destinationId,
				value
			});
		}
		function groupLabelName(t) {
			return i18n.baseText(`settings.log-streaming.eventGroup.${t}`) ?? t;
		}
		function groupLabelInfo(t) {
			const labelInfo = `settings.log-streaming.eventGroup.${t}.info`;
			const infoText = i18n.baseText(labelInfo);
			if (infoText === labelInfo || infoText === "") return;
			return infoText;
		}
		function eventLabelName(event) {
			const key = `settings.log-streaming.eventName.${event.name}`;
			return i18n.exists(key) ? i18n.baseText(key) : event.label;
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(logStreamingStore).items[__props.destinationId]?.eventGroups, (group) => {
				return openBlock(), createElementBlock("div", {
					key: group.name,
					shadow: "never"
				}, [
					createVNode(unref(Checkbox_default), {
						"model-value": group.selected,
						indeterminate: group.indeterminate,
						disabled: __props.readonly,
						"onUpdate:modelValue": (value) => {
							onInput();
							onCheckboxChecked(group.name, value);
						}
					}, {
						label: withCtx(() => [createBaseVNode("strong", null, toDisplayString(groupLabelName(group.name)), 1), groupLabelInfo(group.name) !== void 0 ? (openBlock(), createBlock(unref(N8nTooltip_default), {
							key: 0,
							placement: "top",
							"content-class": _ctx.$style.tooltipPopper,
							class: "ml-xs"
						}, {
							content: withCtx(() => [createTextVNode(toDisplayString(groupLabelInfo(group.name)), 1)]),
							default: withCtx(() => [createVNode(unref(N8nIcon_default), {
								icon: "circle-help",
								size: "small",
								class: "ml-4xs"
							})]),
							_: 2
						}, 1032, ["content-class"])) : createCommentVNode("", true)]),
						_: 2
					}, 1032, [
						"model-value",
						"indeterminate",
						"disabled",
						"onUpdate:modelValue"
					]),
					group.name === "n8n.audit" ? (openBlock(), createBlock(unref(Checkbox_default), {
						key: 0,
						"model-value": anonymizeAuditMessages.value,
						disabled: __props.readonly,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = (value) => {
							onInput();
							anonymizeAuditMessagesChanged(value);
						})
					}, {
						label: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.log-streaming.tab.events.anonymize")) + " ", 1), createVNode(unref(N8nTooltip_default), {
							placement: "top",
							"content-class": _ctx.$style.tooltipPopper
						}, {
							content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.log-streaming.tab.events.anonymize.info")), 1)]),
							default: withCtx(() => [createVNode(unref(N8nIcon_default), {
								icon: "circle-help",
								size: "small",
								class: "ml-4xs"
							})]),
							_: 1
						}, 8, ["content-class"])]),
						_: 1
					}, 8, ["model-value", "disabled"])) : createCommentVNode("", true),
					createBaseVNode("ul", { class: normalizeClass(_ctx.$style.eventList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(group.children, (event) => {
						return openBlock(), createElementBlock("li", {
							key: event.name,
							class: normalizeClass(`${_ctx.$style.eventListItem}`)
						}, [createVNode(unref(Checkbox_default), {
							"model-value": event.selected || group.selected,
							indeterminate: event.indeterminate,
							disabled: __props.readonly,
							"onUpdate:modelValue": (value) => {
								onInput();
								onCheckboxChecked(event.name, value);
							}
						}, {
							label: withCtx(() => [createTextVNode(toDisplayString(eventLabelName(event)) + " ", 1), createVNode(unref(N8nTooltip_default), {
								placement: "top",
								"content-class": _ctx.$style.tooltipPopper
							}, {
								content: withCtx(() => [createTextVNode(toDisplayString(event.name), 1)]),
								_: 2
							}, 1032, ["content-class"])]),
							_: 2
						}, 1032, [
							"model-value",
							"indeterminate",
							"disabled",
							"onUpdate:modelValue"
						])], 2);
					}), 128))], 2)
				]);
			}), 128))]);
		};
	}
}), [["__cssModules", { "$style": {
	eventListCard: "_eventListCard_o3525_1",
	eventList: "_eventList_o3525_1",
	eventListItem: "_eventListItem_o3525_13",
	eventListItemDisabled: "_eventListItemDisabled_o3525_21",
	listItem: "_listItem_o3525_28"
} }]]);
//#endregion
//#region src/features/integrations/logStreaming.ee/logStreaming.constants.ts
var circuitBreakerOptions = {
	displayName: "Circuit Breaker Options",
	name: "circuitBreaker",
	type: "collection",
	placeholder: "Add Circuit Breaker Option",
	description: "A circuit breaker protects services from cascading failures by monitoring request failures and temporarily blocking requests when failure rates are high. This gives failing services time to recover without being overwhelmed by traffic.",
	default: {},
	options: [{
		displayName: "Max Failures",
		name: "maxFailures",
		type: "number",
		typeOptions: { minValue: 1 },
		default: 5,
		description: "After this many errors within the failure window n8n stops sending requests to prevent overloading the external service that’s not working properly."
	}, {
		displayName: "Failure Window",
		name: "failureWindow",
		type: "number",
		typeOptions: { minValue: 100 },
		default: LOGSTREAMING_CB_DEFAULT_FAILURE_WINDOW_MS,
		description: "Time window in milliseconds for counting failures (sliding window). Only failures within this window are counted toward the threshold. Older failures expire naturally."
	}]
};
var webhookModalDescription = [
	{
		displayName: "Method",
		name: "method",
		noDataExpression: true,
		type: "options",
		options: [
			{
				name: "GET",
				value: "GET"
			},
			{
				name: "POST",
				value: "POST"
			},
			{
				name: "PUT",
				value: "PUT"
			}
		],
		default: "POST",
		description: "The request method to use"
	},
	{
		displayName: "URL",
		name: "url",
		type: "string",
		noDataExpression: true,
		default: "",
		placeholder: "http://example.com/index.html",
		description: "The URL to make the request to"
	},
	{
		displayName: "Generic Auth Type (OAuth not supported yet)",
		name: "genericAuthType",
		type: "credentialsSelect",
		default: "",
		credentialTypes: ["has:genericAuth"],
		displayOptions: { show: { authentication: ["genericCredentialType"] } }
	},
	{
		displayName: "Add Query Parameters",
		name: "sendQuery",
		type: "boolean",
		default: false,
		noDataExpression: true,
		description: "Whether the request has query params or not"
	},
	{
		displayName: "Specify Query Parameters",
		name: "specifyQuery",
		type: "options",
		displayOptions: { show: { sendQuery: [true] } },
		options: [{
			name: "Using Fields Below",
			value: "keypair"
		}, {
			name: "Using JSON",
			value: "json"
		}],
		default: "keypair"
	},
	{
		displayName: "Add Query Parameters",
		name: "queryParameters",
		type: "fixedCollection",
		displayOptions: { show: {
			sendQuery: [true],
			specifyQuery: ["keypair"]
		} },
		typeOptions: { multipleValues: true },
		placeholder: "Add Parameter",
		default: { parameters: [{
			name: "",
			value: ""
		}] },
		options: [{
			name: "parameters",
			displayName: "Parameter",
			values: [{
				displayName: "Name",
				name: "name",
				type: "string",
				default: ""
			}, {
				displayName: "Value",
				name: "value",
				type: "string",
				default: ""
			}]
		}]
	},
	{
		displayName: "JSON",
		name: "jsonQuery",
		type: "json",
		displayOptions: { show: {
			sendQuery: [true],
			specifyQuery: ["json"]
		} },
		default: ""
	},
	{
		displayName: "Add Headers",
		name: "sendHeaders",
		type: "boolean",
		default: false,
		noDataExpression: true,
		description: "Whether the request has headers or not"
	},
	{
		displayName: "Specify Headers",
		name: "specifyHeaders",
		type: "options",
		displayOptions: { show: { sendHeaders: [true] } },
		options: [{
			name: "Using Fields Below",
			value: "keypair"
		}, {
			name: "Using JSON",
			value: "json"
		}],
		default: "keypair"
	},
	{
		displayName: "Header Parameters",
		name: "headerParameters",
		type: "fixedCollection",
		displayOptions: { show: {
			sendHeaders: [true],
			specifyHeaders: ["keypair"]
		} },
		typeOptions: { multipleValues: true },
		placeholder: "Add Parameter",
		default: { parameters: [{
			name: "",
			value: ""
		}] },
		options: [{
			name: "parameters",
			displayName: "Parameter",
			values: [{
				displayName: "Name",
				name: "name",
				type: "string",
				default: ""
			}, {
				displayName: "Value",
				name: "value",
				type: "string",
				default: ""
			}]
		}]
	},
	{
		displayName: "JSON",
		name: "jsonHeaders",
		type: "json",
		displayOptions: { show: {
			sendHeaders: [true],
			specifyHeaders: ["json"]
		} },
		default: ""
	},
	{
		displayName: "Options",
		name: "options",
		type: "collection",
		placeholder: "Add Option",
		default: {},
		options: [
			{
				displayName: "Ignore SSL Issues (Insecure)",
				name: "allowUnauthorizedCerts",
				type: "boolean",
				noDataExpression: true,
				default: false,
				description: "Whether to ignore SSL certificate validation"
			},
			{
				displayName: "Array Format in Query Parameters",
				name: "queryParameterArrays",
				type: "options",
				displayOptions: { show: { "/sendQuery": [true] } },
				options: [
					{
						name: "No Brackets",
						value: "repeat",
						description: "e.g. foo=bar&foo=qux"
					},
					{
						name: "Brackets Only",
						value: "brackets",
						description: "e.g. foo[]=bar&foo[]=qux"
					},
					{
						name: "Brackets with Indices",
						value: "indices",
						description: "e.g. foo[0]=bar&foo[1]=qux"
					}
				],
				default: "brackets"
			},
			{
				displayName: "Redirects",
				name: "redirect",
				placeholder: "Add Redirect",
				type: "fixedCollection",
				typeOptions: { multipleValues: false },
				default: { redirect: {} },
				options: [{
					displayName: "Redirect",
					name: "redirect",
					values: [{
						displayName: "Follow Redirects",
						name: "followRedirects",
						type: "boolean",
						default: false,
						noDataExpression: true,
						description: "Whether to follow all redirects"
					}, {
						displayName: "Max Redirects",
						name: "maxRedirects",
						type: "number",
						displayOptions: { show: { followRedirects: [true] } },
						default: 21,
						description: "Max number of redirects to follow"
					}]
				}]
			},
			{
				displayName: "Proxy",
				name: "proxy",
				description: "Add Proxy",
				type: "fixedCollection",
				typeOptions: { multipleValues: false },
				default: { proxy: {} },
				options: [{
					displayName: "Proxy",
					name: "proxy",
					values: [
						{
							displayName: "Protocol",
							name: "protocol",
							type: "options",
							default: "https",
							options: [{
								name: "HTTPS",
								value: "https"
							}, {
								name: "HTTP",
								value: "http"
							}]
						},
						{
							displayName: "Host",
							name: "host",
							type: "string",
							default: "127.0.0.1",
							description: "Proxy Host (without protocol or port)"
						},
						{
							displayName: "Port",
							name: "port",
							type: "number",
							default: 9e3,
							description: "Proxy Port"
						}
					]
				}]
			},
			{
				displayName: "Timeout",
				name: "timeout",
				type: "number",
				typeOptions: { minValue: 1 },
				default: 5e3,
				description: "Time in ms to wait for the server to send response headers (and start the response body) before aborting the request"
			},
			{
				displayName: "Socket",
				name: "socket",
				description: "Socket options",
				type: "collection",
				typeOptions: { multipleValues: false },
				default: {
					keepAlive: true,
					maxSockets: 50,
					maxFreeSockets: 5
				},
				options: [
					{
						displayName: "Keep Alive",
						name: "keepAlive",
						type: "boolean",
						default: true,
						noDataExpression: true,
						description: "Whether to keep the sockets available."
					},
					{
						displayName: "Max Sockets",
						name: "maxSockets",
						type: "number",
						typeOptions: { minValue: 1 },
						default: 50,
						description: "Maximum number of sockets per host to keep open at any given time."
					},
					{
						displayName: "Max Free Sockets",
						name: "maxFreeSockets",
						type: "number",
						typeOptions: { minValue: 1 },
						default: 5,
						description: "Maximum number of sockets per host to leave open in a free state."
					}
				]
			}
		]
	},
	circuitBreakerOptions
];
var syslogModalDescription = [
	{
		displayName: "Host",
		name: "host",
		type: "string",
		default: "127.0.0.1",
		placeholder: "127.0.0.1",
		description: "The IP or host name to make the request to",
		noDataExpression: true
	},
	{
		displayName: "Port",
		name: "port",
		type: "number",
		default: "514",
		placeholder: "514",
		description: "The port number to make the request to",
		noDataExpression: true
	},
	{
		displayName: "Protocol",
		name: "protocol",
		type: "options",
		options: [
			{
				name: "TCP",
				value: "tcp"
			},
			{
				name: "UDP",
				value: "udp"
			},
			{
				name: "TLS",
				value: "tls"
			}
		],
		default: "udp",
		description: "The protocol to use for the connection"
	},
	{
		displayName: "TLS CA",
		name: "tlsCa",
		type: "string",
		typeOptions: { rows: 4 },
		displayOptions: { show: { protocol: ["tls"] } },
		required: true,
		default: "",
		description: "The CA certificate to use for TLS connections"
	},
	{
		displayName: "Facility",
		name: "facility",
		type: "options",
		options: [
			{
				name: "Kernel",
				value: 0
			},
			{
				name: "User",
				value: 1
			},
			{
				name: "System",
				value: 3
			},
			{
				name: "Audit",
				value: 13
			},
			{
				name: "Alert",
				value: 14
			},
			{
				name: "Local0",
				value: 16
			},
			{
				name: "Local1",
				value: 17
			},
			{
				name: "Local2",
				value: 18
			},
			{
				name: "Local3",
				value: 19
			},
			{
				name: "Local4",
				value: 20
			},
			{
				name: "Local5",
				value: 21
			},
			{
				name: "Local6",
				value: 22
			},
			{
				name: "Local7",
				value: 23
			}
		],
		default: "16",
		description: "Syslog facility parameter"
	},
	{
		displayName: "App Name",
		name: "app_name",
		type: "string",
		default: "n8n",
		placeholder: "n8n",
		noDataExpression: true,
		description: "Syslog app name parameter"
	},
	circuitBreakerOptions
];
var sentryModalDescription = [{
	displayName: "DSN",
	name: "dsn",
	type: "string",
	default: "https://",
	noDataExpression: true,
	description: "Your Sentry DSN Client Key"
}, circuitBreakerOptions];
//#endregion
//#region src/features/integrations/logStreaming.ee/components/EventDestinationSettingsModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { class: "mt-m text-right" };
var _hoisted_2 = { class: "" };
var EventDestinationSettingsModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	name: "EventDestinationSettingsModal",
	__name: "EventDestinationSettingsModal",
	props: {
		modalName: {},
		destination: { default: () => deepCopy(defaultMessageEventBusDestinationOptions) },
		isNew: {
			type: Boolean,
			default: false
		},
		eventBus: {}
	},
	setup(__props) {
		const { modalName, destination, isNew, eventBus } = __props;
		const i18n = useI18n();
		const { confirm } = useMessage();
		const { showError } = useToast();
		const telemetry = useTelemetry();
		const logStreamingStore = useLogStreamingStore();
		const workflowDocumentStore = provideWorkflowDocumentStore();
		const ndvStore = computed(() => useNDVStore(workflowDocumentStore.value.documentId));
		const uiStore = useUIStore();
		const unchanged = ref(!isNew);
		const activeTab = ref("settings");
		const hasOnceBeenSaved = ref(!isNew);
		const isSaving = ref(false);
		let modalClosed = false;
		onBeforeUnmount(() => {
			modalClosed = true;
		});
		const isDeleting = ref(false);
		const loading = ref(false);
		const typeSelectValue = ref("");
		const typeSelectPlaceholder = ref("Destination Type");
		const nodeParameters = ref(deepCopy(defaultMessageEventBusDestinationOptions));
		const webhookDescription = ref(webhookModalDescription);
		const sentryDescription = ref(sentryModalDescription);
		const syslogDescription = ref(syslogModalDescription);
		const modalBus = ref(createEventBus());
		const headerLabel = ref(destination.label);
		const testMessageSent = ref(false);
		const testMessageResult = ref(false);
		const typeSelectOptions = computed(() => {
			const options = [];
			for (const t of messageEventBusDestinationTypeNames) {
				if (t === MessageEventBusDestinationTypeNames.abstract) continue;
				options.push({
					value: t,
					label: `settings.log-streaming.${t}`
				});
			}
			return options;
		});
		const isTypeAbstract = computed(() => nodeParameters.value.__type === MessageEventBusDestinationTypeNames.abstract);
		const isTypeWebhook = computed(() => nodeParameters.value.__type === MessageEventBusDestinationTypeNames.webhook);
		const isTypeSyslog = computed(() => nodeParameters.value.__type === MessageEventBusDestinationTypeNames.syslog);
		const isTypeSentry = computed(() => nodeParameters.value.__type === MessageEventBusDestinationTypeNames.sentry);
		const node = computed(() => destinationToFakeINodeUi(nodeParameters.value));
		const typeLabelName = computed(() => `settings.log-streaming.${nodeParameters.value.__type}`);
		const sidebarItems = computed(() => {
			const items = [{
				id: "settings",
				label: i18n.baseText("settings.log-streaming.tab.settings"),
				position: "top"
			}];
			if (!isTypeAbstract.value) items.push({
				id: "events",
				label: i18n.baseText("settings.log-streaming.tab.events"),
				position: "top"
			});
			return items;
		});
		const canManageLogStreaming = computed(() => hasPermission(["rbac"], { rbac: { scope: "logStreaming:manage" } }));
		const isFormValid = computed(() => {
			if (isTypeAbstract.value) return false;
			let parameterDescription;
			if (isTypeWebhook.value) parameterDescription = webhookDescription.value;
			else if (isTypeSentry.value) parameterDescription = sentryDescription.value;
			else if (isTypeSyslog.value) parameterDescription = syslogDescription.value;
			else return false;
			return getNodeParametersIssues(parameterDescription, node.value, null) === null;
		});
		const destinationNode = computed(() => workflowDocumentStore.value.getNodeByName(destination.id ?? ""));
		watch(() => Object.keys(destinationNode.value?.credentials ?? {}).length === 0 ? null : destinationNode.value?.credentials, (newCredentials) => {
			unchanged.value = false;
			if (newCredentials) nodeParameters.value.credentials = newCredentials;
			else nodeParameters.value.credentials = {};
		});
		onMounted(() => {
			setupNode(Object.assign(deepCopy(defaultMessageEventBusDestinationOptions), destination));
		});
		function onInput() {
			unchanged.value = false;
			testMessageSent.value = false;
		}
		function onTabSelect(tab) {
			activeTab.value = tab;
		}
		function onLabelChange(value) {
			onInput();
			headerLabel.value = value;
			nodeParameters.value.label = value;
		}
		function setupNode(options) {
			workflowDocumentStore.value.removeNode(node.value);
			ndvStore.value.setActiveNodeName(options.id ?? "thisshouldnothappen", "other");
			workflowDocumentStore.value.addNode(destinationToFakeINodeUi(options));
			nodeParameters.value = options;
			logStreamingStore.items[destination.id].destination = options;
		}
		function onTypeSelectInput(destinationType) {
			typeSelectValue.value = destinationType;
		}
		async function onContinueAddClicked() {
			let newDestination;
			switch (typeSelectValue.value) {
				case MessageEventBusDestinationTypeNames.syslog:
					newDestination = Object.assign(deepCopy(defaultMessageEventBusDestinationSyslogOptions), { id: destination.id });
					break;
				case MessageEventBusDestinationTypeNames.sentry:
					newDestination = Object.assign(deepCopy(defaultMessageEventBusDestinationSentryOptions), { id: destination.id });
					break;
				case MessageEventBusDestinationTypeNames.webhook: newDestination = Object.assign(deepCopy(defaultMessageEventBusDestinationWebhookOptions), { id: destination.id });
			}
			if (newDestination) {
				headerLabel.value = newDestination?.label ?? headerLabel.value;
				setupNode(newDestination);
			}
		}
		function valueChanged(parameterData) {
			unchanged.value = false;
			testMessageSent.value = false;
			const newValue = parameterData.value;
			const parameterPath = parameterData.name?.startsWith("parameters.") ? parameterData.name.split(".").slice(1).join(".") : parameterData.name || "";
			const nodeParametersCopy = deepCopy(nodeParameters.value);
			if (parameterData.value === void 0 && parameterPath.match(/(.*)\[(\d+)\]$/)) {
				const path = parameterPath.match(/(.*)\[(\d+)\]$/)?.[1];
				const index = parseInt(parameterPath.match(/(.*)\[(\d+)\]$/)?.[2] ?? "0", 10);
				const data = (0, import_get.default)(nodeParametersCopy, path);
				if (Array.isArray(data)) {
					data.splice(index, 1);
					nodeParametersCopy[path] = data;
				}
			} else if (newValue === void 0) (0, import_unset.default)(nodeParametersCopy, parameterPath);
			else (0, import_set.default)(nodeParametersCopy, parameterPath, newValue);
			nodeParameters.value = deepCopy(nodeParametersCopy);
			workflowDocumentStore.value.updateNodeProperties({
				name: node.value.name,
				properties: {
					parameters: nodeParameters.value,
					position: [0, 0]
				}
			});
			if (hasOnceBeenSaved.value) logStreamingStore.updateDestination(nodeParameters.value);
		}
		async function sendTestEvent() {
			testMessageResult.value = await logStreamingStore.sendTestMessage(nodeParameters.value);
			testMessageSent.value = true;
		}
		async function removeThis() {
			if (await confirm(i18n.baseText("settings.log-streaming.destinationDelete.message", { interpolate: { destinationName: destination.label } }), i18n.baseText("settings.log-streaming.destinationDelete.headline"), {
				type: "warning",
				confirmButtonText: i18n.baseText("settings.log-streaming.destinationDelete.confirmButtonText"),
				cancelButtonText: i18n.baseText("settings.log-streaming.destinationDelete.cancelButtonText")
			}) !== "confirm") return;
			else {
				callEventBus("remove", destination.id);
				uiStore.closeModal(LOG_STREAM_MODAL_KEY);
				uiStore.markStateClean();
			}
		}
		function onModalClose() {
			modalClosed = true;
			if (!hasOnceBeenSaved.value) {
				workflowDocumentStore.value.removeNode(node.value);
				if (!isSaving.value && nodeParameters.value.id && typeof nodeParameters.value.id !== "object") logStreamingStore.removeDestination(nodeParameters.value.id.toString());
			}
			ndvStore.value.unsetActiveNodeName();
			callEventBus("closing", destination.id);
			uiStore.markStateClean();
		}
		async function saveDestination() {
			if (modalClosed || isSaving.value || unchanged.value || !destination.id || !isFormValid.value) return;
			const submittedParameters = deepCopy(nodeParameters.value);
			const submittedEvents = logStreamingStore.getSelectedEvents(destination.id);
			isSaving.value = true;
			try {
				if (!await logStreamingStore.saveDestination(submittedParameters)) return;
				callEventBus("destinationWasSaved", destination.id);
				if (!modalClosed) {
					hasOnceBeenSaved.value = true;
					testMessageSent.value = false;
					unchanged.value = (0, import_isEqual.default)(nodeParameters.value, submittedParameters) && (0, import_isEqual.default)(logStreamingStore.getSelectedEvents(destination.id), submittedEvents);
					if (unchanged.value) uiStore.markStateClean();
				}
				const destinationType = (submittedParameters.__type && typeof submittedParameters.__type !== "object" ? `${submittedParameters.__type}` : "unknown").replace("$MessageEventBusDestination", "").toLowerCase();
				telemetry.track("User updated log streaming destination", {
					instance_id: useRootStore().instanceId,
					destination_type: destinationType,
					is_complete: isDestinationComplete(submittedParameters),
					is_active: submittedParameters.enabled
				});
			} catch (error) {
				const ownsStoreItem = toRaw(logStreamingStore.items[destination.id]?.destination) === toRaw(nodeParameters.value);
				if (modalClosed && !hasOnceBeenSaved.value && ownsStoreItem) logStreamingStore.removeDestination(destination.id);
				showError(error, i18n.baseText("settings.log-streaming.destinationSave.error"));
			} finally {
				isSaving.value = false;
			}
		}
		function callEventBus(event, data) {
			if (eventBus) eventBus.emit(event, data);
		}
		const defNameRef = useTemplateRef("defNameRef");
		const { width } = useElementSize(defNameRef);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				name: unref(modalName),
				"event-bus": modalBus.value,
				"before-close": onModalClose,
				scrollable: true,
				center: true,
				loading: loading.value,
				"min-width": isTypeAbstract.value ? "460px" : "70%",
				"max-width": isTypeAbstract.value ? "460px" : "70%",
				"min-height": isTypeAbstract.value ? "160px" : "650px",
				"max-height": isTypeAbstract.value ? "300px" : "650px",
				"data-test-id": "destination-modal"
			}, {
				header: withCtx(() => [isTypeAbstract.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.headerCreate)
				}, [..._cache[0] || (_cache[0] = [createBaseVNode("span", null, "Add new destination", -1)])], 2)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createBaseVNode("div", {
					ref_key: "defNameRef",
					ref: defNameRef,
					class: normalizeClass(_ctx.$style.destinationInfo)
				}, [createVNode(unref(N8nInlineTextEdit_default), {
					"max-width": unref(width) - 10,
					"data-test-id": "subtitle-showing-type",
					"model-value": headerLabel.value,
					readonly: isTypeAbstract.value,
					"onUpdate:modelValue": onLabelChange
				}, null, 8, [
					"max-width",
					"model-value",
					"readonly"
				]), createVNode(unref(N8nText_default), {
					size: "small",
					tag: "p",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(!isTypeAbstract.value ? unref(i18n).baseText(typeLabelName.value) : "Select type"), 1)]),
					_: 1
				})], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.destinationActions) }, [nodeParameters.value && hasOnceBeenSaved.value && unchanged.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "outline",
					icon: testMessageSent.value ? testMessageResult.value ? "check" : "triangle-alert" : void 0,
					title: testMessageSent.value && testMessageResult.value ? "Event sent and returned OK" : "Event returned with error",
					label: "Send Test-Event",
					disabled: !hasOnceBeenSaved.value || !unchanged.value,
					"data-test-id": "destination-test-button",
					onClick: sendTestEvent
				}, null, 8, [
					"icon",
					"title",
					"disabled"
				])) : createCommentVNode("", true), canManageLogStreaming.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [nodeParameters.value && hasOnceBeenSaved.value ? (openBlock(), createBlock(unref(N8nIconButton_default), {
					key: 0,
					variant: "outline",
					title: unref(i18n).baseText("settings.log-streaming.delete"),
					icon: "trash-2",
					disabled: isSaving.value,
					loading: isDeleting.value,
					"data-test-id": "destination-delete-button",
					onClick: removeThis
				}, null, 8, [
					"title",
					"disabled",
					"loading"
				])) : createCommentVNode("", true), createVNode(SaveButton_default, {
					saved: unchanged.value && hasOnceBeenSaved.value,
					"is-saving": isSaving.value,
					disabled: unchanged.value || !isFormValid.value,
					"saving-label": unref(i18n).baseText("settings.log-streaming.saving"),
					"data-test-id": "destination-save-button",
					onClick: saveDestination
				}, null, 8, [
					"saved",
					"is-saving",
					"disabled",
					"saving-label"
				])], 64)) : createCommentVNode("", true)], 2)], 2), _cache[1] || (_cache[1] = createBaseVNode("hr", null, null, -1))], 64))]),
				content: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.container) }, [isTypeAbstract.value ? (openBlock(), createBlock(unref(N8nInputLabel_default), {
					key: 0,
					class: normalizeClass(_ctx.$style.typeSelector),
					label: unref(i18n).baseText("settings.log-streaming.selecttype"),
					"tooltip-text": unref(i18n).baseText("settings.log-streaming.selecttypehint"),
					bold: false,
					size: "medium",
					underline: false
				}, {
					default: withCtx(() => [createVNode(unref(N8nSelect_default), {
						ref: "typeSelectRef",
						"model-value": typeSelectValue.value,
						placeholder: typeSelectPlaceholder.value,
						"data-test-id": "select-destination-type",
						name: "name",
						"onUpdate:modelValue": onTypeSelectInput
					}, {
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(typeSelectOptions.value || [], (option) => {
							return openBlock(), createBlock(unref(N8nOption_default), {
								key: option.value,
								value: option.value,
								label: unref(i18n).baseText(option.label)
							}, null, 8, ["value", "label"]);
						}), 128))]),
						_: 1
					}, 8, ["model-value", "placeholder"]), createBaseVNode("div", _hoisted_1, [createVNode(unref(N8nButton_default), {
						size: "large",
						"data-test-id": "select-destination-button",
						disabled: !typeSelectValue.value,
						onClick: onContinueAddClicked
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`settings.log-streaming.continue`)), 1)]),
						_: 1
					}, 8, ["disabled"])])]),
					_: 1
				}, 8, [
					"class",
					"label",
					"tooltip-text"
				])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.sidebar) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(sidebarItems.value, (item) => {
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
					}), 128))], 2),
					activeTab.value === "settings" ? (openBlock(), createElementBlock("div", {
						key: 0,
						ref: "content",
						class: normalizeClass(_ctx.$style.mainContent)
					}, [isTypeWebhook.value ? (openBlock(), createBlock(ParameterInputList_default, {
						key: 0,
						parameters: webhookDescription.value,
						"hide-delete": true,
						"node-values": nodeParameters.value,
						"is-read-only": !canManageLogStreaming.value,
						path: "",
						onValueChanged: valueChanged
					}, null, 8, [
						"parameters",
						"node-values",
						"is-read-only"
					])) : isTypeSyslog.value ? (openBlock(), createBlock(ParameterInputList_default, {
						key: 1,
						parameters: syslogDescription.value,
						"hide-delete": true,
						"node-values": nodeParameters.value,
						"is-read-only": !canManageLogStreaming.value,
						path: "",
						onValueChanged: valueChanged
					}, null, 8, [
						"parameters",
						"node-values",
						"is-read-only"
					])) : isTypeSentry.value ? (openBlock(), createBlock(ParameterInputList_default, {
						key: 2,
						parameters: sentryDescription.value,
						"hide-delete": true,
						"node-values": nodeParameters.value,
						"is-read-only": !canManageLogStreaming.value,
						path: "",
						onValueChanged: valueChanged
					}, null, 8, [
						"parameters",
						"node-values",
						"is-read-only"
					])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true),
					activeTab.value === "events" ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.mainContent)
					}, [createBaseVNode("div", _hoisted_2, [createVNode(unref(N8nInputLabel_default), {
						class: "mb-m mt-m",
						label: unref(i18n).baseText("settings.log-streaming.tab.events.title"),
						bold: true,
						size: "medium",
						underline: false
					}, null, 8, ["label"]), createVNode(EventSelection_default, {
						"destination-id": unref(destination).id,
						readonly: !canManageLogStreaming.value,
						onInput,
						onChange: valueChanged
					}, null, 8, ["destination-id", "readonly"])])], 2)) : createCommentVNode("", true)
				], 64))], 2)]),
				_: 1
			}, 8, [
				"name",
				"event-bus",
				"loading",
				"min-width",
				"max-width",
				"min-height",
				"max-height"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	labelMargins: "_labelMargins_9d8u2_1",
	typeSelector: "_typeSelector_9d8u2_6",
	sidebarSwitches: "_sidebarSwitches_9d8u2_12",
	tabbar: "_tabbar_9d8u2_20",
	mainContent: "_mainContent_9d8u2_24",
	sidebar: "_sidebar_9d8u2_12",
	cardTitle: "_cardTitle_9d8u2_43",
	header: "_header_9d8u2_48",
	headerCreate: "_headerCreate_9d8u2_53",
	container: "_container_9d8u2_58",
	destinationInfo: "_destinationInfo_9d8u2_63",
	destinationActions: "_destinationActions_9d8u2_72"
} }]]);
//#endregion
//#region src/features/integrations/logStreaming.ee/components/EventDestinationSettingsModalAdapter.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler();
//#endregion
//#region src/features/integrations/logStreaming.ee/components/EventDestinationSettingsModalAdapter.vue
var EventDestinationSettingsModalAdapter_default = /* @__PURE__ */ defineComponent({
	__name: "EventDestinationSettingsModalAdapter",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createBlock(EventDestinationSettingsModal_default, {
				"modal-name": __props.modalName,
				destination: __props.data?.destination,
				"is-new": __props.data?.isNew,
				"event-bus": __props.data?.eventBus
			}, null, 8, [
				"modal-name",
				"destination",
				"is-new",
				"event-bus"
			]);
		};
	}
});
//#endregion
export { EventDestinationSettingsModalAdapter_default as default };
