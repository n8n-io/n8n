import { RssFeedRead } from 'n8n-nodes-base/dist/nodes/RssFeedRead/RssFeedRead.node';
import { Airtable } from 'n8n-nodes-base/dist/nodes/Airtable/Airtable.node';
import { nodeToTool } from '../utils/toolWrapper';

// TODO figure out how to create many tools from a list of nodes; that we don't need to call `wrappedTools` here...
export const wrappedTools = nodeToTool(Airtable);
