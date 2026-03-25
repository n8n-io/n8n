import { isIterable } from "./utils.js";
/**
 * Converts SDK content blocks into serializable objects.
 * Matches Python's flatten_content_blocks behavior.
 */
export function flattenContentBlocks(content) {
    if (!Array.isArray(content)) {
        return content;
    }
    return content.map((block) => {
        if (!block || typeof block !== "object" || !("type" in block)) {
            return block;
        }
        const blockType = block.type;
        switch (blockType) {
            case "text":
                return { type: "text", text: block.text || "" };
            case "thinking":
                return {
                    type: "thinking",
                    thinking: block.thinking || "",
                    signature: block.signature || "",
                };
            case "tool_use":
                return {
                    type: "tool_use",
                    id: block.id,
                    name: block.name,
                    input: block.input,
                };
            case "tool_result":
                return {
                    type: "tool_result",
                    tool_use_id: block.tool_use_id,
                    content: block.content,
                    is_error: block.is_error || false,
                };
            default:
                return block;
        }
    });
}
/**
 * Utility function to convert an Anthropic message to a LangSmith-compatible message.
 * @internal
 */
export function convertFromAnthropicMessage(sdkMessage) {
    if (sdkMessage == null)
        return [];
    if (typeof sdkMessage === "string") {
        return [{ content: sdkMessage, role: "user" }];
    }
    if (isIterable(sdkMessage)) {
        return Array.from(sdkMessage).flatMap(convertFromAnthropicMessage);
    }
    if (typeof sdkMessage !== "object" ||
        sdkMessage == null ||
        !("message" in sdkMessage) ||
        (sdkMessage.type !== "assistant" && sdkMessage.type !== "user")) {
        return [];
    }
    const { role = sdkMessage.type, content, ...rest } = sdkMessage.message;
    const flattened = flattenContentBlocks(content);
    const toolResultBlocks = role === "user" && Array.isArray(flattened)
        ? flattened.filter(isToolResultBlock)
        : [];
    if (toolResultBlocks.length > 0) {
        return toolResultBlocks.map((block) => ({ ...block, role: "tool" }));
    }
    return [{ ...rest, content: flattened, role }];
}
function isToolResultBlock(block) {
    if (typeof block !== "object" || block == null)
        return false;
    if (!("type" in block))
        return false;
    return block.type === "tool_result";
}
/**
 * Type assertion to check if a tool is a Task tool
 * @param tool - The tool to check
 * @returns True if the tool is a Task tool, false otherwise
 * @internal
 */
export function isTaskTool(tool) {
    return tool.type === "tool_use" && tool.name === "Task";
}
/**
 * Type-assertion to check for tool blocks
 * @internal
 */
export function isToolBlock(block) {
    if (!block || typeof block !== "object")
        return false;
    return block.type === "tool_use";
}
