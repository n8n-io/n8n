# Announcement Formatting & Persistence Code Changes

Due to Git status being unreliable (everything showing as green/new), here is the comprehensive log of exactly which files were modified and what code was changed or added to implement the clean `[Announcement]` AI formatting and Redis persistence.

All changes occurred within the `@n8n/nodes-langchain` package:
**Directory:** `packages/@n8n/nodes-langchain/utils/agent-execution/`

---

## 1. `types.ts`
**Purpose:** Added the `realLlmContent` field to the types so that the clean announcement text can flow through the execution pipeline.

**Changes made:**
Around line 157, inside the `RequestResponseMetadata` type definition:
```typescript
	/** HITL (Human-in-the-Loop) metadata - presence indicates this is an HITL tool action */
	hitl?: HitlMetadata;
	/** User-facing text streamed to client before tool call (no reasoning). */
	realLlmContent?: string;
};
```
And inside `ToolCallRequest` or wherever the action typing was directly referenced to allow the field to flow through engine metadata.

---

## 2. `processEventStream.ts`
**Purpose:** Ensure that when Gemini streams content back, we extract only the clean string text and ignore the raw JSON reasoning blocks/function calls.

**Changes made:**
Added a new helper function at the top of the file (or outside the main export):
```typescript
/**
 * Safely extracts only the string text from Gemini's array-style content blocks,
 * ignoring function calls and reasoning blocks.
 */
function extractTextContent(content: unknown): string | undefined {
	if (typeof content === 'string') return content;
	if (Array.isArray(content)) {
		const text = content
			.filter(
				(block: Record<string, unknown>) =>
					block && typeof block === 'object' && block.type === 'text' && block.text,
			)
			.map((block: Record<string, unknown>) => block.text as string)
			.join('');
		return text.trim() || undefined;
	}
	return undefined;
}
```

Updated the `log` assignment inside `on_chat_model_end` when collecting tool calls:
```typescript
log:
	(agentResult.output?.trim()) ||
	extractTextContent(output.content) ||
	`Calling ${toolCall.name} with input: ${JSON.stringify(toolCall.args)}`,
```

---

## 3. `createEngineRequests.ts`
**Purpose:** Because the streaming path (`processEventStream`) isn't always invoked (LangChain non-streaming `invoke` path), we added logic here to parse the original LLM `AIMessage` and extract the announcement text to pass to the engine.

**Changes made:**
Updated the `metadata` object mapping:
```typescript
metadata: {
	itemIndex,
	hitl: hitlMetadata,
	...extractThinkingMetadata(toolCall, sharedMessageLog, sharedAdditionalKwargs),
	realLlmContent: extractAnnouncementText(toolCall, sharedMessageLog), // <-- ADDED
},
```

Added the parsing helper function:
```typescript
/**
 * Extracts clean user-facing announcement text from a tool call's messageLog.
 * The messageLog[0] contains the original AIMessage from the LLM.
 */
function extractAnnouncementText(
	toolCall: ToolCallRequest,
	sharedMessageLog: unknown[] | undefined,
): string | undefined {
	const effectiveMessageLog =
		toolCall.messageLog && toolCall.messageLog.length > 0
			? toolCall.messageLog
			: sharedMessageLog;

	if (!effectiveMessageLog || effectiveMessageLog.length === 0) return undefined;

	const firstMessage = effectiveMessageLog[0];
	if (!firstMessage || typeof firstMessage !== 'object' || !('content' in firstMessage)) {
		return undefined;
	}

	const content = (firstMessage as { content: unknown }).content;

	if (typeof content === 'string') {
		return content.trim() || undefined;
	}

	if (Array.isArray(content)) {
		const text = content
			.filter(
				(b: Record<string, unknown>) => b && typeof b === 'object' && b.type === 'text' && b.text,
			)
			.map((b: Record<string, unknown>) => b.text as string)
			.join('');
		return text.trim() || undefined;
	}

	return undefined;
}
```

---

## 4. `buildSteps.ts`
**Purpose:** Prepends the clean announcement text as a distinct message in the `messageLog` before the synthetic "Calling tool..." message. This ensures the LLM sees what it just said.

**Changes made:**
Around line 382, right before `steps.push({...})`:
```typescript
		const realLlmContent = tool.action.metadata?.realLlmContent;
		if (realLlmContent && messageLog.length > 0) {
			messageLog.unshift(
				new AIMessage({
					content: `[Announcement] ${realLlmContent}`,
				}),
			);
		}

		steps.push({
			action: {
				tool: toolName,
				toolInput: toolInputForResult,
				log: toolInput.log || (messageLog[0]?.content ?? `Calling ${nodeName}`),
				messageLog, // <-- This now has the prepended Announcement
				toolCallId: toolInput?.id,
				type: toolInput.type || 'tool_call',
				realLlmContent: tool.action.metadata?.realLlmContent, // <-- Keep reference
			},
			observation,
		});
```

---

## 5. `memoryManagement.ts`
**Purpose:** Extracts the announcement text stored in the step action and saves it to Redis memory as a separate distinct message, so it survives multi-turn conversations.

**Changes made:**
Inside the `buildMessagesFromSteps` function (around line 110), right before `messages.push(toolMessage)`:

```typescript
		// If announcement text is available, push it as a separate message first
		// so the LLM has context of what it streamed to the user before the tool call
		if (step.action.realLlmContent) {
			messages.push(new AIMessage({
				content: `[Announcement] ${step.action.realLlmContent}`,
				additional_kwargs: { _n8n_memory_role: 'stream_announcement' },
			}));
		}

		// Add both messages (the synthetic tool calling AI message & the tool observation)
		messages.push(aiMessage);
		messages.push(toolMessage);
```

---

## 6. `start-backend.sh` (Root Script)
**Purpose:** Added a step to automatically compile the TypeScript files in `@n8n/nodes-langchain` to `.js` files in the `dist/` directory before `pnpm dev` starts the backend server.

**Changes made:**
```bash
# Build the nodes-langchain package so dist/ reflects latest TS changes
echo "Building @n8n/nodes-langchain..."
(cd ../\@n8n/nodes-langchain && pnpm build)
echo "Build complete. Starting backend..."
```
*(You manually commented this out later once compilation was successful to save boot time, which is totally fine!)*
