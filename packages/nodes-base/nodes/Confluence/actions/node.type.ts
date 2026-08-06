import type { AllEntities } from 'n8n-workflow';

// Op tickets narrow this map with their `resource: 'operation' | ...` entries
// (SharePoint shape: nodes/Microsoft/SharePoint/v2/actions/node.type.ts)
type NodeMap = Record<string, string>;

export type ConfluenceType = AllEntities<NodeMap>;
