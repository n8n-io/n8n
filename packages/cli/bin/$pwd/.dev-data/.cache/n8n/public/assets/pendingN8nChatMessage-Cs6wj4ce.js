//#region src/features/agents/n8nChatPage/pendingN8nChatMessage.ts
var pending;
function stashPendingN8nChatMessage(message) {
	pending = message;
}
/**
* One-shot read: always clears the stored hand-off, even for a mismatched
* `agentId`, so a stale message never reaches a later visit to a different agent.
*/
function consumePendingN8nChatMessage(agentId) {
	const message = pending;
	pending = void 0;
	return message?.agentId === agentId ? message : void 0;
}
/**
* Clears the slot only if it still holds this exact message. Use this to back
* out of a stash after a failed hand-off: a later stash may already have
* replaced it, and that later one must survive.
*/
function discardPendingN8nChatMessage(message) {
	if (pending !== message) return false;
	pending = void 0;
	return true;
}
//#endregion
export { discardPendingN8nChatMessage as n, stashPendingN8nChatMessage as r, consumePendingN8nChatMessage as t };
