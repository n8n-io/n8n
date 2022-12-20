import Vue, { computed, ref, nextTick } from 'vue';
import { defineStore } from 'pinia';
import { v4 as uuid } from 'uuid';
import normalizeWheel from 'normalize-wheel';
import { useWorkflowsStore } from '@/stores/workflows';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { useUIStore } from '@/stores/ui';
import { useHistoryStore } from '@/stores/history';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { ICredentialsResponse, INodeUi, XYPosition } from '@/Interface';
import { scaleBigger, scaleReset, scaleSmaller, getConnectionInfo } from '@/utils';
import { START_NODE_TYPE, STICKY_NODE_TYPE, WEBHOOK_NODE_TYPE } from '@/constants';
import {
	IConnection,
	INodeConnections,
	INodeCredentialsDetails,
	INodeIssues,
	INodeTypeDescription,
	IPinData,
	NodeHelpers,
} from 'n8n-workflow';
import {
	BeforeStartEventParams,
	BrowserJsPlumbInstance,
	DragStartEventParams,
	DragStopEventParams,
	DragStopPayload,
	EVENT_ENDPOINT_MOUSEOVER,
	EVENT_ENDPOINT_MOUSEOUT,
	EVENT_CONNECTION_DRAG,
	EVENT_CONNECTION_ABORT,
	EVENT_DRAG_MOVE,
	EVENT_CONNECTION_MOUSEOUT,
	EVENT_CONNECTION_MOUSEOVER,
} from '@jsplumb/browser-ui';
import { i18n } from '@/plugins/i18n';
import { newInstance as newJsPlumbInstance } from '@jsplumb/browser-ui';
import { N8nPlusEndpointHandler } from '@/plugins/endpoints/N8nPlusEndpointType';
import * as N8nPlusEndpointRenderer from '@/plugins/endpoints/N8nPlusEndpointRenderer';
import { N8nConnector } from '@/plugins/connectors/N8nCustomConnector';
import {
	Endpoint,
	Overlay,
	EndpointFactory,
	Connectors,
	Connection,
	EVENT_CONNECTION,
	ConnectionEstablishedParams,
	EVENT_CONNECTION_DETACHED,
	EVENT_CONNECTION_MOVED,
	INTERCEPT_BEFORE_DROP,
	BeforeDropInterceptor,
	BeforeDropParams,
	ConnectionDetachedParams,
	ConnectionMovedParams,
} from '@jsplumb/core';
import { PointXY } from '@jsplumb/util';
import { MoveNodeCommand, RemoveConnectionCommand, AddConnectionCommand, CANVAS_ACTION_TIMEOUT, RenameNodeCommand, AddNodeCommand } from '@/models/history';
import {
	DEFAULT_PLACEHOLDER_TRIGGER_BUTTON,
	getMidCanvasPosition,
	getNewNodePosition,
	getZoomToFit,
	resetConnection,
	moveBackInputLabelPosition,
	addConnectionActionsOverlay,
	hideConnectionActions,
	resetInputLabelPosition,
	getMousePosition,
	showDropConnectionState,
	showPullConnectionState,
	resetConnectionAfterPull,
	PLACEHOLDER_TRIGGER_NODE_SIZE,
	CONNECTOR_FLOWCHART_TYPE,
	GRID_SIZE,
	HEADER_HEIGHT,
	SIDEBAR_WIDTH,
	SIDEBAR_WIDTH_EXPANDED,
	getRelativePosition,
	addConnectionOutputSuccess,
	showConnectionActions,
	showOrHideItemsLabel,
	showOrHideMidpointArrow,
	getInputEndpointUUID as getInputEndpointUUIDUtils,
	getOutputEndpointUUID as getOutputEndpointUUIDUtils,
	getNodeIssues,
} from '@/utils/nodeViewUtils';
import { useNDVStore } from './ndv';
import { useRootStore } from './n8nRootStore';
import { useCredentialsStore } from './credentials';

export const useCanvasStore = defineStore('canvas', () => {
	const workflowStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const uiStore = useUIStore();
	const historyStore = useHistoryStore();

	const newInstance = ref<BrowserJsPlumbInstance>();
	const isDragging = ref<boolean>(false);
	const dropPrevented = ref<boolean>(false);
	const pullConnActive = ref<boolean>(false);
	const pullConnActiveNodeName = ref<string | null>(null);
	const activeConnection = ref<Connection | null>(null);
	const lastSelectedConnection = ref<Connection | null>(null);
	const newNodeInsertPosition = ref<XYPosition | null>(null);
	const suspendRecordingDetachedConnections = ref<boolean>(false);
	const renamingActive = ref<boolean>(false);
	const credentialsUpdated = ref<boolean>(false);

	const nodes = computed<INodeUi[]>(() => workflowStore.allNodes);
	const triggerNodes = computed<INodeUi[]>(() =>
		nodes.value.filter(
			(node) => node.type === START_NODE_TYPE || nodeTypesStore.isTriggerNode(node.type),
		),
	);
	const isDemo = ref<boolean>(false);
	const nodeViewScale = ref<number>(1);
	const canvasAddButtonPosition = ref<XYPosition>([1, 1]);

	Connectors.register(N8nConnector.type, N8nConnector);
	N8nPlusEndpointRenderer.register();
	EndpointFactory.registerHandler(N8nPlusEndpointHandler);

	const setCredentialsUpdated = (value: boolean) => {
		credentialsUpdated.value = value;
	};

	const setCenteredCanvasAddButtonPosition = (offset?: XYPosition) => {
		const position = getMidCanvasPosition(nodeViewScale.value, offset || [0, 0]);

		position[0] -= PLACEHOLDER_TRIGGER_NODE_SIZE / 2;
		position[1] -= PLACEHOLDER_TRIGGER_NODE_SIZE / 2;

		canvasAddButtonPosition.value = getNewNodePosition(nodes.value, position);
	};

	const getPlaceholderTriggerNodeUI = (): INodeUi => {
		setCenteredCanvasAddButtonPosition();

		return {
			id: uuid(),
			...DEFAULT_PLACEHOLDER_TRIGGER_BUTTON,
			position: canvasAddButtonPosition.value,
		};
	};

	const getNodesWithPlaceholderNode = (): INodeUi[] =>
		triggerNodes.value.length > 0 ? nodes.value : [getPlaceholderTriggerNodeUI(), ...nodes.value];

	const setZoomLevel = (zoomLevel: number, offset: XYPosition) => {
		nodeViewScale.value = zoomLevel;
		newInstance.value?.setZoom(zoomLevel);
		uiStore.nodeViewOffsetPosition = offset;
	};

	const resetZoom = () => {
		const { scale, offset } = scaleReset({
			scale: nodeViewScale.value,
			offset: uiStore.nodeViewOffsetPosition,
		});
		setZoomLevel(scale, offset);
	};

	const zoomIn = () => {
		const { scale, offset } = scaleBigger({
			scale: nodeViewScale.value,
			offset: uiStore.nodeViewOffsetPosition,
		});
		setZoomLevel(scale, offset);
	};

	const zoomOut = () => {
		const { scale, offset } = scaleSmaller({
			scale: nodeViewScale.value,
			offset: uiStore.nodeViewOffsetPosition,
		});
		setZoomLevel(scale, offset);
	};

	const zoomToFit = () => {
		const nodes = getNodesWithPlaceholderNode();
		if (!nodes.length) {
			// some unknown workflow executions
			return;
		}
		const { zoomLevel, offset } = getZoomToFit(nodes, !isDemo.value);
		setZoomLevel(zoomLevel, offset);
	};

	const wheelMoveWorkflow = (e: WheelEvent) => {
		const normalized = normalizeWheel(e);
		const offsetPosition = uiStore.nodeViewOffsetPosition;
		const nodeViewOffsetPositionX =
			offsetPosition[0] - (e.shiftKey ? normalized.pixelY : normalized.pixelX);
		const nodeViewOffsetPositionY =
			offsetPosition[1] - (e.shiftKey ? normalized.pixelX : normalized.pixelY);
		uiStore.nodeViewOffsetPosition = [nodeViewOffsetPositionX, nodeViewOffsetPositionY];
	};

	const wheelScroll = (e: WheelEvent) => {
		//* Control + scroll zoom
		if (e.ctrlKey) {
			if (e.deltaY > 0) {
				zoomOut();
			} else {
				zoomIn();
			}

			e.preventDefault();
			return;
		}
		wheelMoveWorkflow(e);
	};

	function setRenamingActive(active: boolean) {
		renamingActive.value = active;
	}

	function onNodeMoved(node: INodeUi) {
		const { incoming, outgoing } = getIncomingOutgoingConnections(node.name);

		[...incoming, ...outgoing].forEach((connection: Connection) => {
			showOrHideMidpointArrow(connection);
			showOrHideItemsLabel(connection);
		});
	}

	function getIncomingOutgoingConnections(nodeName: string): {
		incoming: Connection[];
		outgoing: Connection[];
	} {
		const node = workflowStore.getNodeByName(nodeName);

		if (node) {
			// @ts-ignore
			const outgoing = newInstance.value?.getConnections({
				source: node.id,
			});

			// @ts-ignore
			const incoming = newInstance.value?.getConnections({
				target: node.id,
			}) as Connection[];

			return {
				incoming,
				outgoing,
			};
		}
		return { incoming: [], outgoing: [] };
	}

	function onMoveNode({nodeName, position}: { nodeName: string, position: XYPosition }): void {
		workflowStore.updateNodeProperties({ name: nodeName, properties: { position }});
		setTimeout(() => {
			const node = workflowStore.getNodeByName(nodeName);
			if (node) {
				newInstance.value?.repaintEverything();
				onNodeMoved(node);
			}
		}, 0);
	}

	function initInstance(container: Element) {
		class ModMoveNodeCommand extends MoveNodeCommand {
			revert(): Promise<void> {
				return new Promise<void>((resolve) => {
					onMoveNode({
						nodeName: this.nodeName,
						position: this.oldPosition,
					});
					resolve();
				});
			}
		}
		class ModAddConnectionCommand extends AddConnectionCommand {
			revert(): Promise<void> {
				return new Promise<void>((resolve) => {
					setTimeout(() => {
						setSuspendRecordingDetachedConnections(true);
						__removeConnection(this.connectionData, true);
						setSuspendRecordingDetachedConnections(false);
						resolve();
					}, CANVAS_ACTION_TIMEOUT);
				});
			}
		}
		class ModRemoveConnectionCommand extends RemoveConnectionCommand {
			revert(): Promise<void> {
				return new Promise<void>((resolve) => {
					setTimeout(() => {
						setSuspendRecordingDetachedConnections(true);
						__addConnection(this.connectionData, true);
						setSuspendRecordingDetachedConnections(false);
						resolve();
					}, CANVAS_ACTION_TIMEOUT);
				});
			}
		}

		newInstance.value = newJsPlumbInstance({
			container,
			connector: CONNECTOR_FLOWCHART_TYPE,
			resizeObserver: false,
			dragOptions: {
				cursor: 'pointer',
				grid: { w: GRID_SIZE, h: GRID_SIZE },
				start: (params: BeforeStartEventParams) => {
					const draggedNode = params.drag.getDragElement();
					const nodeName = draggedNode.getAttribute('data-name');
					if(!nodeName) return;
					const nodeData = workflowStore.getNodeByName(nodeName);
					isDragging.value = true;

					const isSelected = uiStore.isNodeSelected(nodeName);
					if (nodeData?.type === STICKY_NODE_TYPE && !isSelected) {
						setTimeout(() => {
							// this.$emit('nodeSelected', nodeName, false, true);
						}, 0);
					}

					if (params.e && !isSelected) {
						// Only the node which gets dragged directly gets an event, for all others it is
						// undefined. So check if the currently dragged node is selected and if not clear
						// the drag-selection.
						newInstance.value?.clearDragSelection();
						uiStore.resetSelectedNodes();
					}

					uiStore.addActiveAction('dragActive');
					return true;
				},
				stop: (params: DragStopEventParams) => {
					const draggedNode = params.drag.getDragElement();
					const nodeName = draggedNode.getAttribute('data-name');
					if(!nodeName) return;
					const nodeData = workflowStore.getNodeByName(nodeName);
					isDragging.value = false;
					if (uiStore.isActionActive('dragActive') && nodeData) {
						const moveNodes = uiStore.getSelectedNodes.slice();
						const selectedNodeNames = moveNodes.map((node: INodeUi) => node.name);
						if (!selectedNodeNames.includes(nodeData.name)) {
							// If the current node is not in selected add it to the nodes which
							// got moved manually
							moveNodes.push(nodeData);
						}

						if (moveNodes.length > 1) {
							historyStore.startRecordingUndo();
						}
						// This does for some reason just get called once for the node that got clicked
						// even though "start" and "drag" gets called for all. So lets do for now
						// some dirty DOM query to get the new positions till I have more time to
						// create a proper solution
						let newNodePosition: XYPosition;
						moveNodes.forEach((node: INodeUi) => {
							const element = document.getElementById(node.id);
							if (element === null) {
								return;
							}

							newNodePosition = [
								parseInt(element.style.left!.slice(0, -2), 10),
								parseInt(element.style.top!.slice(0, -2), 10),
							];

							const updateInformation = {
								name: node.name,
								properties: {
									position: newNodePosition,
								},
							};
							const oldPosition = node.position;
							if (oldPosition[0] !== newNodePosition[0] || oldPosition[1] !== newNodePosition[1]) {
								historyStore.pushCommandToUndo(
									new ModMoveNodeCommand(node.name, oldPosition, newNodePosition, window.__instance),
								);
								workflowStore.updateNodeProperties(updateInformation);
								// this.$emit('moved', node);
							}
						});
						if (moveNodes.length > 1) {
							historyStore.stopRecordingUndo();
						}
					}
				},
				filter: '.node-description, .node-description .node-name, .node-description .node-subtitle',
			},
		});

		// @ts-ignore-next-line, null is a valid return type for setDragConstrainFunction
		newInstance.value.setDragConstrainFunction((pos: PointXY) => {
			const isReadOnly = uiStore.isReadOnly;
			console.log("🚀 ~ file: canvas.ts:147 ~ initInstance ~ isReadOnly", isReadOnly);
			if (isReadOnly) {
				// Do not allow to move nodes in readOnly mode
				return null;
			}
			return pos;
		});

		setupCanvasEvents();
	}

	function setupCanvasEvents() {
		if(!newInstance.value) return;

		newInstance.value.bind(EVENT_CONNECTION_ABORT, (connection: Connection) => {
			try {
				if (dropPrevented.value) {
					dropPrevented.value = false;
					return;
				}

				if (pullConnActiveNodeName.value) {
					const sourceNode = workflowStore.getNodeById(connection.parameters.nodeId);
					if (sourceNode) {
						const sourceNodeName = sourceNode.name;
						const outputIndex = connection.parameters.index;

						connectTwoNodes(sourceNodeName, outputIndex, pullConnActiveNodeName.value, 0, true);
						pullConnActiveNodeName.value = null;
					}
					return;
				}

				insertNodeAfterSelected({
					sourceId: connection.parameters.nodeId,
					index: connection.parameters.index,
					eventSource: 'node_connection_drop',
				});
			} catch (e) {
				console.error(e);  // eslint-disable-line no-console
			}
		});

		newInstance.value.bind(INTERCEPT_BEFORE_DROP, (info: BeforeDropParams) => {
			try {
				const sourceInfo = info.connection.endpoints[0].parameters;
				const targetInfo = info.dropEndpoint.parameters;

				const sourceNodeName = workflowStore.getNodeById(sourceInfo.nodeId)?.name || '';
				const targetNodeName = workflowStore.getNodeById(targetInfo.nodeId)?.name || '';

				// check for duplicates
				if (getConnection(sourceNodeName, sourceInfo.index, targetNodeName, targetInfo.index)) {
					dropPrevented.value = true;
					pullConnActiveNodeName.value = null;
					return false;
				}

				return true;
			} catch (e) {
				console.error(e);  // eslint-disable-line no-console
				return true;
			}
		});

		newInstance.value.bind(EVENT_CONNECTION, (info: ConnectionEstablishedParams) => {
			try {
				const sourceInfo = info.sourceEndpoint.parameters;
				const targetInfo = info.targetEndpoint.parameters;

				const sourceNodeName = workflowStore.getNodeById(sourceInfo.nodeId)?.name;
				const targetNodeName = workflowStore.getNodeById(targetInfo.nodeId)?.name;
				if(!sourceNodeName || !targetNodeName) return;

				info.connection.__meta = {
					sourceNodeName,
					sourceOutputIndex: sourceInfo.index,
					targetNodeName,
					targetOutputIndex: targetInfo.index,
				};

				resetConnection(info.connection);
				moveBackInputLabelPosition(info.targetEndpoint);

				const connectionData: [IConnection, IConnection] = [
					{
						node: sourceNodeName,
						type: sourceInfo.type,
						index: sourceInfo.index,
					},
					{
						node: targetNodeName,
						type: targetInfo.type,
						index: targetInfo.index,
					},
				];

				workflowStore.addConnection({
					connection: connectionData,
					setStateDirty: true,
				});
				if (!suspendRecordingDetachedConnections.value) {
					historyStore.pushCommandToUndo(new AddConnectionCommand(connectionData, window.__instance));
				}
				if (!uiStore.isReadOnly) {
					addConnectionActionsOverlay(info.connection,
						() => {
							activeConnection.value = null;
							__deleteJSPlumbConnection(info.connection);
						},
						() => {
							insertNodeAfterSelected({
								sourceId: info.sourceEndpoint.parameters.nodeId,
								index: sourceInfo.index,
								connection: info.connection,
								eventSource: 'node_connection_action',
							});
						});
				}
			} catch (e) {
				console.error(e); // eslint-disable-line no-console
			}
		});
		let exitTimer: NodeJS.Timeout | undefined;
		let enterTimer: NodeJS.Timeout | undefined;

		newInstance.value.bind(EVENT_DRAG_MOVE, (payload: DragStopPayload) => {
			newInstance.value?.connections
				.flatMap((connection) => Object.values(connection.overlays))
				.forEach((overlay) => {
					if(!overlay.canvas) return;
					newInstance.value?.repaint(overlay.canvas);
				});

		});

		newInstance.value.bind(EVENT_CONNECTION_MOUSEOVER, (connection: Connection) => {
			console.log('__DEBUG: Event: EVENT_CONNECTION_MOUSEOVER', connection);
			try {
				if (exitTimer !== undefined) {
					clearTimeout(exitTimer);
					exitTimer = undefined;
				}

				if (uiStore.isReadOnly || enterTimer || !connection || connection === activeConnection.value) return;

				// @ts-ignore
				hideConnectionActions(activeConnection.value);

				enterTimer = setTimeout(() => {
					enterTimer = undefined;
					if (connection) {
						showConnectionActions(connection);
						activeConnection.value = connection;
					}
				}, 150);
			} catch (e) {
				console.error(e); // eslint-disable-line no-console
			}
		});

		newInstance.value.bind(EVENT_CONNECTION_MOUSEOUT, (connection: Connection) => {
			try {
				if (exitTimer) return;

				if (enterTimer) {
					clearTimeout(enterTimer);
					enterTimer = undefined;
				}

				if (uiStore.isReadOnly || !connection || activeConnection.value !== connection) return;

				exitTimer = setTimeout(() => {
					exitTimer = undefined;

					if (connection && activeConnection.value === connection) {
						// @ts-ignore
						hideConnectionActions(activeConnection.value);
						activeConnection.value = null;
					}
				}, 500);
			} catch (e) {
				console.error(e); // eslint-disable-line no-console
			}
		});

		newInstance.value.bind(EVENT_CONNECTION_MOVED, (info: ConnectionMovedParams) => {
			try {
				// When a connection gets moved from one node to another it for some reason
				// calls the "connection" event but not the "connectionDetached" one. So we listen
				// additionally to the "connectionMoved" event and then only delete the existing connection.

				resetInputLabelPosition(info.connection);

				const sourceInfo = info.connection.parameters;
				const targetInfo = info.originalEndpoint.parameters;

				const connectionInfo = [
					{
						node: workflowStore.getNodeById(sourceInfo.nodeId)?.name || '',
						type: sourceInfo.type,
						index: sourceInfo.index,
					},
					{
						node: workflowStore.getNodeById(targetInfo.nodeId)?.name || '',
						type: targetInfo.type,
						index: targetInfo.index,
					},
				] as [IConnection, IConnection];

				__removeConnection(connectionInfo, false);
			} catch (e) {
				console.error(e); // eslint-disable-line no-console
			}
		});
		newInstance.value.bind(EVENT_ENDPOINT_MOUSEOVER, (endpoint: Endpoint, mouse) => {
			// This event seems bugged. It gets called constantly even when the mouse is not over the endpoint
			// if the endpoint has a connection attached to it. So we need to check if the mouse is actually over
			// the endpoint.
			if (!endpoint.isTarget || mouse.target !== endpoint.endpoint.canvas) return;
			endpoint.instance.setHover(endpoint, true);
		});
		newInstance.value.bind(EVENT_ENDPOINT_MOUSEOUT, (endpoint: Endpoint) => {
			if (!endpoint.isTarget) return;
			endpoint.instance.setHover(endpoint, false);
		});
		newInstance.value.bind(EVENT_CONNECTION_DETACHED, async(info: ConnectionDetachedParams) => {
			try {
				const connectionInfo: [IConnection, IConnection] | null = getConnectionInfo(info);
				resetInputLabelPosition(info.targetEndpoint);
				info.connection.removeOverlays();
				__removeConnectionByConnectionInfo(info, false, false);

				if (pullConnActiveNodeName.value) { // establish new connection when dragging connection from one node to another
					historyStore.startRecordingUndo();
					const sourceNode = workflowStore.getNodeById(info.connection.parameters.nodeId);
					const sourceNodeName = sourceNode.name;
					const outputIndex = info.connection.parameters.index;

					if (connectionInfo) {
						historyStore.pushCommandToUndo(new RemoveConnectionCommand(connectionInfo, window.__instance));
					}
					connectTwoNodes(sourceNodeName, outputIndex, pullConnActiveNodeName.value, 0, true);
					pullConnActiveNodeName.value = null;
					await nextTick();
					historyStore.stopRecordingUndo();
				} else if (!historyStore.bulkInProgress && !suspendRecordingDetachedConnections.value && connectionInfo) {
					// Ff connection being detached by user, save this in history
					// but skip if it's detached as a side effect of bulk undo/redo or node rename process
					const removeCommand = new RemoveConnectionCommand(connectionInfo, window.__instance);
					historyStore.pushCommandToUndo(removeCommand);
				}
			} catch (e) {
				console.error(e); // eslint-disable-line no-console
			}
		});
		newInstance.value.bind(EVENT_CONNECTION_DRAG, (connection: Connection) => {
			// The overlays are visible by default so we need to hide the midpoint arrow
			// manually
			connection.overlays['midpoint-arrow']?.setVisible(false);
			try {
				pullConnActiveNodeName.value = null;
				pullConnActive.value = true;
				newNodeInsertPosition.value = null;
				resetConnection(connection);

				const nodes = [...document.querySelectorAll('.node-wrapper')];

				const onMouseMove = (e: MouseEvent | TouchEvent) => {
					if (!connection) {
						return;
					}

					const element = document.querySelector('.jtk-endpoint.jtk-drag-hover');
					if (element) {
						const endpoint = element.jtk.endpoint;
						showDropConnectionState(connection, endpoint);
						return;
					}

					const inputMargin = 24;
					const intersecting = nodes.find((element: Element) => {
						const { top, left, right, bottom } = element.getBoundingClientRect();
						const [x, y] = getMousePosition(e);
						if (top <= y && bottom >= y && (left - inputMargin) <= x && right >= x) {
							const nodeName = (element as HTMLElement).dataset['name'] as string;
							const node = workflowStore.getNodeByName(nodeName) as INodeUi | null;
							if (node) {
								const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
								if (nodeType && nodeType.inputs && nodeType.inputs.length === 1) {
									pullConnActiveNodeName.value = node.name;
									const endpointUUID = getInputEndpointUUID(nodeName, 0);
									if (endpointUUID) {
										const endpoint = newInstance.value?.getEndpoint(endpointUUID);

										showDropConnectionState(connection, endpoint);

										return true;
									}
								}
							}
						}

						return false;
					});

					if (!intersecting) {
						showPullConnectionState(connection);
						pullConnActiveNodeName.value = null;
					}
				};

				const onMouseUp = (e: MouseEvent | TouchEvent) => {
					pullConnActive.value = false;
					newNodeInsertPosition.value = getMousePositionWithinNodeView(e);
					resetConnectionAfterPull(connection);
					window.removeEventListener('mousemove', onMouseMove);
					window.removeEventListener('mouseup', onMouseUp);
				};

				window.addEventListener('mousemove', onMouseMove);
				window.addEventListener('touchmove', onMouseMove);
				window.addEventListener('mouseup', onMouseUp);
				window.addEventListener('touchend', onMouseMove);
			} catch (e) {
				console.error(e); // eslint-disable-line no-console
			}
		});

		newInstance.value.bind(
			[EVENT_CONNECTION_DRAG, EVENT_CONNECTION_ABORT, EVENT_CONNECTION_DETACHED],
			(connection: Connection) => {
				Object.values(newInstance.value?.endpointsByElement || {})
					.flatMap((endpoints) => Object.values(endpoints))
					.filter((endpoint) => endpoint.endpoint.type === 'N8nPlus')
					.forEach((endpoint) => setTimeout(() => endpoint.instance.revalidate(endpoint.element), 0));
			},
		);

		newInstance.value.bind(('plusEndpointClick'), (endpoint: Endpoint) => {
			if (endpoint && endpoint.__meta) {
				insertNodeAfterSelected({
					sourceId: endpoint.__meta.nodeId,
					index: endpoint.__meta.index,
					eventSource: 'plus_endpoint',
				});
			}
		});
	}
	function __removeConnection(connection: [IConnection, IConnection], removeVisualConnection = false) {
		if (removeVisualConnection) {
			const sourceNode = workflowStore.getNodeByName(connection[0].node);
			const targetNode = workflowStore.getNodeByName(connection[1].node);

			if (!sourceNode || !targetNode) {
				return;
			}
			const connections = newInstance.value?.getConnections({
				source: sourceNode.Id,
				target: targetNode.Id,
			});
			if(!connections) return;

			console.log('__DEBUG: Connections?', connections);
			connections.forEach((connectionInstance: Connection) => {
				console.log('__DEBUG: Connections for each?', connections);
				if (connectionInstance.__meta) {
					// Only delete connections from specific indexes (if it can be determined by meta)
					if (
						connectionInstance.__meta.sourceOutputIndex === connection[0].index &&
						connectionInstance.__meta.targetOutputIndex === connection[1].index
					) {
						__deleteJSPlumbConnection(connectionInstance);
					}
				} else {
					__deleteJSPlumbConnection(connectionInstance);
				}
			});
		}

		workflowStore.removeConnection({ connection });
	}
	function setSuspendRecordingDetachedConnections(suspend: boolean) {
		suspendRecordingDetachedConnections.value = suspend;
	}
	function getMousePositionWithinNodeView(event: MouseEvent | TouchEvent): XYPosition {
		const [x, y] = getMousePosition(event);
		const sidebarOffset = isDemo.value
			? 0
			: uiStore.sidebarMenuCollapsed
			? SIDEBAR_WIDTH
			: SIDEBAR_WIDTH_EXPANDED;
		const headerOffset = isDemo.value ? 0 : HEADER_HEIGHT;

		return getRelativePosition(
			x - sidebarOffset,
			y - headerOffset,
			nodeViewScale.value,
			uiStore.nodeViewOffsetPosition,
		);
	}

	function __deleteJSPlumbConnection(connection: Connection, trackHistory = false) {
		// Make sure to remove the overlay else after the second move
		// it visibly stays behind free floating without a connection.
		connection.removeOverlays();

		const sourceEndpoint = connection.endpoints?.[0];
		pullConnActiveNodeName.value = null; // prevent new connections when connectionDetached is triggered
		newInstance.value?.deleteConnection(connection); // on delete, triggers connectionDetached event which applies mutation to store
		if (sourceEndpoint) {
			const endpoints = newInstance.value?.getEndpoints(sourceEndpoint.element) || [];
			endpoints.forEach((endpoint: Endpoint) => newInstance.value?.repaint(endpoint.element)); // repaint both circle and plus endpoint
		}
		if (trackHistory && connection.__meta) {
			const connectionData: [IConnection, IConnection] = [
				{
					index: connection.__meta?.sourceOutputIndex,
					node: connection.__meta.sourceNodeName,
					type: 'main',
				},
				{
					index: connection.__meta?.targetOutputIndex,
					node: connection.__meta.targetNodeName,
					type: 'main',
				},
			];
			const removeCommand = new RemoveConnectionCommand(connectionData, window.__instance);
			historyStore.pushCommandToUndo(removeCommand);
		}
	}
	function __removeConnectionByConnectionInfo(info: ConnectionDetachedParams, removeVisualConnection = false, trackHistory = false) {
		const connectionInfo: [IConnection, IConnection] | null = getConnectionInfo(info);

		if (connectionInfo) {
			if (removeVisualConnection) {
				__deleteJSPlumbConnection(info.connection, trackHistory);
			} else if (trackHistory) {
				historyStore.pushCommandToUndo(new RemoveConnectionCommand(connectionInfo, window.__instance));
			}
			workflowStore.removeConnection({ connection: connectionInfo });
		}
	}
	function insertNodeAfterSelected (info: {
		sourceId: string;
		index: number;
		eventSource: string;
		connection?: Connection;
	}) {
		// Get the node and set it as active that new nodes
		// which get created get automatically connected
		// to it.
		const sourceNode = workflowStore.getNodeById(info.sourceId);
		if (!sourceNode) return;

		uiStore.lastSelectedNode = sourceNode.name;
		uiStore.lastSelectedNodeOutputIndex = info.index;
		newNodeInsertPosition.value = null;

		if (info.connection) {
			lastSelectedConnection.value = info.connection;
		}

		useNodeCreatorStore().toggleNodeCreator({ source: info.eventSource, createNodeActive: true });
	}
	function getConnection(
		sourceNodeName: string,
		sourceNodeOutputIndex: number,
		targetNodeName: string,
		targetNodeOutputIndex: number,
	): IConnection | undefined {
		const nodeConnections = (
			workflowStore.outgoingConnectionsByNodeName(sourceNodeName) as INodeConnections
		).main;
		if (nodeConnections) {
			const connections: IConnection[] | null = nodeConnections[sourceNodeOutputIndex];

			if (connections) {
				return connections.find(
					(connection: IConnection) =>
						connection.node === targetNodeName && connection.index === targetNodeOutputIndex,
				);
			}
		}

		return undefined;
	}
	function getOutputEndpointUUID(nodeName: string, index: number): string | null {
		const node = workflowStore.getNodeByName(nodeName);
		if (!node) {
			return null;
		}

		return getOutputEndpointUUIDUtils(node.id, index);
	}
	function __addConnection(connection: [IConnection, IConnection], addVisualConnection = false) {
		if (addVisualConnection) {
			const outputUuid = getOutputEndpointUUID(connection[0].node, connection[0].index);
			const inputUuid = getInputEndpointUUID(connection[1].node, connection[1].index);
			if (!outputUuid || !inputUuid) {
				return;
			}

			const uuid: [string, string] = [outputUuid, inputUuid];
			// Create connections in DOM
			newInstance.value?.connect({
				uuids: uuid,
				detachable: !uiStore.isReadOnly,
			});
		} else {
			const connectionProperties = { connection, setStateDirty: false };
			// When nodes get connected it gets saved automatically to the storage
			// so if we do not connect we have to save the connection manually
			workflowStore.addConnection(connectionProperties);
		}

		setTimeout(() => {
			if(workflowStore.workflow.pinData) {
				addPinDataConnections(workflowStore.workflow.pinData);
			}
		});
	}
	function addPinDataConnections(pinData: IPinData) {
		Object.keys(pinData).forEach((nodeName) => {
			const node = workflowStore.getNodeByName(nodeName);
			if (!node) return;

			const connections = newInstance.value?.getConnections({
				// @ts-ignore
				source: node.id,
			}) as Connection[];

			connections.forEach((connection) => {
				addConnectionOutputSuccess(connection, {
					total: pinData[nodeName].length,
					iterations: 0,
				});
			});
		});
	}
	function connectTwoNodes(
		sourceNodeName: string,
		sourceNodeOutputIndex: number,
		targetNodeName: string,
		targetNodeOutputIndex: number,
		trackHistory = false,
	) {
		if (
			getConnection(
				sourceNodeName,
				sourceNodeOutputIndex,
				targetNodeName,
				targetNodeOutputIndex,
			)
		) {
			return;
		}

		const connectionData = [
			{
				node: sourceNodeName,
				type: 'main',
				index: sourceNodeOutputIndex,
			},
			{
				node: targetNodeName,
				type: 'main',
				index: targetNodeOutputIndex,
			},
		] as [IConnection, IConnection];

		__addConnection(connectionData, true);
	}

	function getInputEndpointUUID(nodeName: string, index: number) {
		const node = workflowStore.getNodeByName(nodeName);
		if (!node) {
			return null;
		}

		return getInputEndpointUUIDUtils(node.id, index);
	}

	function removePinDataConnections(pinData: IPinData) {
		Object.keys(pinData).forEach((nodeName) => {
			const node = workflowStore.getNodeByName(nodeName);
			if (!node) return;

			const connections = newInstance.value?.getConnections({
				// @ts-ignore
				source: node.id,
			}) as Connection[];

			connections.forEach(resetConnection);
		});
	}
	function translateName(type: string, originalName: string) {
		return i18n.headerText({
			key: `headers.${i18n.shortNodeType(type)}.displayName`,
			fallback: originalName,
		});
	}
	function getUniqueNodeName({
		originalName,
		additionalUsedNames = [],
		type = '',
	}: {
		originalName: string;
		additionalUsedNames?: string[];
		type?: string;
	}) {
		const allNodeNamesOnCanvas = workflowStore.allNodes.map((n: INodeUi) => n.name);
		originalName = useRootStore().defaultLocale === 'en' ? originalName : translateName(type, originalName);

		if (
			!allNodeNamesOnCanvas.includes(originalName) &&
			!additionalUsedNames.includes(originalName)
		) {
			return originalName; // already unique
		}

		let natives: string[] = useRootStore().nativelyNumberSuffixedDefaults;
		natives = useRootStore().defaultLocale === 'en'
			? natives
			: natives.map((name) => {
					const type = name.toLowerCase().replace('_', '');
					return translateName(type, name);
				});

		const found = natives.find((n) => originalName.startsWith(n));

		let ignore, baseName, nameIndex, uniqueName;
		let index = 1;

		if (found) {
			// name natively ends with number
			nameIndex = originalName.split(found).pop();
			if (nameIndex) {
				index = parseInt(nameIndex, 10);
			}
			baseName = uniqueName = found;
		} else {
			const nameMatch = originalName.match(/(.*\D+)(\d*)/);

			if (nameMatch === null) {
				// name is only a number
				index = parseInt(originalName, 10);
				baseName = '';
				uniqueName = baseName + index;
			} else {
				// name is string or string/number combination
				[ignore, baseName, nameIndex] = nameMatch;
				if (nameIndex !== '') {
					index = parseInt(nameIndex, 10);
				}
				uniqueName = baseName;
			}
		}

		while (
			allNodeNamesOnCanvas.includes(uniqueName) ||
			additionalUsedNames.includes(uniqueName)
		) {
			uniqueName = baseName + index++;
		}

		return uniqueName;
	}

	function matchCredentials (node: INodeUi) {
		if (!node.credentials) {
			return;
		}
		Object.entries(node.credentials).forEach(
			([nodeCredentialType, nodeCredentials]: [string, INodeCredentialsDetails]) => {
				const credentialOptions = useCredentialsStore().getCredentialsByType(nodeCredentialType);

				// Check if workflows applies old credentials style
				if (typeof nodeCredentials === 'string') {
					nodeCredentials = {
						id: null,
						name: nodeCredentials,
					};
					credentialsUpdated.value = true;
				}

				if (nodeCredentials.id) {
					// Check whether the id is matching with a credential
					const credentialsId = nodeCredentials.id.toString(); // due to a fixed bug in the migration UpdateWorkflowCredentials (just sqlite) we have to cast to string and check later if it has been a number
					const credentialsForId = credentialOptions.find(
						(optionData: ICredentialsResponse) => optionData.id === credentialsId,
					);
					if (credentialsForId) {
						if (
							credentialsForId.name !== nodeCredentials.name ||
							typeof nodeCredentials.id === 'number'
						) {
							node.credentials![nodeCredentialType] = {
								id: credentialsForId.id,
								name: credentialsForId.name,
							};
							credentialsUpdated.value = true;
						}
						return;
					}
				}

				// No match for id found or old credentials type used
				node.credentials![nodeCredentialType] = nodeCredentials;

				// check if only one option with the name would exist
				const credentialsForName = credentialOptions.filter(
					(optionData: ICredentialsResponse) => optionData.name === nodeCredentials.name,
				);

				// only one option exists for the name, take it
				if (credentialsForName.length === 1) {
					node.credentials![nodeCredentialType].id = credentialsForName[0].id;
					credentialsUpdated.value = true;
				}
			},
		);
	}

	function deleteEveryEndpoint() {
		// Check as it does not exist on first load
		if (newInstance.value) {
			Object.values(newInstance.value.endpointsByElement)
				.flatMap((endpoint) => endpoint)
				.forEach((endpoint) => endpoint.destroy());

			newInstance.value.deleteEveryConnection({ fireEvent: true});
		}
	}
	async function addNodes(nodes: INodeUi[], connections?: IConnection, trackHistory = false) {
		if (!nodes || !nodes.length) {
			return;
		}

		// Before proceeding we must check if all nodes contain the `properties` attribute.
		// Nodes are loaded without this information so we must make sure that all nodes
		// // being added have this information.
		// await this.loadNodesProperties(nodes.map(node => ({ name: node.type, version: node.typeVersion })));

		// Add the node to the node-list
		let nodeType: INodeTypeDescription | null;
		let foundNodeIssues: INodeIssues | null;
		nodes.forEach((node) => {
			if (!node.id) {
				node.id = uuid();
			}

			nodeType = useNodeTypesStore().getNodeType(node.type, node.typeVersion);

			// Make sure that some properties always exist
			if (!node.hasOwnProperty('disabled')) {
				node.disabled = false;
			}

			if (!node.hasOwnProperty('parameters')) {
				node.parameters = {};
			}

			// Load the defaul parameter values because only values which differ
			// from the defaults get saved
			if (nodeType !== null) {
				let nodeParameters = null;
				try {
					nodeParameters = NodeHelpers.getNodeParameters(
						nodeType.properties,
						node.parameters,
						true,
						false,
						node,
					);
				} catch (e) {
					console.error(
						i18n.baseText('nodeView.thereWasAProblemLoadingTheNodeParametersOfNode') +
							`: "${node.name}"`,
					); // eslint-disable-line no-console
					console.error(e); // eslint-disable-line no-console
				}
				node.parameters = nodeParameters !== null ? nodeParameters : {};

				// if it's a webhook and the path is empty set the UUID as the default path
				if (node.type === WEBHOOK_NODE_TYPE && node.parameters.path === '') {
					node.parameters.path = node.webhookId as string;
				}
			}

			// check and match credentials, apply new format if old is used
			matchCredentials(node);

			foundNodeIssues = getNodeIssues(nodeType, node);

			if (foundNodeIssues !== null) {
				node.issues = foundNodeIssues;
			}

			workflowStore.addNode(node);
			if (trackHistory) {
				historyStore.pushCommandToUndo(new AddNodeCommand(node));
			}
		});

		// Wait for the node to be rendered
		await Vue.nextTick();

		// Suspend drawing
		newInstance.value?.setSuspendDrawing(true);

		// Load the connections
		if (connections !== undefined) {
			let connectionData;
			for (const sourceNode of Object.keys(connections)) {
				for (const type of Object.keys(connections[sourceNode])) {
					for (
						let sourceIndex = 0;
						sourceIndex < connections[sourceNode][type].length;
						sourceIndex++
					) {
						const outwardConnections = connections[sourceNode][type][sourceIndex];
						if (!outwardConnections) {
							continue;
						}
						outwardConnections.forEach((targetData) => {
							connectionData = [
								{
									node: sourceNode,
									type,
									index: sourceIndex,
								},
								{
									node: targetData.node,
									type: targetData.type,
									index: targetData.index,
								},
							] as [IConnection, IConnection];

							__addConnection(connectionData, true);
						});
					}
				}
			}
		}

		// Now it can draw again
		newInstance.value?.setSuspendDrawing(false, true);
	}
	async function renameNode(currentName: string, newName: string, trackHistory = false) {
		if (currentName === newName) return;

		setSuspendRecordingDetachedConnections(true);
		if (trackHistory) {
			historyStore.startRecordingUndo();
		}
		const activeNodeName = useNDVStore().activeNode?.name;
		const isActive = activeNodeName === currentName;
		if (isActive) {
			renamingActive.value = true;
		}

		// Check if node-name is unique else find one that is
		newName = getUniqueNodeName({
			originalName: newName,
		});

		// Rename the node and update the connections
		const workflow = workflowStore.getCurrentWorkflow(true);
		workflow.renameNode(currentName, newName);

		if (trackHistory) {
			historyStore.pushCommandToUndo(new RenameNodeCommand(currentName, newName));
		}

		// Update also last selected node and execution data
		workflowStore.renameNodeSelectedAndExecution({ old: currentName, new: newName });

		// Reset all nodes and connections to load the new ones
		deleteEveryEndpoint();

		workflowStore.removeAllConnections({ setStateDirty: false });
		workflowStore.removeAllNodes({ removePinData: false, setStateDirty: true });

		// Wait a tick that the old nodes had time to get removed
		await nextTick();

		// Add the new updated nodes
		await this.addNodes(Object.values(workflow.nodes), workflow.connectionsBySourceNode, false);

		// Make sure that the node is selected again
		this.deselectAllNodes();
		this.nodeSelectedByName(newName);

		if (isActive) {
			this.ndvStore.activeNodeName = newName;
			renamingActive.value = false;
		}

		if (trackHistory) {
			historyStore.stopRecordingUndo();
		}
		setSuspendRecordingDetachedConnections(false);
	}
	return {
		isDemo,
		nodeViewScale,
		canvasAddButtonPosition,
		newInstance,
		suspendRecordingDetachedConnections,
		pullConnActive,
		renamingActive,
		credentialsUpdated,
		setCredentialsUpdated,
		setRenamingActive,
		setCenteredCanvasAddButtonPosition,
		getNodesWithPlaceholderNode,
		setZoomLevel,
		resetZoom,
		zoomIn,
		zoomOut,
		zoomToFit,
		wheelScroll,
		initInstance,
		getInputEndpointUUID,
		getOutputEndpointUUID,
		getConnection,
		connectTwoNodes,
		addConnectionOutputSuccess,
		insertNodeAfterSelected,
		getMousePositionWithinNodeView,
		addPinDataConnections,
		removePinDataConnections,
		setSuspendRecordingDetachedConnections,
		onMoveNode,
		deleteEveryEndpoint,
		__removeConnection,
		__addConnection,
		__deleteJSPlumbConnection,
		__removeConnectionByConnectionInfo,
	};
});
