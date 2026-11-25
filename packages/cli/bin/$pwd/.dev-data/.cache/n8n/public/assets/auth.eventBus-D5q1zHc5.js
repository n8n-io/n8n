import { jM as createEventBus } from "./app-D5flEmb-.js";
//#region src/features/core/auth/auth.eventBus.ts
var confirmPasswordEventBus = createEventBus();
var mfaEventBus = createEventBus();
/**
* Event bus for transmitting the MFA code from a modal back to the view
*/
var promptMfaCodeBus = createEventBus();
//#endregion
export { mfaEventBus as n, promptMfaCodeBus as r, confirmPasswordEventBus as t };
