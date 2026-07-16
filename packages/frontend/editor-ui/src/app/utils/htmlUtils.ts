/**
 * @deprecated Import from `@n8n/composables/htmlUtils` instead. This re-export
 * shim keeps existing `@/app/utils/htmlUtils` call sites working during the
 * CAT-3686 frontend-modularization migration and will be removed once importers
 * are retired per-directory. (N8N-36)
 */
export {
	capitalizeFirstLetter,
	getBannerRowHeight,
	getScrollbarWidth,
	isEventTargetContainedBy,
	isOutsideSelected,
	openSafeUrl,
	sanitizeHtml,
	sanitizeIfString,
} from '@n8n/composables/htmlUtils';
