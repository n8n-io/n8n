<template>
	<el-dialog
		:model-value="(!!activeNode || renaming) && !isActiveStickyNode"
		:before-close="close"
		:show-close="false"
		class="data-display-wrapper ndv-wrapper"
		overlay-class="data-display-overlay"
		width="auto"
		append-to-body
		data-test-id="ndv"
		:data-has-output-connection="hasOutputConnection"
	>
		<n8n-tooltip
			placement="bottom-start"
			:visible="showTriggerWaitingWarning"
			:disabled="!showTriggerWaitingWarning"
		>
			<template #content>
				<div :class="$style.triggerWarning">
					{{ $locale.baseText('ndv.backToCanvas.waitingForTriggerWarning') }}
				</div>
			</template>
			<div :class="$style.backToCanvas" data-test-id="back-to-canvas" @click="close">
				<n8n-icon icon="arrow-left" color="text-xlight" size="medium" />
				<n8n-text color="text-xlight" size="medium" :bold="true">
					{{ $locale.baseText('ndv.backToCanvas') }}
				</n8n-text>
			</div>
		</n8n-tooltip>

		<div
			v-if="activeNode"
			ref="container"
			class="data-display"
			tabindex="0"
			@keydown.capture="onKeyDown"
		>
			<div :class="$style.modalBackground" @click="close"></div>
			<NDVDraggablePanels
				:key="activeNode.name"
				:is-trigger-node="isTriggerNode"
				:hide-input-and-output="activeNodeType === null"
				:position="isTriggerNode && !showTriggerPanel ? 0 : undefined"
				:is-draggable="!isTriggerNode"
				:has-double-width="activeNodeType?.parameterPane === 'wide'"
				:node-type="activeNodeType"
				@switch-selected-node="onSwitchSelectedNode"
				@open-connection-node-creator="onOpenConnectionNodeCreator"
				@close="close"
				@init="onPanelsInit"
				@dragstart="onDragStart"
				@dragend="onDragEnd"
			>
				<template v-if="showTriggerPanel || !isTriggerNode" #input>
					<TriggerPanel
						v-if="showTriggerPanel"
						:node-name="activeNode.name"
						:push-ref="pushRef"
						@execute="onNodeExecute"
						@activate="onWorkflowActivate"
					/>
					<InputPanel
						v-else-if="!isTriggerNode"
						:workflow="workflow"
						:can-link-runs="canLinkRuns"
						:run-index="inputRun"
						:linked-runs="linked"
						:current-node-name="inputNodeName"
						:push-ref="pushRef"
						:read-only="readOnly || hasForeignCredential"
						:is-production-execution-preview="isProductionExecutionPreview"
						:is-pane-active="isInputPaneActive"
						@activate-pane="activateInputPane"
						@link-run="onLinkRunToInput"
						@unlink-run="() => onUnlinkRun('input')"
						@run-change="onRunInputIndexChange"
						@open-settings="openSettings"
						@change-input-node="onInputNodeChange"
						@execute="onNodeExecute"
						@table-mounted="onInputTableMounted"
						@item-hover="onInputItemHover"
						@search="onSearch"
					/>
				</template>
				<template #output>
					<OutputPanel
						data-test-id="output-panel"
						:can-link-runs="canLinkRuns"
						:run-index="outputRun"
						:linked-runs="linked"
						:push-ref="pushRef"
						:is-read-only="readOnly || hasForeignCredential"
						:block-u-i="blockUi && isTriggerNode && !isExecutableTriggerNode"
						:is-production-execution-preview="isProductionExecutionPreview"
						:is-pane-active="isOutputPaneActive"
						@activate-pane="activateOutputPane"
						@link-run="onLinkRunToOutput"
						@unlink-run="() => onUnlinkRun('output')"
						@run-change="onRunOutputIndexChange"
						@open-settings="openSettings"
						@table-mounted="onOutputTableMounted"
						@item-hover="onOutputItemHover"
						@search="onSearch"
					/>
				</template>
				<template #main>
					<NodeSettings
						:event-bus="settingsEventBus"
						:dragging="isDragging"
						:push-ref="pushRef"
						:node-type="activeNodeType"
						:foreign-credentials="foreignCredentials"
						:read-only="readOnly"
						:block-u-i="blockUi && showTriggerPanel"
						:executable="!readOnly"
						@value-changed="valueChanged"
						@execute="onNodeExecute"
						@stop-execution="onStopExecution"
						@redraw-required="redrawRequired = true"
						@activate="onWorkflowActivate"
						@switch-selected-node="onSwitchSelectedNode"
						@open-connection-node-creator="onOpenConnectionNodeCreator"
					/>
					<a
						v-if="featureRequestUrl"
						:class="$style.featureRequest"
						target="_blank"
						@click="onFeatureRequestClick"
					>
						<font-awesome-icon icon="lightbulb" />
						{{ $locale.baseText('ndv.featureRequest') }}
					</a>
				</template>
			</NDVDraggablePanels>
		</div>
	</el-dialog>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { createEventBus } from 'n8n-design-system/utils';
import type { IRunData, ConnectionTypes } from 'n8n-workflow';
import { jsonParse, NodeHelpers, NodeConnectionType } from 'n8n-workflow';
import type { IUpdateInformation, TargetItem } from '@/Interface';

import NodeSettings from '@/components/NodeSettings.vue';
import NDVDraggablePanels from './NDVDraggablePanels.vue';

import OutputPanel from './OutputPanel.vue';
import InputPanel from './InputPanel.vue';
import TriggerPanel from './TriggerPanel.vue';
import {
	BASE_NODE_SURVEY_URL,
	EnterpriseEditionFeature,
	EXECUTABLE_TRIGGER_NODE_TYPES,
	MODAL_CONFIRM,
	START_NODE_TYPE,
	STICKY_NODE_TYPE,
} from '@/constants';
import { useWorkflowActivate } from '@/composables/useWorkflowActivate';
import { dataPinningEventBus } from '@/event-bus';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useDeviceSupport } from 'n8n-design-system';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useMessage } from '@/composables/useMessage';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { usePinnedData } from '@/composables/usePinnedData';
import { useRouter } from 'vue-router';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useTelemetry } from '@/composables/useTelemetry';
import { useI18n } from '@/composables/useI18n';
import { storeToRefs } from 'pinia';

export default defineComponent({
	name: 'NodeDetailsView',
	components: {
		NodeSettings,
		InputPanel,
		OutputPanel,
		NDVDraggablePanels,
		TriggerPanel,
	},
	props: {
		readOnly: {
			type: Boolean,
		},
		renaming: {
			type: Boolean,
		},
		isProductionExecutionPreview: {
			type: Boolean,
			default: false,
		},
	},
	emits: [
		'saveKeyboardShortcut',
		'valueChanged',
		'nodeTypeSelected',
		'switchSelectedNode',
		'openConnectionNodeCreator',
		'redrawNode',
		'stopExecution',
	],
	setup(props, { emit }) {
		const ndvStore = useNDVStore();
		const externalHooks = useExternalHooks();
		const nodeHelpers = useNodeHelpers();
		const { activeNode } = storeToRefs(ndvStore);
		const pinnedData = usePinnedData(activeNode);
		const router = useRouter();
		const workflowHelpers = useWorkflowHelpers({ router });
		const workflowActivate = useWorkflowActivate();
		const nodeTypesStore = useNodeTypesStore();
		const uiStore = useUIStore();
		const workflowsStore = useWorkflowsStore();
		const settingsStore = useSettingsStore();
		const deviceSupport = useDeviceSupport();
		const telemetry = useTelemetry();
		const i18n = useI18n();
		const message = useMessage();

		const settingsEventBus = createEventBus();
		const redrawRequired = ref(false);
		const runInputIndex = ref(-1);
		const runOutputIndex = ref(-1);
		const isLinkingEnabled = ref(true);
		const selectedInput = ref<string | undefined>();
		const triggerWaitingWarningEnabled = ref(false);
		const isDragging = ref(false);
		const mainPanelPosition = ref(0);
		const pinDataDiscoveryTooltipVisible = ref(false);
		const avgInputRowHeight = ref(0);
		const avgOutputRowHeight = ref(0);
		const isInputPaneActive = ref(false);
		const isOutputPaneActive = ref(false);
		const isPairedItemHoveringEnabled = ref(true);

		//computed

		const pushRef = computed(() => ndvStore.pushRef);

		const activeNodeType = computed(() => {
			if (activeNode.value) {
				return nodeTypesStore.getNodeType(activeNode.value.type, activeNode.value.typeVersion);
			}
			return null;
		});

		const workflowRunning = computed(() => uiStore.isActionActive('workflowRunning'));

		const showTriggerWaitingWarning = computed(
			() =>
				triggerWaitingWarningEnabled.value &&
				!!activeNodeType.value &&
				!activeNodeType.value.group.includes('trigger') &&
				workflowRunning.value &&
				workflowsStore.executionWaitingForWebhook,
		);

		const workflowRunData = computed(() => {
			if (workflowExecution.value === null) {
				return null;
			}

			const executionData = workflowExecution.value.data;

			if (executionData?.resultData) {
				return executionData.resultData.runData;
			}

			return null;
		});

		const workflow = computed(() => workflowHelpers.getCurrentWorkflow());

		const parentNodes = computed(() => {
			if (activeNode.value) {
				return (
					workflow.value.getParentNodesByDepth(activeNode.value.name, 1).map(({ name }) => name) ||
					[]
				);
			} else {
				return [];
			}
		});

		const parentNode = computed(() => {
			for (const parentNodeName of parentNodes.value) {
				if (workflowsStore?.pinnedWorkflowData?.[parentNodeName]) {
					return parentNodeName;
				}

				if (workflowRunData.value?.[parentNodeName]) {
					return parentNodeName;
				}
			}
			return parentNodes.value[0];
		});

		const inputNodeName = computed<string | undefined>(() => {
			return selectedInput.value || parentNode.value;
		});

		const inputNode = computed(() => {
			if (inputNodeName.value) {
				return workflowsStore.getNodeByName(inputNodeName.value);
			}
			return null;
		});

		const isTriggerNode = computed(
			() =>
				!!activeNodeType.value &&
				(activeNodeType.value.group.includes('trigger') ||
					activeNodeType.value.name === START_NODE_TYPE),
		);

		const showTriggerPanel = computed(() => {
			const override = !!activeNodeType.value?.triggerPanel;
			if (typeof activeNodeType.value?.triggerPanel === 'boolean') {
				return override;
			}

			const isWebhookBasedNode = !!activeNodeType.value?.webhooks?.length;
			const isPollingNode = activeNodeType.value?.polling;

			return (
				!props.readOnly && isTriggerNode.value && (isWebhookBasedNode || isPollingNode || override)
			);
		});

		const hasOutputConnection = computed(() => {
			if (!activeNode.value) return false;
			const outgoingConnections = workflowsStore.outgoingConnectionsByNodeName(
				activeNode.value.name,
			);

			// Check if there's at-least one output connection
			return (Object.values(outgoingConnections)?.[0]?.[0] ?? []).length > 0;
		});

		const isExecutableTriggerNode = computed(() => {
			if (!activeNodeType.value) return false;

			return EXECUTABLE_TRIGGER_NODE_TYPES.includes(activeNodeType.value.name);
		});

		const isActiveStickyNode = computed(
			() => !!ndvStore.activeNode && ndvStore.activeNode.type === STICKY_NODE_TYPE,
		);

		const workflowExecution = computed(() => workflowsStore.getWorkflowExecution);

		const maxOutputRun = computed(() => {
			if (activeNode.value === null) {
				return 0;
			}

			const runData = workflowRunData.value;

			if (!runData?.[activeNode.value.name]) {
				return 0;
			}

			if (runData[activeNode.value.name].length) {
				return runData[activeNode.value.name].length - 1;
			}

			return 0;
		});

		const outputRun = computed(() =>
			runOutputIndex.value === -1
				? maxOutputRun.value
				: Math.min(runOutputIndex.value, maxOutputRun.value),
		);

		const maxInputRun = computed(() => {
			if (inputNode.value === null || activeNode.value === null) {
				return 0;
			}

			const workflowNode = workflow.value.getNode(activeNode.value.name);

			if (!workflowNode || !activeNodeType.value) {
				return 0;
			}

			const outputs = NodeHelpers.getNodeOutputs(
				workflow.value,
				workflowNode,
				activeNodeType.value,
			);

			let node = inputNode.value;

			const runData: IRunData | null = workflowRunData.value;

			if (outputs.some((output) => output !== NodeConnectionType.Main)) {
				node = activeNode.value;
			}

			if (!node || !runData || !runData.hasOwnProperty(node.name)) {
				return 0;
			}

			if (runData[node.name].length) {
				return runData[node.name].length - 1;
			}

			return 0;
		});

		const inputRun = computed(() => {
			if (isLinkingEnabled.value && maxOutputRun.value === maxInputRun.value) {
				return outputRun.value;
			}
			if (runInputIndex.value === -1) {
				return maxInputRun.value;
			}

			return Math.min(runInputIndex.value, maxInputRun.value);
		});

		const canLinkRuns = computed(
			() => maxOutputRun.value > 0 && maxOutputRun.value === maxInputRun.value,
		);

		const linked = computed(() => isLinkingEnabled.value && canLinkRuns.value);

		const inputPanelMargin = computed(() => (isTriggerNode.value ? 0 : 80));

		const featureRequestUrl = computed(() => {
			if (!activeNodeType.value) {
				return '';
			}
			return `${BASE_NODE_SURVEY_URL}${activeNodeType.value.name}`;
		});

		const outputPanelEditMode = computed(() => ndvStore.outputPanelEditMode);

		const isWorkflowRunning = computed(() => uiStore.isActionActive('workflowRunning'));

		const isExecutionWaitingForWebhook = computed(() => workflowsStore.executionWaitingForWebhook);

		const blockUi = computed(() => isWorkflowRunning.value || isExecutionWaitingForWebhook.value);

		const foreignCredentials = computed(() => {
			const credentials = activeNode.value?.credentials;
			const usedCredentials = workflowsStore.usedCredentials;

			const foreignCredentialsArray: string[] = [];
			if (
				credentials &&
				settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing)
			) {
				Object.values(credentials).forEach((credential) => {
					if (
						credential.id &&
						usedCredentials[credential.id] &&
						!usedCredentials[credential.id].currentUserHasAccess
					) {
						foreignCredentialsArray.push(credential.id);
					}
				});
			}

			return foreignCredentialsArray;
		});

		const hasForeignCredential = computed(() => foreignCredentials.value.length > 0);

		//methods

		const setIsTooltipVisible = ({ isTooltipVisible }: { isTooltipVisible: boolean }) => {
			pinDataDiscoveryTooltipVisible.value = isTooltipVisible;
		};

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 's' && deviceSupport.isCtrlKeyPressed(e)) {
				e.stopPropagation();
				e.preventDefault();

				if (props.readOnly) return;

				emit('saveKeyboardShortcut', e);
			}
		};

		const onInputItemHover = (e: { itemIndex: number; outputIndex: number } | null) => {
			if (e === null || !inputNodeName.value || !isPairedItemHoveringEnabled.value) {
				ndvStore.setHoveringItem(null);
				return;
			}

			const item = {
				nodeName: inputNodeName.value,
				runIndex: inputRun.value,
				outputIndex: e.outputIndex,
				itemIndex: e.itemIndex,
			};
			ndvStore.setHoveringItem(item);
		};

		const onInputTableMounted = (e: { avgRowHeight: number }) => {
			avgInputRowHeight.value = e.avgRowHeight;
		};

		const onWorkflowActivate = () => {
			ndvStore.activeNodeName = null;
			setTimeout(() => {
				void workflowActivate.activateCurrentWorkflow('ndv');
			}, 1000);
		};

		const onOutputItemHover = (e: { itemIndex: number; outputIndex: number }) => {
			if (e === null || !activeNode.value || !isPairedItemHoveringEnabled.value) {
				ndvStore.setHoveringItem(null);
				return;
			}

			const item: TargetItem = {
				nodeName: activeNode.value?.name,
				runIndex: outputRun.value,
				outputIndex: e.outputIndex,
				itemIndex: e.itemIndex,
			};
			ndvStore.setHoveringItem(item);
		};

		const onFeatureRequestClick = () => {
			window.open(featureRequestUrl.value, '_blank');
			if (activeNode.value) {
				telemetry.track('User clicked ndv link', {
					node_type: activeNode.value.type,
					workflow_id: workflowsStore.workflowId,
					push_ref: pushRef.value,
					pane: NodeConnectionType.Main,
					type: 'i-wish-this-node-would',
				});
			}
		};

		const onDragEnd = (e: { windowWidth: number; position: number }) => {
			isDragging.value = false;
			telemetry.track('User moved parameters pane', {
				// example method for tracking
				window_width: e.windowWidth,
				start_position: mainPanelPosition.value,
				end_position: e.position,
				node_type: activeNodeType.value ? activeNodeType.value.name : '',
				push_ref: pushRef.value,
				workflow_id: workflowsStore.workflowId,
			});
			mainPanelPosition.value = e.position;
		};

		const onDragStart = (e: { position: number }) => {
			isDragging.value = true;
			mainPanelPosition.value = e.position;
		};

		const onPanelsInit = (e: { position: number }) => {
			mainPanelPosition.value = e.position;
		};

		const onLinkRunToOutput = () => {
			isLinkingEnabled.value = true;
			trackLinking('output');
		};

		const onUnlinkRun = (pane: string) => {
			runInputIndex.value = runOutputIndex.value;
			isLinkingEnabled.value = false;
			trackLinking(pane);
		};

		const onNodeExecute = () => {
			setTimeout(() => {
				if (!activeNode.value || !workflowRunning.value) {
					return;
				}
				triggerWaitingWarningEnabled.value = true;
			}, 1000);
		};

		const openSettings = () => {
			settingsEventBus.emit('openSettings');
		};

		const trackLinking = (pane: string) => {
			telemetry.track('User changed ndv run linking', {
				node_type: activeNodeType.value ? activeNodeType.value.name : '',
				push_ref: pushRef.value,
				linked: linked.value,
				pane,
			});
		};

		const onLinkRunToInput = () => {
			runOutputIndex.value = runInputIndex.value;
			isLinkingEnabled.value = true;
			trackLinking('input');
		};

		const valueChanged = (parameterData: IUpdateInformation) => {
			emit('valueChanged', parameterData);
		};

		const nodeTypeSelected = (nodeTypeName: string) => {
			emit('nodeTypeSelected', nodeTypeName);
		};

		const onSwitchSelectedNode = (nodeTypeName: string) => {
			emit('switchSelectedNode', nodeTypeName);
		};

		const onOpenConnectionNodeCreator = (nodeTypeName: string, connectionType: ConnectionTypes) => {
			emit('openConnectionNodeCreator', nodeTypeName, connectionType);
		};

		const close = async () => {
			if (isDragging.value) {
				return;
			}

			if (
				activeNode.value &&
				(typeof activeNodeType.value?.outputs === 'string' ||
					typeof activeNodeType.value?.inputs === 'string' ||
					redrawRequired.value)
			) {
				const nodeName = activeNode.value.name;
				setTimeout(() => {
					emit('redrawNode', nodeName);
				}, 1);
			}

			if (outputPanelEditMode.value.enabled && activeNode.value) {
				const shouldPinDataBeforeClosing = await message.confirm(
					'',
					i18n.baseText('ndv.pinData.beforeClosing.title'),
					{
						confirmButtonText: i18n.baseText('ndv.pinData.beforeClosing.confirm'),
						cancelButtonText: i18n.baseText('ndv.pinData.beforeClosing.cancel'),
					},
				);

				if (shouldPinDataBeforeClosing === MODAL_CONFIRM) {
					const { value } = outputPanelEditMode.value;
					try {
						pinnedData.setData(jsonParse(value), 'on-ndv-close-modal');
					} catch (error) {
						console.error(error);
					}
				}

				ndvStore.setOutputPanelEditModeEnabled(false);
			}

			await externalHooks.run('dataDisplay.nodeEditingFinished');
			telemetry.track('User closed node modal', {
				node_type: activeNodeType.value ? activeNodeType.value?.name : '',
				push_ref: pushRef.value,
				workflow_id: workflowsStore.workflowId,
			});
			triggerWaitingWarningEnabled.value = false;
			ndvStore.activeNodeName = null;
			ndvStore.resetNDVPushRef();
		};

		const trackRunChange = (run: number, pane: string) => {
			telemetry.track('User changed ndv run dropdown', {
				push_ref: pushRef.value,
				run_index: run,
				node_type: activeNodeType.value ? activeNodeType.value?.name : '',
				pane,
			});
		};

		const onRunOutputIndexChange = (run: number) => {
			runOutputIndex.value = run;
			trackRunChange(run, 'output');
		};

		const onRunInputIndexChange = (run: number) => {
			runInputIndex.value = run;
			if (linked.value) {
				runOutputIndex.value = run;
			}
			trackRunChange(run, 'input');
		};

		const onOutputTableMounted = (e: { avgRowHeight: number }) => {
			avgOutputRowHeight.value = e.avgRowHeight;
		};

		const onInputNodeChange = (value: string, index: number) => {
			runInputIndex.value = -1;
			isLinkingEnabled.value = true;
			selectedInput.value = value;

			telemetry.track('User changed ndv input dropdown', {
				node_type: activeNode.value ? activeNode.value.type : '',
				push_ref: pushRef.value,
				workflow_id: workflowsStore.workflowId,
				selection_value: index,
				input_node_type: inputNode.value ? inputNode.value.type : '',
			});
		};

		const onStopExecution = () => {
			emit('stopExecution');
		};

		const activateInputPane = () => {
			isInputPaneActive.value = true;
			isOutputPaneActive.value = false;
		};

		const activateOutputPane = () => {
			isInputPaneActive.value = false;
			isOutputPaneActive.value = true;
		};

		const onSearch = (search: string) => {
			isPairedItemHoveringEnabled.value = !search;
		};

		//watchers

		watch(
			activeNode,
			(node, oldNode) => {
				if (node && node.name !== oldNode?.name && !isActiveStickyNode.value) {
					runInputIndex.value = -1;
					runOutputIndex.value = -1;
					isLinkingEnabled.value = true;
					selectedInput.value = undefined;
					triggerWaitingWarningEnabled.value = false;
					avgOutputRowHeight.value = 0;
					avgInputRowHeight.value = 0;

					setTimeout(() => ndvStore.setNDVPushRef(), 0);

					if (!activeNodeType.value) {
						return;
					}

					void externalHooks.run('dataDisplay.nodeTypeChanged', {
						nodeSubtitle: nodeHelpers.getNodeSubtitle(
							node,
							activeNodeType.value,
							workflowHelpers.getCurrentWorkflow(),
						),
					});

					setTimeout(() => {
						if (activeNode.value) {
							const outgoingConnections = workflowsStore.outgoingConnectionsByNodeName(
								activeNode.value?.name,
							);

							telemetry.track('User opened node modal', {
								node_type: activeNodeType.value ? activeNodeType.value?.name : '',
								workflow_id: workflowsStore.workflowId,
								push_ref: pushRef.value,
								is_editable: !hasForeignCredential.value,
								parameters_pane_position: mainPanelPosition.value,
								input_first_connector_runs: maxInputRun.value,
								output_first_connector_runs: maxOutputRun.value,
								selected_view_inputs: isTriggerNode.value
									? 'trigger'
									: ndvStore.inputPanelDisplayMode,
								selected_view_outputs: ndvStore.outputPanelDisplayMode,
								input_connectors: parentNodes.value.length,
								output_connectors: outgoingConnections?.main?.length,
								input_displayed_run_index: inputRun.value,
								output_displayed_run_index: outputRun.value,
								data_pinning_tooltip_presented: pinDataDiscoveryTooltipVisible.value,
								input_displayed_row_height_avg: avgInputRowHeight.value,
								output_displayed_row_height_avg: avgOutputRowHeight.value,
							});
						}
					}, 2000); // wait for RunData to mount and present pindata discovery tooltip
				}
				if (window.top && !isActiveStickyNode.value) {
					window.top.postMessage(JSON.stringify({ command: node ? 'openNDV' : 'closeNDV' }), '*');
				}
			},
			{ immediate: true },
		);
		watch(maxOutputRun, () => {
			runOutputIndex.value = -1;
		});

		watch(maxInputRun, () => {
			runInputIndex.value = -1;
		});

		watch(inputNodeName, (nodeName) => {
			setTimeout(() => {
				ndvStore.setInputNodeName(nodeName);
			}, 0);
		});

		watch(inputRun, (inputRun) => {
			setTimeout(() => {
				ndvStore.setInputRunIndex(inputRun);
			}, 0);
		});

		onMounted(() => {
			dataPinningEventBus.on('data-pinning-discovery', setIsTooltipVisible);
		});

		onBeforeUnmount(() => {
			dataPinningEventBus.off('data-pinning-discovery', setIsTooltipVisible);
		});

		return {
			externalHooks,
			nodeHelpers,
			pinnedData,
			workflowHelpers,
			workflowActivate,
			redrawRequired,
			isInputPaneActive,
			isDragging,
			activeNodeType,
			pushRef,
			workflowRunning,
			showTriggerWaitingWarning,
			activeNode,
			isExecutableTriggerNode,
			showTriggerPanel,
			hasOutputConnection,
			blockUi,
			isActiveStickyNode,
			isTriggerNode,
			workflow,
			canLinkRuns,
			inputRun,
			linked,
			inputNodeName,
			hasForeignCredential,
			outputRun,
			isOutputPaneActive,
			foreignCredentials,
			featureRequestUrl,
			settingsEventBus,
			inputPanelMargin,
			nodeTypeSelected,
			onOutputItemHover,
			onOutputTableMounted,
			onInputTableMounted,
			onRunOutputIndexChange,
			onStopExecution,
			activateInputPane,
			activateOutputPane,
			onSearch,
			onInputNodeChange,
			onRunInputIndexChange,
			onLinkRunToInput,
			valueChanged,
			onSwitchSelectedNode,
			onOpenConnectionNodeCreator,
			close,
			onKeyDown,
			onInputItemHover,
			onWorkflowActivate,
			onFeatureRequestClick,
			onDragEnd,
			onDragStart,
			onPanelsInit,
			onLinkRunToOutput,
			onUnlinkRun,
			onNodeExecute,
			openSettings,
		};
	},
});
</script>

<style lang="scss">
// Hide notice(.ndv-connection-hint-notice) warning when node has output connection
[data-has-output-connection='true'] .ndv-connection-hint-notice {
	display: none;
}
.ndv-wrapper {
	overflow: visible;
	margin-top: 0;
}

.data-display-wrapper {
	height: calc(100% - var(--spacing-l)) !important;
	margin-top: var(--spacing-xl) !important;
	margin-bottom: var(--spacing-xl) !important;
	width: 100%;
	background: none;
	border: none;

	.el-dialog__header {
		padding: 0 !important;
	}

	.el-dialog__body {
		padding: 0 !important;
		height: 100%;
		min-height: 400px;
		overflow: visible;
		border-radius: 8px;
	}
}

.data-display {
	height: 100%;
	width: 100%;
	display: flex;
}
</style>

<style lang="scss" module>
$main-panel-width: 360px;

.modalBackground {
	height: 100%;
	width: 100%;
}

.triggerWarning {
	max-width: 180px;
}

.backToCanvas {
	position: fixed;
	top: var(--spacing-xs);
	left: var(--spacing-l);

	span {
		color: var(--color-ndv-back-font);
	}

	&:hover {
		cursor: pointer;
	}

	> * {
		margin-right: var(--spacing-3xs);
	}
}

@media (min-width: $breakpoint-lg) {
	.backToCanvas {
		top: var(--spacing-xs);
		left: var(--spacing-m);
	}
}

.featureRequest {
	position: absolute;
	bottom: var(--spacing-4xs);
	left: calc(100% + var(--spacing-s));
	color: var(--color-feature-request-font);
	font-size: var(--font-size-2xs);
	white-space: nowrap;

	* {
		margin-right: var(--spacing-3xs);
	}
}
</style>
