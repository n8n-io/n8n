import { LINEAR_READ_TOOLS } from './linear-tools';

export type ToolRoute = 'read' | 'write';

// Only an exact read-list match is a read. Unknown tools are writes.
export function classifyTool(name: string): ToolRoute {
	return LINEAR_READ_TOOLS.has(name) ? 'read' : 'write';
}
