import type { DynamicStructuredTool } from '@langchain/core/tools';
import { Toolkit } from 'langchain/agents';

// Re-export utilities from MCP client that we use
export {
	convertMcpContentToLangChain,
	createCallTool,
	mcpToolToDynamicTool,
	type McpContentItem,
} from '../../mcp/McpClientTool/utils';

export class ComputerUseToolkit extends Toolkit {
	constructor(public tools: DynamicStructuredTool[]) {
		super();
	}
}
