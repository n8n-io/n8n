/**
 * Per-device localStorage key remembering which 2FA method the user used last
 * to sign in. Read on the MFA prompt to pick a sensible default and written
 * after a successful sign-in. Stored values are `MfaMethod` strings.
 */
export const LAST_2FA_METHOD_KEY = 'n8n.last2faMethod';
