import { yC as useSettingsStore } from "./app-D5flEmb-.js";
//#region src/app/utils/postMessageUtils.ts
/**
* Whether a `postMessage` command from the given origin should be processed.
*
* When an allowlist is configured, only accept commands from those origins
* (same-origin is always allowed). An empty allowlist keeps the historical
* behavior of accepting messages from any origin, so existing embeds are
* unaffected unless an operator opts in.
*/
function isPostMessageOriginAllowed(origin) {
	const allowedOrigins = useSettingsStore().settings.security?.postMessageAllowedOrigins ?? [];
	if (allowedOrigins.length === 0) return true;
	return origin === window.location.origin || allowedOrigins.includes(origin);
}
//#endregion
export { isPostMessageOriginAllowed as t };
