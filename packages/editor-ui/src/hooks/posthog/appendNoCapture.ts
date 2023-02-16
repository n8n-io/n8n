import { n8nPosthogHooks_POSTHOG_NO_CAPTURE_CLASS } from '@/hooks/constants';

export function hooksPosthogAppendNoCapture(
	originalClasses: string,
	noCaptureClass = n8nPosthogHooks_POSTHOG_NO_CAPTURE_CLASS,
) {
	return [originalClasses, noCaptureClass].join(' ');
}
