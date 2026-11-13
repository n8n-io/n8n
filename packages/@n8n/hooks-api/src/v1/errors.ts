/**
 * The error that V1 methods reject with when the cause is known. Check `code`,
 * not the class or the message: both can change between n8n versions.
 */
export interface HooksApiErrorV1<Code extends string = string> extends Error {
	code: Code;
}
