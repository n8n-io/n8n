//#region src/messages/message.ts
/**
* Type guard to check if a value is a valid Message object.
*
* @param message - The value to check
* @returns true if the value is a valid Message object, false otherwise
*/
function isMessage(message) {
	return typeof message === "object" && message !== null && "type" in message && "content" in message && (typeof message.content === "string" || Array.isArray(message.content));
}
//#endregion
export { isMessage };

//# sourceMappingURL=message.js.map