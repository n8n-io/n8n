export {
	CRDTState,
	WorkflowRoom,
	type CRDTEdge,
	type ComputedHandle,
	type NodeSeedData,
	type WorkflowSeedData,
} from './crdt-state';
export {
	subscribeToNode,
	subscribeToParameter,
	subscribeToNodeParameters,
	createBatchedNodesSubscription,
} from './crdt-subscriptions';
export {
	ParameterTransformer,
	createParameterTransformer,
	type NodeForTransform,
} from './parameter-transformer';
export { CRDTWebSocketService } from './crdt-websocket.service';
export { syncWorkflowWithDoc } from './sync-workflow-with-doc';
export { calculateNodeSize, type NodeSizeInputs } from './node-size-calculator';

// Re-export utilities from @n8n/crdt for convenience
export { seedValueDeep, toJSON, getNestedValue, setNestedValue } from '@n8n/crdt';
