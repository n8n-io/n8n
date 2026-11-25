import { $a as objectType, $d as init_runtime_core_esm_bundler, Au as useDocumentVisibility, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Jf as toValue, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Rf as onScopeDispose, Sp as toDisplayString, Tf as watch, Va as arrayType, Vd as createCommentVNode, Vf as ref, Xf as unref, Ya as literalType, _p as normalizeClass, bd as I18nT, ef as inject, ff as openBlock, ip as init_shared_esm_bundler, mf as renderList, of as onBeforeUnmount, qa as enumType, to as stringType, zd as createBaseVNode, zf as reactive } from "./vendor-Hx42-oQF.js";
import { $S as TIME, $o as resumeAgentBackgroundJob, AT as richCardComponentSchema, Ch as CHAT_MESSAGE_ROLE, Co as getChatAttachmentUrl, Dh as TOOL_CALL_STATE, Eh as INTERACTION_EXTENSION_TOOL_NAME, Fk as hasPolicyRefusalMarker, NM as N8nCard_default, OT as WAIT_TOOL_NAME, QE as N8N_CHAT_ACTION_TOOL_NAME, SN as _plugin_vue_export_helper_default, TT as APPROVAL_TOOL_NAME, UM as ApprovalCard_default, Uf as getPolicyViolations, Xc as usePushConnectionStore, ZA as isRecord, _N as N8nText_default, bC as useRootStore, dN as Attachment_default, eM as N8nInputNumber_default, gO as nodeNameToToolName, hu as NodeIcon_default, jN as useI18n, jT as richMessageSchema, kT as WORKFLOW_WAIT_SUSPEND_TYPE, lo as getAgentBackgroundJobs, rs as stopAgentBackgroundJobs, uN as AttachmentGroup_default, uf as useNodeTypesStore, wh as CHAT_MESSAGE_STATUS, xN as N8nIcon_default, xr as useAiGatewayTopUp, yN as N8nButton_default, zD as SUB_AGENT_TASK_DIFFICULTIES } from "./app-D5flEmb-.js";
import { i as useProjectAgentsList } from "./useProjectAgentsList-yCWZeTO1.js";
import { t as useApprovalCardLabels } from "./useApprovalCardLabels-CDqp7YoU.js";
//#region src/features/ai/shared/agentsChat/n8nChatInteraction.ts
/**
* Single-operation integration action tool input — any `<platform>_action`
* tool's `{ action, input: { message: { text?, card? } } }` shape, with the
* message validated against the SAME `richMessageSchema` the backend tool
* boundary uses (`@n8n/api-types/agents/rich-card.schema.ts`). Batch inputs
* (`actions: [...]`) never suspend and don't match this schema; they fall
* back to raw JSON rendering.
*/
var actionToolInputSchema = objectType({
	action: stringType(),
	input: objectType({ message: richMessageSchema }).passthrough()
}).passthrough();
/** Resume payload shape shared with the platform card path (component-mapper / bridge). */
var n8nChatResumeValueSchema = objectType({
	type: enumType(["button", "select"]),
	value: stringType(),
	id: stringType().optional()
}).passthrough();
var INTERACTIVE_COMPONENT_TYPES = /* @__PURE__ */ new Set([
	"button",
	"select",
	"radio_select"
]);
/**
* Mirrors the backend's shouldAwaitResponse: explicit flag or interactive components.
*
* @see shouldAwaitResponse in packages/cli/src/modules/agents/integrations/integration-tool-execution.ts
*/
function isAwaitingCard(card) {
	if (card.awaitResponse === true) return true;
	return card.components.some((component) => INTERACTIVE_COMPONENT_TYPES.has(component.type) || component.type === "section" && component.button !== void 0);
}
/**
* Parse any integration action tool input (slack_action, chat_action, …)
* into its renderable card, or undefined when it carries none. Used for the
* live n8n chat cards and for session-log card previews of every integration.
*/
function parseIntegrationActionCard(input) {
	const parsed = actionToolInputSchema.safeParse(input);
	if (!parsed.success) return void 0;
	const { message } = parsed.data.input;
	if (!message.card) return void 0;
	return {
		text: message.text,
		card: message.card
	};
}
/** Parse a persisted/live chat_action tool input into a renderable card, or undefined. */
function parseN8nChatActionInput(input) {
	return parseIntegrationActionCard(input);
}
/**
* Suspend payload of a workflow tool parked on a Wait node — the same card the
* chat platforms render, so it goes through the same card renderer here.
*
* @see buildWaitCard in packages/cli/src/modules/agents/tools/workflow-tool-factory.ts
*/
var waitSuspendPayloadSchema = objectType({
	type: literalType(WORKFLOW_WAIT_SUSPEND_TYPE),
	title: stringType(),
	components: arrayType(richCardComponentSchema).min(1)
});
/** Parse a Wait-node suspend payload into a renderable card, or undefined. */
function parseWaitSuspendPayload(payload) {
	const parsed = waitSuspendPayloadSchema.safeParse(payload);
	if (!parsed.success) return void 0;
	return { card: {
		title: parsed.data.title,
		components: parsed.data.components
	} };
}
/**
* Human-readable label for a card's resume value: the clicked button's label
* or the chosen option's label, falling back to the raw value. Used for the
* tool-step summary once an answered card clears from the chat.
*/
function cardChoiceLabel(card, resume) {
	if (resume.type === "button") {
		for (const component of card.components) {
			const candidates = component.type === "button" ? [component] : component.type === "section" && component.button ? [component.button] : [];
			for (const button of candidates) if (button.value === resume.value) return button.label ?? button.text ?? resume.value;
		}
		return resume.value;
	}
	for (const component of card.components) {
		if (component.type !== "select" && component.type !== "radio_select") continue;
		if (resume.id !== void 0 && component.id !== void 0 && component.id !== resume.id) continue;
		const option = component.options.find((candidate) => candidate.value === resume.value);
		if (option) return option.label;
	}
	return resume.value;
}
//#endregion
//#region src/features/ai/shared/agentsChat/delegateTool.ts
/**
* Name of the SDK tool a parent agent calls to hand a task to a sub-agent.
* Mirrors `DELEGATE_SUB_AGENT_TOOL_NAME` in `@n8n/agents` (not FE-importable),
* so the chat can special-case the tool call and render it as an expandable
* tool step.
*/
var DELEGATE_SUB_AGENT_TOOL_NAME = "delegate_subagent";
/** Mirrors `DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE` in `@n8n/agents`. */
var DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE = "agents.chat.delegate.childSuspendUnsupported";
var delegateInputSchema = objectType({
	subAgentId: stringType().min(1),
	taskName: stringType().optional(),
	difficulty: enumType(SUB_AGENT_TASK_DIFFICULTIES).optional()
});
var delegateOutputSchema = objectType({
	status: enumType([
		"completed",
		"failed",
		"suspended"
	]).optional(),
	answer: stringType().optional(),
	error: stringType().optional(),
	model: stringType().optional()
});
var SUB_AGENT_DIFFICULTY_I18N_KEY = {
	low: "agents.chat.difficulty.low",
	medium: "agents.chat.difficulty.medium",
	high: "agents.chat.difficulty.high"
};
function isDelegateSubAgentTool(toolName) {
	return toolName === DELEGATE_SUB_AGENT_TOOL_NAME;
}
/** Parse a delegate tool-call input; returns `undefined` when it isn't an object. */
function parseDelegateInput(input) {
	const result = delegateInputSchema.safeParse(input);
	return result.success ? result.data : void 0;
}
/**
* Parse a delegate tool-call output; returns `undefined` when it isn't an object
* (e.g. a rejected tool call whose output is the raw error string).
*/
function parseDelegateOutput(output) {
	const result = delegateOutputSchema.safeParse(output);
	return result.success ? result.data : void 0;
}
function getDelegateDifficulty(input) {
	return parseDelegateInput(input)?.difficulty;
}
/** One-line localized difficulty label for a delegate tool call. */
function getDelegateDifficultySummary(input, i18n) {
	const difficulty = getDelegateDifficulty(input);
	return difficulty ? i18n.baseText(SUB_AGENT_DIFFICULTY_I18N_KEY[difficulty]) : void 0;
}
/** Localize a delegate tool error when it is a known i18n key. */
function formatDelegateError(error, i18n) {
	if (i18n && error === "agents.chat.delegate.childSuspendUnsupported") return i18n.baseText(DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE);
	return error;
}
/**
* True when a `delegate_subagent` call resolved with a failed result. Such a
* call settles successfully at the tool layer, so its step must be flipped to an
* error state explicitly (both live and on reload).
*/
function isFailedDelegateOutput(toolName, output) {
	if (!isDelegateSubAgentTool(toolName)) return false;
	return parseDelegateOutput(output)?.status === "failed";
}
/** Humanize a snake/kebab task name, e.g. `research_api` → `Research api`. */
function humanizeTaskName(taskName) {
	const normalized = taskName?.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
	if (!normalized) return "";
	return normalized.charAt(0).toLocaleUpperCase() + normalized.slice(1);
}
/** Friendly label for a raw sub-agent id (delegate hints, todo delegateHint, etc.). */
function resolveSubAgentIdForDisplay(subAgentId, nameById) {
	if (subAgentId === "inline") return humanizeTaskName("inline");
	const resolved = nameById.get(subAgentId)?.trim();
	if (resolved) return resolved;
	return humanizeTaskName(subAgentId) || subAgentId;
}
function resolveSubAgentName(input, nameById) {
	const parsed = parseDelegateInput(input);
	const resolved = parsed?.subAgentId && parsed.subAgentId !== "inline" ? nameById.get(parsed.subAgentId)?.trim() : void 0;
	if (resolved) return resolved;
	return humanizeTaskName(parsed?.taskName);
}
//#endregion
//#region src/features/ai/shared/agentsChat/interactiveSummary.ts
/**
* Build a one-line human-readable label for a resolved interactive tool call.
* Used by `AgentChatToolSteps` to show the user's answer beside the tool name
* (e.g. "→ n8n_chat_action · Approve & Send") so resolved cards leave a compact
* trace in scrollback instead of vanishing.
*
* Returns `undefined` for non-interactive tools or when the output isn't
* shaped as expected — callers fall back to rendering just the tool name.
*/
function summariseToolCall(toolName, output, input) {
	if (!isRecord(output)) return void 0;
	if (toolName === "chat_action") {
		const resume = n8nChatResumeValueSchema.safeParse(output);
		if (!resume.success) return void 0;
		const parsed = parseN8nChatActionInput(input);
		if (!parsed) return resume.data.value;
		return cardChoiceLabel(parsed.card, resume.data);
	}
}
//#endregion
//#region src/features/ai/shared/agentsChat/replyFiles.ts
function isToolOutputFile(value) {
	return isRecord(value) && typeof value.fileId === "string" && typeof value.fileName === "string" && typeof value.mimeType === "string" && typeof value.sizeBytes === "number";
}
function readFiles(result) {
	if (!isRecord(result) || result.ok !== true) return [];
	if (Array.isArray(result.files)) return result.files.filter(isToolOutputFile);
	if (!Array.isArray(result.results)) return [];
	return result.results.flatMap((entry) => isRecord(entry) ? readFiles(entry.result) : []);
}
/** The files of an interactive card. The resume output has only the user's answer, so they stay in the suspend payload. */
function readSuspendFiles(payload) {
	if (!isRecord(payload) || payload.type !== "integration_action") return [];
	return Array.isArray(payload.files) ? payload.files.filter(isToolOutputFile) : [];
}
/** The files that the agent sent with its reply through the n8n Chat `respond` action. */
function getReplyAttachments(toolCall) {
	if (toolCall.tool !== "chat_action") return [];
	return [...readSuspendFiles(toolCall.suspendPayload), ...readFiles(toolCall.output)];
}
/** The reply files of a tool call that are not in `known` yet. Each file comes one time. */
function newReplyAttachments(known, toolCall) {
	const seen = new Set(known?.map((attachment) => attachment.fileId));
	return getReplyAttachments(toolCall).filter((file) => {
		if (seen.has(file.fileId)) return false;
		seen.add(file.fileId);
		return true;
	});
}
/** Add the reply files of a tool call to the message. */
function addReplyAttachments(message, toolCall) {
	const added = newReplyAttachments(message.attachments, toolCall);
	if (added.length > 0) message.attachments = [...message.attachments ?? [], ...added];
}
//#endregion
//#region src/features/ai/shared/agentsChat/toolPolicyRefusal.ts
/** A tool output in the serialized policy-refusal shape, the one executions also store. */
function parseToolPolicyRefusal(output) {
	if (!hasPolicyRefusalMarker(output)) return void 0;
	const [first, ...rest] = getPolicyViolations(output) ?? [];
	return first ? { violations: [first, ...rest] } : void 0;
}
function isPolicyRefusedToolOutput(output) {
	return parseToolPolicyRefusal(output) !== void 0;
}
//#endregion
//#region src/features/ai/shared/agentsChat/messageMappers.ts
function syncLegacyInteractive(message) {
	const interactives = message.interactives;
	if (!interactives?.length) {
		delete message.interactive;
		return;
	}
	message.interactive = interactives.find((payload) => payload.resolvedAt === void 0) ?? interactives[0];
}
function getMessageInteractives(message) {
	if (message.interactives?.length) return message.interactives;
	return message.interactive ? [message.interactive] : [];
}
function setMessageInteractives(message, interactives) {
	if (interactives.length === 0) {
		delete message.interactives;
		delete message.interactive;
		return;
	}
	message.interactives = interactives;
	syncLegacyInteractive(message);
}
function upsertMessageInteractive(message, interactive) {
	const interactives = [...getMessageInteractives(message)];
	const index = interactives.findIndex((payload) => payload.toolCallId === interactive.toolCallId);
	if (index === -1) interactives.push(interactive);
	else interactives[index] = interactive;
	setMessageInteractives(message, interactives);
}
function getMessageInteractive(message, toolCallId) {
	return getMessageInteractives(message).find((payload) => payload.toolCallId === toolCallId);
}
function findOpenInteractive(messages) {
	for (const message of messages) {
		const open = getMessageInteractives(message).find((payload) => payload.resolvedAt === void 0);
		if (open) return open;
	}
}
/**
* The open interactive on the last turn, which is the one that owns the chat
* input and any steering. A parked run is always the tail of the transcript, so
* an unresolved card further up belongs to a turn the conversation already moved
* past — `findOpenInteractive` returns those too, and acting on them would
* answer or cancel the wrong tool call.
*/
function findTailOpenInteractive(messages) {
	const tail = messages[messages.length - 1];
	if (!tail) return void 0;
	return getMessageInteractives(tail).find((payload) => payload.resolvedAt === void 0);
}
/**
* The open interactive on the last turn that a steering message is allowed to
* cancel. A waiting card is never one: the workflow resumes it by itself, so
* cancelling it because the user typed would abandon a run they never asked to
* stop and leave the sub-workflow finishing into a checkpoint nobody reads.
* Stopping a wait is a deliberate act — the card's own button, or Stop.
*/
function findTailSteerableInteractive(messages) {
	const tail = messages[messages.length - 1];
	if (!tail) return void 0;
	return getMessageInteractives(tail).find((payload) => payload.resolvedAt === void 0 && payload.toolName !== "wait");
}
/** True when a suspend payload is the approval tool's renderable input. */
function isApprovalSuspendInput(value) {
	return parseApprovalInput(value) !== void 0;
}
function parseApprovalInput(value) {
	if (!isRecord(value)) return void 0;
	if (value.type !== "approval") return void 0;
	if (typeof value.toolName !== "string" || value.toolName.length === 0) return void 0;
	return {
		type: "approval",
		toolName: value.toolName,
		...value.supportsSessionApproval === true && { supportsSessionApproval: true },
		...typeof value.displayName === "string" && value.displayName.length > 0 && { displayName: value.displayName },
		args: value.args
	};
}
function isDeclinedToolOutput(value) {
	return isRecord(value) && value.declined === true;
}
/**
* Given a tool call belonging to one of the interactive tools still rendered
* in agents chat (`approval`, `chat_action`) — or a workflow tool parked on a
* Wait node — reconstruct an `InteractivePayload` for it. The result is:
*
* - **resolved**: when `output` is present.
* - **open**: when `output` is absent — the card renders as an active
*   awaiting-user prompt. Used when a refresh during a suspension restored the
*   suspended assistant turn from the open checkpoint.
*
* Host extensions are tried after all built-in cards, so a host cannot take
* over an approval, a Wait node or a `chat_action` call. Without extensions, no
* extension card is mapped. Extensions without `parse` have no card, so the
* mapper skips them.
*
* Returns `undefined` when the tool name isn't interactive or input parsing fails.
*/
function rebuildInteractiveFromHistory(tc, extensions = []) {
	const approvalInput = parseApprovalInput(tc.suspendPayload) ?? parseApprovalInput(tc.input);
	if (approvalInput) {
		const resolved = tc.output !== void 0;
		return {
			toolCallId: tc.toolCallId,
			...resolved && { resolvedAt: 1 },
			...tc.canceled === true && { cancelled: true },
			toolName: APPROVAL_TOOL_NAME,
			input: approvalInput,
			...resolved && tc.canceled !== true && !isDelegateSubAgentTool(tc.tool) && { resolvedValue: { approved: !isDeclinedToolOutput(tc.output) } }
		};
	}
	const waitInput = parseWaitSuspendPayload(tc.suspendPayload);
	if (waitInput) {
		const resolved = tc.output !== void 0 ? n8nChatResumeValueSchema.safeParse(tc.output) : null;
		return {
			toolCallId: tc.toolCallId,
			...tc.output !== void 0 && { resolvedAt: 1 },
			...tc.canceled === true && { cancelled: true },
			toolName: WAIT_TOOL_NAME,
			input: waitInput,
			...tc.canceled !== true && resolved?.success && { resolvedValue: resolved.data }
		};
	}
	if (tc.tool === "chat_action") {
		const input = parseN8nChatActionInput(tc.input);
		if (!input) return void 0;
		if (tc.output === void 0 && !isAwaitingCard(input.card)) return void 0;
		const resolved = tc.output !== void 0 ? n8nChatResumeValueSchema.safeParse(tc.output) : null;
		return {
			toolCallId: tc.toolCallId,
			...tc.output !== void 0 && { resolvedAt: 1 },
			...tc.canceled === true && { cancelled: true },
			toolName: N8N_CHAT_ACTION_TOOL_NAME,
			input,
			...tc.canceled !== true && resolved?.success && { resolvedValue: resolved.data }
		};
	}
	for (const extension of extensions) {
		const input = extension.parse?.(tc);
		if (input === void 0) continue;
		return {
			toolCallId: tc.toolCallId,
			...tc.output !== void 0 && { resolvedAt: 1 },
			...tc.canceled === true && { cancelled: true },
			toolName: INTERACTION_EXTENSION_TOOL_NAME,
			extensionKey: extension.key,
			input
		};
	}
}
function createStoppedMessage(executionId) {
	return {
		id: `${executionId}:stopped`,
		role: CHAT_MESSAGE_ROLE.ASSISTANT,
		content: useI18n().baseText("agentSessions.stopped"),
		status: CHAT_MESSAGE_STATUS.SUCCESS,
		executionId
	};
}
/**
* Convert persisted agent messages into the frontend ChatMessage format.
*
* Whenever a tool call is interactive, we attach a reconstructed
* `InteractivePayload` so the UI re-renders the card in either its open
* (awaiting user) or resolved (disabled) state. `extensions` are the card
* types of the chat host (see `rebuildInteractiveFromHistory`).
*/
function convertDbMessages(dbMessages, extensions = []) {
	const result = [];
	const lastMessageByExecution = new Map(dbMessages.filter((message) => message.executionId && Array.isArray(message.content) && (message.role === CHAT_MESSAGE_ROLE.USER || message.role === CHAT_MESSAGE_ROLE.ASSISTANT)).map((message) => [message.executionId, message]));
	for (const msg of dbMessages) {
		if (!msg.role || !Array.isArray(msg.content)) continue;
		const role = msg.role === CHAT_MESSAGE_ROLE.USER ? "user" : msg.role === CHAT_MESSAGE_ROLE.ASSISTANT ? "assistant" : null;
		if (role === null) continue;
		let text = "";
		let thinking = "";
		const thinkingSegments = [];
		const toolCalls = [];
		const renderParts = [];
		const interactives = [];
		const attachments = [];
		const hostEvents = [];
		let status;
		const failed = msg.executionStatus === "error" || msg.executionStatus === "interrupted";
		if (failed) status = CHAT_MESSAGE_STATUS.ERROR;
		else if (msg.executionStatus === "running") status = CHAT_MESSAGE_STATUS.STREAMING;
		let continuesText = false;
		for (const [partIndex, part] of msg.content.entries()) {
			if (part.type === "text" && part.text) {
				text += part.text;
				const previous = renderParts.at(-1);
				if (continuesText && previous?.type === "text") previous.text += part.text;
				else renderParts.push({
					type: "text",
					text: part.text
				});
				continuesText = true;
				continue;
			}
			if (part.type !== "host-event") continuesText = false;
			if (part.type === "file" && part.fileId) attachments.push({
				fileId: part.fileId,
				fileName: part.fileName ?? "attachment",
				mimeType: part.mimeType ?? "application/octet-stream",
				sizeBytes: part.sizeBytes
			});
			else if (part.type === "host-event" && typeof part.name === "string" && part.name) hostEvents.push({
				id: `${msg.id}:host-event:${partIndex}`,
				name: part.name,
				...typeof part.key === "string" && part.key ? { key: part.key } : {},
				payload: part.payload ?? null
			});
			else if (part.type === "reasoning" && part.text) {
				thinking += part.text;
				thinkingSegments.push({
					id: `${msg.id}:reasoning:${partIndex}`,
					content: part.text,
					...part.startTime !== void 0 && { startTime: part.startTime },
					...part.endTime !== void 0 && { endTime: part.endTime }
				});
			} else if (part.type === "tool-call" && part.toolName) {
				let state;
				let output;
				const canceled = part.canceled === true || msg.executionStatus === "cancelled" && part.state !== "resolved" && part.state !== "rejected";
				if (part.state === "resolved") {
					output = part.output;
					if (canceled) state = TOOL_CALL_STATE.CANCELLED;
					else if (isFailedDelegateOutput(part.toolName, part.output) || isPolicyRefusedToolOutput(part.output)) state = TOOL_CALL_STATE.ERROR;
					else state = TOOL_CALL_STATE.DONE;
				} else if (part.state === "rejected") {
					state = TOOL_CALL_STATE.ERROR;
					output = part.error;
				} else if (canceled) {
					state = TOOL_CALL_STATE.CANCELLED;
					output = void 0;
				} else if (failed) {
					state = TOOL_CALL_STATE.ERROR;
					output = part.error;
				} else {
					state = TOOL_CALL_STATE.RUNNING;
					output = void 0;
				}
				const toolCall = {
					tool: part.toolName,
					toolCallId: part.toolCallId ?? "",
					input: part.input,
					...output !== void 0 && { output },
					...canceled && { canceled },
					state,
					...part.startTime !== void 0 && { startTime: part.startTime },
					...part.endTime !== void 0 && { endTime: part.endTime },
					...part.suspendPayload !== void 0 && { suspendPayload: part.suspendPayload },
					...part.childTrace && { childProgress: part.childTrace },
					displaySummary: summariseToolCall(part.toolName, output, part.input)
				};
				toolCalls.push(toolCall);
				attachments.push(...newReplyAttachments(attachments, toolCall));
				if (msg.executionStatus === "cancelled") continue;
				const rebuilt = rebuildInteractiveFromHistory(toolCall, extensions);
				if (!rebuilt) continue;
				if (rebuilt.resolvedAt === void 0 && !failed && msg.executionStatus !== "running") {
					toolCall.state = TOOL_CALL_STATE.SUSPENDED;
					status = CHAT_MESSAGE_STATUS.AWAITING_USER;
				}
				interactives.push(rebuilt);
				renderParts.push({
					type: "interactive",
					toolCallId: rebuilt.toolCallId
				});
			}
		}
		const createdAt = msg.createdAt ? Date.parse(msg.createdAt) : NaN;
		const chatMessage = {
			id: msg.id ?? crypto.randomUUID(),
			role,
			content: text,
			...role === CHAT_MESSAGE_ROLE.ASSISTANT && msg.stopReport ? { stopReport: true } : {},
			...msg.author && { author: msg.author },
			...renderParts.length > 0 && { renderParts },
			thinking: thinking || void 0,
			...thinkingSegments.length > 0 && { thinkingSegments },
			toolCalls: toolCalls.length > 0 ? toolCalls : void 0,
			...attachments.length > 0 && { attachments },
			...role === CHAT_MESSAGE_ROLE.ASSISTANT && hostEvents.length > 0 && { hostEvents },
			...status && { status },
			...msg.executionId ? { executionId: msg.executionId } : {},
			...role === CHAT_MESSAGE_ROLE.ASSISTANT && msg.backgroundTaskSignal ? { backgroundJobSignal: msg.backgroundTaskSignal } : {},
			...Number.isFinite(createdAt) && { createdAt }
		};
		setMessageInteractives(chatMessage, interactives);
		result.push(chatMessage);
		if (msg.executionError) result.push({
			id: `${chatMessage.id}:error`,
			role: "assistant",
			content: msg.executionError,
			toolCalls: [],
			status: CHAT_MESSAGE_STATUS.ERROR,
			...msg.executionId ? { executionId: msg.executionId } : {}
		});
		if (msg.executionStatus === "cancelled" && msg.executionId && lastMessageByExecution.get(msg.executionId) === msg) result.push(createStoppedMessage(msg.executionId));
	}
	return result;
}
/**
* Reconcile unfinished tool calls and interactive cards with the suspensions
* still open on the backend. The sidecar comes from chat history
* (`openSuspensions`) — raw persisted messages don't carry runIds or enough
* information to distinguish a live suspension from an interrupted run.
*
* Mutates `chat` in place (history-load happens before reactivity wraps the
* messages, so this is safe and avoids an extra deep clone) and returns it
* for ergonomic chaining. `extensions` are the card types of the chat host.
*/
function applyOpenSuspensions(chat, suspensions, extensions = []) {
	const byToolCallId = new Map(suspensions.map((s) => [s.toolCallId, s]));
	for (const msg of chat) {
		let hasOpenToolCall = false;
		for (const toolCall of msg.toolCalls ?? []) {
			if (toolCall.state === TOOL_CALL_STATE.DONE || toolCall.state === TOOL_CALL_STATE.ERROR || toolCall.state === TOOL_CALL_STATE.CANCELLED) continue;
			const suspension = byToolCallId.get(toolCall.toolCallId);
			if (suspension) {
				toolCall.state = TOOL_CALL_STATE.SUSPENDED;
				toolCall.runId = suspension.runId;
				if (suspension.suspendPayload !== void 0) toolCall.suspendPayload = suspension.suspendPayload;
				addReplyAttachments(msg, toolCall);
				const rebuilt = rebuildInteractiveFromHistory(toolCall, extensions);
				if (rebuilt) {
					rebuilt.runId = suspension.runId;
					upsertMessageInteractive(msg, rebuilt);
				}
				hasOpenToolCall = true;
			} else if (msg.status === CHAT_MESSAGE_STATUS.ERROR) toolCall.state = TOOL_CALL_STATE.ERROR;
			else if (msg.status !== CHAT_MESSAGE_STATUS.STREAMING) {
				toolCall.state = TOOL_CALL_STATE.CANCELLED;
				toolCall.canceled = true;
			}
		}
		const interactives = getMessageInteractives(msg);
		const retained = [];
		for (const interactive of interactives) {
			if (interactive.resolvedAt !== void 0) {
				retained.push(interactive);
				continue;
			}
			const suspension = byToolCallId.get(interactive.toolCallId);
			if (suspension) {
				interactive.runId = suspension.runId;
				retained.push(interactive);
			}
		}
		setMessageInteractives(msg, retained);
		if (hasOpenToolCall) msg.status = CHAT_MESSAGE_STATUS.AWAITING_USER;
		else if (msg.status === CHAT_MESSAGE_STATUS.AWAITING_USER) msg.status = msg.toolCalls?.some((tc) => tc.state === TOOL_CALL_STATE.ERROR) ? CHAT_MESSAGE_STATUS.ERROR : CHAT_MESSAGE_STATUS.SUCCESS;
	}
	return chat;
}
//#endregion
//#region src/features/agents/utils/budget-config.ts
var ALERT_STEP = 10;
var ALERT_MIN = 10;
var ALERT_MAX = 100;
var ALERT_DEFAULT = 80;
/** Maps a saved percent onto the slider steps of 10. */
function snapAlertPercent(value) {
	if (!Number.isFinite(value)) return ALERT_DEFAULT;
	const stepped = Math.round(value / ALERT_STEP) * ALERT_STEP;
	return Math.min(ALERT_MAX, Math.max(ALERT_MIN, stepped));
}
function formatBudgetUsd(amount) {
	const hasCents = Math.round(amount * 100) % 100 !== 0;
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: hasCents ? 2 : 0,
		maximumFractionDigits: 2
	}).format(amount);
}
/** A budget must be greater than 0. Empty, 0, and negative amounts are unset. */
function parseBudgetAmount(value) {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return void 0;
	return value;
}
function buildBudget(monthly, session, alert) {
	const enabled = monthly !== void 0 || session !== void 0;
	const budget = { enabled };
	if (monthly !== void 0) budget.monthlyBudgetUsd = monthly;
	if (session !== void 0) budget.sessionCostCapUsd = session;
	if (enabled && monthly !== void 0 && alert.enabled) budget.alertThresholdPercent = snapAlertPercent(alert.percent);
	return budget;
}
function withBudget(config, budget) {
	return { config: {
		...config?.config,
		guardrails: {
			...config?.config?.guardrails,
			budget
		}
	} };
}
function monthlyBudgetSave(config, monthlyInput, alert) {
	const current = config?.config?.guardrails?.budget;
	return withBudget(config, buildBudget(parseBudgetAmount(monthlyInput), parseBudgetAmount(current?.sessionCostCapUsd), alert));
}
function sessionCapSave(config, sessionInput) {
	const current = config?.config?.guardrails?.budget;
	return withBudget(config, buildBudget(parseBudgetAmount(current?.monthlyBudgetUsd), parseBudgetAmount(sessionInput), {
		enabled: current?.alertThresholdPercent !== void 0,
		percent: current?.alertThresholdPercent ?? ALERT_DEFAULT
	}));
}
/**
* Writes one raised cap and keeps the other saved amounts. Increase-only:
* rejects an empty or negative amount, and one at or below the current cap —
* saving it would lift the stop only for the next run to stop again.
*/
function increasedBudgetConfig(config, field, amount) {
	const next = parseBudgetAmount(amount);
	if (next === void 0) return void 0;
	const current = config?.config?.guardrails?.budget;
	const currentValue = current?.[field];
	if (currentValue !== void 0 && next <= currentValue) return void 0;
	const monthly = field === "monthlyBudgetUsd" ? next : current?.monthlyBudgetUsd;
	const session = field === "sessionCostCapUsd" ? next : current?.sessionCostCapUsd;
	return withBudget(config, buildBudget(parseBudgetAmount(monthly), parseBudgetAmount(session), {
		enabled: current?.alertThresholdPercent !== void 0,
		percent: current?.alertThresholdPercent ?? ALERT_DEFAULT
	}));
}
/**
* Caps whose raise or removal lifts a budget stop. A lowered or unchanged cap
* keeps the stop: the next run would stop against it again.
*/
function raisedBudgetCaps(before, after) {
	const raised = [];
	for (const field of ["monthlyBudgetUsd", "sessionCostCapUsd"]) {
		const prev = before?.[field];
		const next = after?.[field];
		if (next === void 0 ? prev !== void 0 : prev !== void 0 && next > prev) raised.push(field);
	}
	return raised;
}
function isBudgetStopCode(code) {
	return code === "budget.monthly" || code === "budget.session" || code === "budget.credits";
}
/** Notice codes a persisted change to one cap resolves. The alert rides with the monthly cap. */
function budgetNoticeCodesForField(field) {
	return field === "sessionCostCapUsd" ? ["budget.session"] : ["budget.monthly", "budget.alert"];
}
//#endregion
//#region src/features/agents/composables/useAgentExecutionUpdates.ts
init_reactivity_esm_bundler();
/**
* Refresh saved execution data after a push. Apply live usage in
* `onInvalidate` before the refresh.
*
* Connects the shared push client but never disconnects it — the editor has one
* connection, and tearing it down here would cut off everything else on it.
*/
function useAgentExecutionUpdates(target, onUpdate, onInvalidate) {
	const pushStore = usePushConnectionStore();
	function matches(event) {
		if (event.type !== "agentExecutionUpdated") return false;
		if (event.data.projectId !== target.projectId.value) return false;
		if (event.data.agentId !== target.agentId.value) return false;
		const threadId = target.threadId?.value;
		return !threadId || event.data.threadId === threadId;
	}
	let inFlight;
	let queued = false;
	let disposed = false;
	function run() {
		if (disposed) return;
		if (inFlight) {
			queued = true;
			return;
		}
		inFlight = Promise.resolve().then(async () => {
			if (!disposed) await onUpdate();
		}).catch(() => {}).finally(() => {
			inFlight = void 0;
			if (queued) {
				queued = false;
				run();
			}
		});
	}
	const removeListener = pushStore.addEventListener((event) => {
		if (matches(event)) {
			onInvalidate?.(event.data);
			run();
		}
	});
	pushStore.pushConnect();
	onScopeDispose(() => {
		disposed = true;
		removeListener();
	});
	return run;
}
//#endregion
//#region src/features/agents/utils/background-job-labels.ts
var BACKGROUND_JOB_STATUS_LABEL_KEYS = {
	completed: "agents.chat.backgroundTasks.status.completed",
	failed: "agents.chat.backgroundTasks.status.failed",
	cancelled: "agents.chat.backgroundTasks.status.cancelled"
};
function backgroundJobTimelineLabelKey(key) {
	switch (key) {
		case "background-task": return "agentSessions.timeline.backgroundTask";
		case "background-task-current-completed": return "agentSessions.timeline.taskCompleted";
		case "background-task-current-failed": return "agentSessions.timeline.taskFailed";
		case "background-task-current-cancelled": return "agentSessions.timeline.taskCancelled";
		case "background-task-current-running":
		case "background-task-running": return "agentSessions.timeline.taskRunning";
		case "background-task-current-suspended":
		case "background-task-suspended": return "agentSessions.timeline.taskSuspended";
		case "background-task-current-paused":
		case "background-task-paused": return "agentSessions.timeline.taskPaused";
		case "background-task-signal": return "agents.chat.backgroundTasks.resultsReceived";
		case "background-task-completed": return BACKGROUND_JOB_STATUS_LABEL_KEYS.completed;
		case "background-task-failed": return BACKGROUND_JOB_STATUS_LABEL_KEYS.failed;
		case "background-task-cancelled": return BACKGROUND_JOB_STATUS_LABEL_KEYS.cancelled;
		default: return;
	}
}
function backgroundJobResultLabel(job, i18n) {
	return i18n.baseText("agents.chat.backgroundTasks.result", { interpolate: {
		title: job.title,
		status: i18n.baseText(BACKGROUND_JOB_STATUS_LABEL_KEYS[job.status])
	} });
}
//#endregion
//#region src/features/agents/components/agentChatInjectionKeys.ts
/** Provided by `AgentChatPanel` so attachments don't need `projectId`/`agentId`/`channel` props. */
var AGENT_ATTACHMENT_URL_KEY = Symbol("agentAttachmentUrl");
/**
* Sub-agent id → name map from the n8n Chat agent route. Chat-only members lack
* `agent:list`, so `useSubAgentNames` uses this instead of the project agent list.
*/
var AGENT_SUB_AGENT_NAMES_KEY = Symbol("agentSubAgentNames");
//#endregion
//#region src/features/agents/components/AgentChatMessageAttachments.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["title", "aria-label"];
var AgentChatMessageAttachments_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentChatMessageAttachments",
	props: {
		attachments: {},
		projectId: {},
		agentId: {},
		threadId: {}
	},
	setup(__props) {
		const props = __props;
		const rootStore = useRootStore();
		const i18n = useI18n();
		/** Use the API URL when no panel provides a URL builder. */
		const attachmentUrlBuilder = inject(AGENT_ATTACHMENT_URL_KEY, null);
		/** Show an unavailable status for files whose server preview failed. */
		const unavailableKeys = reactive(/* @__PURE__ */ new Set());
		/** Reuse each local preview URL until the component unmounts. */
		const objectUrlsByFile = /* @__PURE__ */ new Map();
		function objectUrlFor(file) {
			let url = objectUrlsByFile.get(file);
			if (!url) {
				url = URL.createObjectURL(file);
				objectUrlsByFile.set(file, url);
			}
			return url;
		}
		function downloadUrl(attachment) {
			if (!attachment.fileId) return void 0;
			if (attachmentUrlBuilder) return attachmentUrlBuilder(attachment.fileId);
			return getChatAttachmentUrl(rootStore.restApiContext, props.projectId, props.agentId, attachment.fileId, "chat", props.threadId);
		}
		function isImage(attachment) {
			return attachment.mimeType.startsWith("image/");
		}
		const items = computed(() => props.attachments.map((attachment, index) => {
			const href = downloadUrl(attachment);
			let imageSrc;
			if (isImage(attachment)) {
				if (href) imageSrc = href;
				else if (attachment.file) imageSrc = objectUrlFor(attachment.file);
			}
			return {
				key: attachment.fileId ?? `local-${index}`,
				attachment,
				imageSrc,
				href
			};
		}));
		onBeforeUnmount(() => {
			for (const url of objectUrlsByFile.values()) URL.revokeObjectURL(url);
			objectUrlsByFile.clear();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(AttachmentGroup_default), {
				class: normalizeClass(_ctx.$style.attachments),
				"data-testid": "agent-chat-message-attachments"
			}, {
				default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(items.value, (item) => {
					return openBlock(), createElementBlock(Fragment, { key: item.key }, [unavailableKeys.has(item.key) ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass([_ctx.$style.fileChip, _ctx.$style.unavailable]),
						title: item.attachment.fileName,
						"aria-label": `${item.attachment.fileName}, ${unref(i18n).baseText("agents.chat.attachments.unavailable")}`,
						role: "img",
						"data-testid": "agent-chat-attachment-unavailable"
					}, [
						createVNode(unref(N8nIcon_default), {
							icon: "triangle-alert",
							size: "small",
							"aria-hidden": "true"
						}),
						createBaseVNode("span", { class: normalizeClass(_ctx.$style.fileName) }, toDisplayString(item.attachment.fileName), 3),
						createBaseVNode("span", { class: normalizeClass(_ctx.$style.fileSize) }, toDisplayString(unref(i18n).baseText("agents.chat.attachments.unavailable")), 3)
					], 10, _hoisted_1)) : (openBlock(), createBlock(unref(Attachment_default), {
						key: 1,
						"file-name": item.attachment.fileName,
						"mime-type": item.attachment.mimeType,
						"size-bytes": item.attachment.sizeBytes,
						src: item.imageSrc,
						href: item.href,
						download: !isImage(item.attachment) ? item.attachment.fileName : void 0,
						"is-removable": false,
						onError: ($event) => item.href && unavailableKeys.add(item.key)
					}, null, 8, [
						"file-name",
						"mime-type",
						"size-bytes",
						"src",
						"href",
						"download",
						"onError"
					]))], 64);
				}), 128))]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	attachments: "_attachments_1p2zk_3",
	fileChip: "_fileChip_1p2zk_7",
	fileName: "_fileName_1p2zk_20",
	fileSize: "_fileSize_1p2zk_27",
	unavailable: "_unavailable_1p2zk_32"
} }]]);
//#endregion
//#region src/features/agents/composables/useSubAgentNames.ts
init_runtime_core_esm_bundler();
function useSubAgentNames(projectId, isNeeded) {
	const provided = inject(AGENT_SUB_AGENT_NAMES_KEY, void 0);
	if (provided) return { subAgentNameById: provided };
	const { list, ensureLoaded } = useProjectAgentsList(projectId);
	const subAgentNameById = computed(() => {
		const map = /* @__PURE__ */ new Map();
		for (const agent of list.value ?? []) map.set(agent.id, agent.name);
		return map;
	});
	watch([isNeeded, projectId], ([needed, id]) => {
		if (needed && id) ensureLoaded().catch(() => {});
	}, { immediate: true });
	return { subAgentNameById };
}
//#endregion
//#region src/features/agents/utils/tool-output-files.ts
/** Read the `files` that a workflow or node tool lists in its output. */
function getToolOutputAttachments(output) {
	if (!isRecord(output) || !Array.isArray(output.files)) return [];
	return output.files.filter(isToolOutputFile);
}
//#endregion
//#region src/features/agents/components/AgentBudgetNoticeCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentBudgetNoticeCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentBudgetNoticeCard",
	props: {
		code: {},
		canIncrease: {
			type: Boolean,
			default: false
		},
		pending: {
			type: Boolean,
			default: false
		}
	},
	emits: ["increase"],
	setup(__props, { emit: __emit }) {
		const COPY = {
			"budget.monthly": {
				title: "agents.chat.budget.monthly.title",
				message: "agents.chat.budget.monthly.message",
				input: "agents.chat.budget.monthly.input",
				dismissed: "agents.chat.budget.monthly.dismissed"
			},
			"budget.session": {
				title: "agents.chat.budget.session.title",
				message: "agents.chat.budget.session.message",
				input: "agents.chat.budget.session.input",
				dismissed: "agents.chat.budget.session.dismissed"
			},
			"budget.alert": {
				title: "agents.chat.budget.alert.title",
				message: "agents.chat.budget.alert.message",
				input: "agents.chat.budget.alert.input",
				dismissed: "agents.chat.budget.alert.dismissed"
			},
			"budget.credits": {
				title: "agents.chat.budget.credits.title",
				message: "agents.chat.budget.credits.message",
				dismissed: "agents.chat.budget.credits.dismissed"
			}
		};
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const { openTopUp } = useAiGatewayTopUp();
		const dismissed = ref(false);
		const amount = ref();
		const copy = computed(() => COPY[props.code]);
		const isCredits = computed(() => props.code === "budget.credits");
		const field = computed(() => props.code === "budget.session" ? "sessionCostCapUsd" : "monthlyBudgetUsd");
		function onAmount(value) {
			amount.value = parseBudgetAmount(value);
		}
		function increase() {
			const value = amount.value;
			if (value === void 0 || props.pending) return;
			emit("increase", {
				field: field.value,
				amount: value
			});
		}
		function topUp() {
			openTopUp({ source: "agent_budget_card" });
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nCard_default), {
				class: normalizeClass(_ctx.$style.card),
				"data-testid": "agent-budget-notice-card"
			}, {
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.body) }, [
					createVNode(unref(N8nText_default), {
						tag: "p",
						bold: "",
						class: normalizeClass(_ctx.$style.title),
						"data-testid": "agent-budget-notice-title"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(copy.value.title)), 1)]),
						_: 1
					}, 8, ["class"]),
					createVNode(unref(N8nText_default), {
						tag: "p",
						size: "small",
						class: normalizeClass(_ctx.$style.message)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(copy.value.message)), 1)]),
						_: 1
					}, 8, ["class"]),
					dismissed.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "small",
						"data-testid": "agent-budget-notice-dismissed"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(copy.value.dismissed)), 1)]),
						_: 1
					})) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [__props.canIncrease && copy.value.input !== void 0 ? (openBlock(), createElementBlock("label", {
						key: 0,
						class: normalizeClass(_ctx.$style.amount)
					}, [createVNode(unref(N8nText_default), { size: "small" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(copy.value.input)), 1)]),
						_: 1
					}), createVNode(unref(N8nInputNumber_default), {
						"model-value": amount.value,
						min: 0,
						controls: false,
						disabled: __props.pending,
						"data-testid": "agent-budget-notice-amount",
						"onUpdate:modelValue": onAmount
					}, {
						prefix: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.budget.currencyPrefix")), 1)]),
						_: 1
					}, 8, ["model-value", "disabled"])], 2)) : createCommentVNode("", true), createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [createVNode(unref(N8nButton_default), {
						variant: "outline",
						size: "medium",
						disabled: __props.pending,
						"data-testid": "agent-budget-notice-not-now",
						onClick: _cache[0] || (_cache[0] = ($event) => dismissed.value = true)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.chat.budget.notNow")), 1)]),
						_: 1
					}, 8, ["disabled"]), isCredits.value ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						size: "medium",
						"data-testid": "agent-budget-notice-top-up",
						onClick: topUp
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.chat.budget.credits.topUp")), 1)]),
						_: 1
					})) : __props.canIncrease ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 1,
						size: "medium",
						loading: __props.pending,
						"data-testid": "agent-budget-notice-increase",
						onClick: increase
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.chat.budget.increase")), 1)]),
						_: 1
					}, 8, ["loading"])) : createCommentVNode("", true)], 2)], 64))
				], 2)]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	card: "_card_uq9pg_1",
	body: "_body_uq9pg_7",
	title: "_title_uq9pg_13",
	message: "_message_uq9pg_14",
	amount: "_amount_uq9pg_22",
	actions: "_actions_uq9pg_28"
} }]]);
//#endregion
//#region src/features/agents/composables/useAgentBackgroundJobs.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var MAX_RETRIES = 2;
function useAgentBackgroundJobs(target) {
	const rootStore = useRootStore();
	const pushStore = usePushConnectionStore();
	const visibility = useDocumentVisibility();
	const group = ref({ tasks: [] });
	const isStopping = ref(false);
	const jobs = computed(() => {
		const received = new Map(toValue(target.receivedJobs)?.map((job) => [job.id, job]));
		const current = group.value.tasks.map((job) => ({
			...job,
			status: received.get(job.id)?.status ?? job.status
		}));
		if (current.some((job) => job.status === "running" || job.status === "suspended")) return current;
		if (toValue(target.channel) !== "n8n-chat" && current.some((job) => job.status === "paused" || job.pauseRequested)) return current;
		return group.value.pendingTaskIds?.some((id) => !received.has(id)) ? current : [];
	});
	const active = computed(() => toValue(target.active) && visibility.value === "visible");
	let generation = 0;
	let disposed = false;
	let inFlight;
	let queued = false;
	let scheduled = false;
	let retries = 0;
	let retryTimer;
	function clearRetry() {
		clearTimeout(retryTimer);
		retryTimer = void 0;
	}
	async function fetchJobs() {
		scheduled = false;
		const projectId = toValue(target.projectId);
		const agentId = toValue(target.agentId);
		const threadId = toValue(target.threadId);
		if (disposed || !active.value || !threadId) return;
		if (inFlight || isStopping.value) {
			queued = true;
			return;
		}
		const requestGeneration = generation;
		const request = { generation: requestGeneration };
		inFlight = request;
		const isCurrent = () => !disposed && active.value && generation === requestGeneration && projectId === toValue(target.projectId) && agentId === toValue(target.agentId) && threadId === toValue(target.threadId);
		try {
			const result = await getAgentBackgroundJobs(rootStore.restApiContext, projectId, agentId, threadId, toValue(target.channel));
			if (isCurrent()) {
				group.value = {
					...result,
					tasks: [...result.tasks].sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id))
				};
				retries = 0;
			}
		} catch {
			if (isCurrent() && !queued && retries < MAX_RETRIES) retryTimer = setTimeout(() => {
				retryTimer = void 0;
				scheduleRefresh();
			}, TIME.SECOND * 2 ** retries++);
		} finally {
			if (inFlight === request) {
				inFlight = void 0;
				if (queued) {
					queued = false;
					scheduleRefresh();
				}
			}
		}
	}
	function scheduleRefresh() {
		if (disposed || !active.value || scheduled) return;
		clearRetry();
		scheduled = true;
		Promise.resolve().then(fetchJobs);
	}
	function refresh() {
		retries = 0;
		scheduleRefresh();
	}
	async function respondToApproval(payload) {
		const threadId = toValue(target.threadId);
		if (!threadId) return;
		const requestGeneration = generation;
		try {
			await resumeAgentBackgroundJob(rootStore.restApiContext, toValue(target.projectId), toValue(target.agentId), threadId, payload, toValue(target.channel));
			if (generation === requestGeneration) {
				for (const job of group.value.tasks) if (job.approval?.runId === payload.runId && job.approval.toolCallId === payload.toolCallId) delete job.approval;
			}
		} finally {
			refresh();
		}
	}
	async function stopAll() {
		const threadId = toValue(target.threadId);
		if (!threadId || !active.value || isStopping.value) return;
		const requestGeneration = ++generation;
		isStopping.value = true;
		clearRetry();
		try {
			const result = await stopAgentBackgroundJobs(rootStore.restApiContext, toValue(target.projectId), toValue(target.agentId), threadId, toValue(target.channel));
			if (!disposed && generation === requestGeneration) group.value = result;
		} catch (error) {
			if (!disposed && generation === requestGeneration) throw error;
		} finally {
			if (generation === requestGeneration) isStopping.value = false;
			refresh();
		}
	}
	const removeListener = pushStore.addEventListener((event) => {
		if (event.type === "agentBackgroundTasksUpdated" && event.data.projectId === toValue(target.projectId) && event.data.agentId === toValue(target.agentId) && event.data.threadId === toValue(target.threadId)) refresh();
	});
	watch([
		() => toValue(target.projectId),
		() => toValue(target.agentId),
		() => toValue(target.threadId)
	], () => {
		generation++;
		isStopping.value = false;
		inFlight = void 0;
		queued = false;
		group.value = { tasks: [] };
		clearRetry();
		refresh();
	}, { flush: "sync" });
	watch(active, (enabled) => {
		generation++;
		isStopping.value = false;
		inFlight = void 0;
		queued = false;
		clearRetry();
		if (enabled) refresh();
	}, { immediate: true });
	watch(() => pushStore.isConnected, (connected) => {
		if (connected) refresh();
	});
	onScopeDispose(() => {
		disposed = true;
		clearRetry();
		removeListener();
	});
	return {
		jobs,
		allJobs: computed(() => group.value.tasks),
		respondToApproval,
		stopAll,
		isStopping
	};
}
//#endregion
//#region src/features/ai/shared/components/ToolApprovalCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ToolApprovalCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ToolApprovalCard",
	props: {
		input: {},
		taskTitle: {},
		agentName: {},
		tools: {},
		disabled: { type: Boolean },
		autoFocus: {
			type: Boolean,
			default: true
		},
		useKeyShortcuts: {
			type: Boolean,
			default: true
		}
	},
	emits: ["submit"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const approvalLabels = useApprovalCardLabels();
		const toolLabel = computed(() => props.input.displayName ?? props.input.toolName);
		const nodeType = computed(() => {
			const tool = props.tools?.find((tool) => tool.type === "node" && nodeNameToToolName(tool.name) === props.input.toolName);
			if (tool?.type !== "node") return null;
			const nodeTypesStore = useNodeTypesStore();
			return nodeTypesStore.getNodeType(tool.node.nodeType, tool.node.nodeTypeVersion) ?? nodeTypesStore.communityNodeType(tool.node.nodeType)?.nodeDescription ?? null;
		});
		function submit(key) {
			if (props.disabled) return;
			if (key === "always-allow") {
				emit("submit", {
					approved: true,
					scope: "session"
				});
				return;
			}
			if (key === "allow-once" || key === "deny") emit("submit", { approved: key === "allow-once" });
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(ApprovalCard_default), {
				title: unref(i18n).baseText("agents.chat.approval.description", { interpolate: { toolName: toolLabel.value } }),
				labels: unref(approvalLabels),
				args: __props.input.args,
				"supports-session-approval": __props.input.supportsSessionApproval,
				disabled: __props.disabled,
				"auto-focus": __props.autoFocus,
				"use-key-shortcuts": __props.useKeyShortcuts,
				"data-testid": "agent-approval-card",
				onSelect: submit
			}, {
				title: withCtx(() => [__props.taskTitle ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					bold: "",
					step: "sm",
					class: normalizeClass(_ctx.$style.taskTitle),
					"data-testid": "agent-approval-task-title"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.chat.backgroundTasks.approvalFor", { interpolate: { title: __props.taskTitle } })), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true), createVNode(unref(N8nText_default), { step: "sm" }, {
					default: withCtx(() => [createVNode(unref(I18nT), {
						keypath: "agents.chat.approval.agentDescription",
						scope: "global"
					}, {
						agentName: withCtx(() => [createTextVNode(toDisplayString(__props.agentName?.trim() || unref(i18n).baseText("agentSessions.timeline.agent")), 1)]),
						toolName: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.nameBadge) }, [nodeType.value ? (openBlock(), createBlock(NodeIcon_default, {
							key: 0,
							"node-type": nodeType.value,
							"aria-hidden": "true"
						}, null, 8, ["node-type"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
							key: 1,
							icon: "wrench",
							"aria-hidden": "true"
						})), createTextVNode(" " + toDisplayString(toolLabel.value), 1)], 2)]),
						_: 1
					})]),
					_: 1
				})]),
				_: 1
			}, 8, [
				"title",
				"labels",
				"args",
				"supports-session-approval",
				"disabled",
				"auto-focus",
				"use-key-shortcuts"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	taskTitle: "_taskTitle_wkb77_1",
	nameBadge: "_nameBadge_wkb77_7"
} }]]);
//#endregion
export { isApprovalSuspendInput as A, formatDelegateError as B, convertDbMessages as C, findTailSteerableInteractive as D, findTailOpenInteractive as E, isPolicyRefusedToolOutput as F, resolveSubAgentIdForDisplay as G, isDelegateSubAgentTool as H, parseToolPolicyRefusal as I, resolveSubAgentName as K, addReplyAttachments as L, rebuildInteractiveFromHistory as M, setMessageInteractives as N, getMessageInteractive as O, upsertMessageInteractive as P, summariseToolCall as R, applyOpenSuspensions as S, findOpenInteractive as T, isFailedDelegateOutput as U, getDelegateDifficultySummary as V, parseDelegateOutput as W, monthlyBudgetSave as _, useSubAgentNames as a, sessionCapSave as b, AGENT_SUB_AGENT_NAMES_KEY as c, backgroundJobTimelineLabelKey as d, useAgentExecutionUpdates as f, isBudgetStopCode as g, increasedBudgetConfig as h, getToolOutputAttachments as i, parseApprovalInput as j, getMessageInteractives as k, BACKGROUND_JOB_STATUS_LABEL_KEYS as l, formatBudgetUsd as m, useAgentBackgroundJobs as n, AgentChatMessageAttachments_default as o, budgetNoticeCodesForField as p, isAwaitingCard as q, AgentBudgetNoticeCard_default as r, AGENT_ATTACHMENT_URL_KEY as s, ToolApprovalCard_default as t, backgroundJobResultLabel as u, parseBudgetAmount as v, createStoppedMessage as w, snapAlertPercent as x, raisedBudgetCaps as y, SUB_AGENT_DIFFICULTY_I18N_KEY as z };
