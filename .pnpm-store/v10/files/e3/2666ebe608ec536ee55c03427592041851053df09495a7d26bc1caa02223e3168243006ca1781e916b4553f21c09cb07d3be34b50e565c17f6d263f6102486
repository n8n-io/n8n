const require_error = require('./error.cjs');

//#region src/auth/index.ts
var Auth = class {
	/**
	* @internal
	* @ignore
	*/
	"~handlerCache" = {};
	authenticate(cb) {
		this["~handlerCache"].authenticate = cb;
		return this;
	}
	on(event, callback) {
		this["~handlerCache"].callbacks ??= {};
		const events = Array.isArray(event) ? event : [event];
		for (const event$1 of events) this["~handlerCache"].callbacks[event$1] = callback;
		return this;
	}
};
/**
* Check if the provided user was provided by LangGraph Studio.
*
* By default, if you add custom authorization on your resources, this will also apply to interactions made from the Studio.
* If you want, you can handle logged-in Studio users in a special way.
*
* @param user - The user to check
* @returns True if the user is a studio user, false otherwise
*/
function isStudioUser(user) {
	if ("kind" in user && user.kind === "StudioUser") return true;
	return user.identity === "langgraph-studio-user";
}

//#endregion
exports.Auth = Auth;
exports.HTTPException = require_error.HTTPException;
exports.isStudioUser = isStudioUser;
//# sourceMappingURL=index.cjs.map