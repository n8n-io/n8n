/**
 * @deprecated Import from `@n8n/composables/constants/sanitization` instead. These
 * constants moved into `@n8n/composables` (folded in with their only consumer
 * `htmlUtils`) during the CAT-3686 frontend-modularization migration; this
 * re-export keeps `@/app/constants` consumers working until they are retired.
 * (N8N-36)
 */
export {
	ALLOWED_HTML_ATTRIBUTES,
	ALLOWED_HTML_TAGS,
} from '@n8n/composables/constants/sanitization';
