# Intermediate Memory Persistence & Toggle Code Changes

Due to Git status showing many files as modified in the local environment, here is the comprehensive log of exactly which files were modified and what code was changed or added to implement the configurable `storeAnnouncements` Redis toggle, as well as the Mid-Turn Intermediate Memory Saves for Tool Workflows.

All changes occurred within the `@n8n/nodes-langchain` package:

---

## 1. `nodes/memory/MemoryRedisChat/MemoryRedisChat.node.ts`
**Purpose:** Add a user-facing toggle to the Redis Chat Memory node allowing users to control whether the `[Announcement]` messages are persisted to Redis or ignored.

**Changes made:**
Added a new boolean property to the node descriptions (around line 105):
```typescript
{
	displayName: 'Store Announcements',
	name: 'storeAnnouncements',
	type: 'boolean',
	default: false,
	description: 'Whether to store AI streaming announcements as separate AI messages in the Redis history',
},
```

Inside the `supplyData` function, we extracted this parameter and injected it into the Memory instance so that downstream execution utilities can read it:
```typescript
const storeAnnouncements = this.getNodeParameter('storeAnnouncements', false) as boolean;
(memory as any).storeAnnouncements = storeAnnouncements;
```

---

## 2. `utils/agent-execution/memoryManagement.ts` (Toggle Logic)
**Purpose:** Update the `buildMessagesFromSteps` logic to conditionally include the announcement message based on the toggle.

**Changes made:**
Updated the `buildMessagesFromSteps` signature to accept the boolean parameter (defaulting to `true` for backwards-compatibility):
```typescript
export function buildMessagesFromSteps(
	steps: AgentStep[],
	storeAnnouncements: boolean = true,
): BaseMessage[] {
```

And conditionally pushed the announcement:
```typescript
if (storeAnnouncements && step.action.realLlmContent) {
	messages.push(
		new AIMessage({
			content: `[Announcement] ${step.action.realLlmContent}`,
			additional_kwargs: { _n8n_memory_role: 'stream_announcement' },
		}),
	);
}
```

Updated the final `saveToMemory` function to read the flag and pass it:
```typescript
const storeAnnouncements = (memory as any).storeAnnouncements !== false;
const messages = buildMessagesFromSteps(steps, storeAnnouncements);
```

---

## 3. `utils/agent-execution/memoryManagement.ts` (Intermediate Saves)
**Purpose:** Create a new function that forcibly writes the user's `HumanMessage` and the stream `[Announcement]` to Redis *immediately* in the middle of a turn, instead of waiting for the end of the execution. This ensures that custom Tool Workflows can read the latest context from Redis during execution.

**Changes made:**
Added and exported the `saveIntermediateMemory` function:
```typescript
export async function saveIntermediateMemory(
	input: string,
	memory: BaseChatMemory,
	announcement: string | undefined,
): Promise<void> {
	if (
		!('addMessages' in memory.chatHistory) ||
		typeof memory.chatHistory.addMessages !== 'function'
	) {
		return;
	}

	const messages: BaseMessage[] = [new HumanMessage(input)];

	const storeAnnouncements = (memory as any).storeAnnouncements !== false;
	if (storeAnnouncements && announcement) {
		messages.push(
			new AIMessage({
				content: `[Announcement] ${announcement}`,
				additional_kwargs: { _n8n_memory_role: 'stream_announcement' },
			}),
		);
	}

	await memory.chatHistory.addMessages(messages);
}
```

We also had to update `saveToMemory` to prevent it from re-saving the `HumanMessage` at the end of the turn if the intermediate save already ran:
```typescript
if (previousStepsCount === 0 || previousStepsCount === undefined) {
	await memory.chatHistory.addUserMessage(input);
}
```

---

## 4. `utils/agent-execution/index.ts`
**Purpose:** Export the new `saveIntermediateMemory` function so it can be used inside the Agent execution nodes.

**Changes made:**
```typescript
export { saveIntermediateMemory } from './memoryManagement';
```

---

## 5. `nodes/agents/Agent/agents/ToolsAgent/V3/helpers/runAgent.ts`
**Purpose:** Intercept the agent's execution flow exactly when it decides to call a Tool Workflow, and trigger the `saveIntermediateMemory` function before yielding execution back to the n8n engine.

**Changes made:**
Imported `saveIntermediateMemory` from `@utils/agent-execution`.

In the **Streaming Execution Branch** (around line 80):
```typescript
if (result.toolCalls && result.toolCalls.length > 0) {
	const previousCount = response?.metadata?.previousRequests?.length || 0;
	if (previousCount === 0 && memory && input) {
		await saveIntermediateMemory(input, memory, result.output);
	}

	const actions = createEngineRequests(result.toolCalls, itemIndex, tools);
```

In the **Non-Streaming Execution Branch** (around line 130), which is the path that triggers during Tool workflows:
```typescript
const previousCount = response?.metadata?.previousRequests?.length || 0;
if (previousCount === 0 && memory && input) {
	let announcement: string | undefined;
	if (Array.isArray(modelResponse) && modelResponse.length > 0) {
		const logText = modelResponse[0]?.log;
		if (typeof logText === 'string') {
			announcement = logText.replace(/^Calling .* with input: .*$/, '').trim();
		}
	}
	await saveIntermediateMemory(input, memory, announcement);
}

const actions = createEngineRequests(modelResponse, itemIndex, tools);
```

---
*Note: All injected `require('fs').appendFileSync` debugging sequences used specifically to trace worker processes were subsequently removed from the codebase after the fix was confirmed to keep the production files clean.*
