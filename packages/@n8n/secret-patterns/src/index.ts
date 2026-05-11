export { BUILTIN_PATTERNS, type SecretPattern } from './patterns';
export {
	isPlainObject,
	redactionMarker,
	redactString,
	redactStringDetailed,
	redactValue,
	redactValueDetailed,
} from './redact';
export {
	StreamingRedactor,
	type StreamingRedactorChunk,
	type StreamingRedactorHit,
} from './streaming-redactor';
