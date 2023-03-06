import { POSTHOG_NO_CAPTURE_CLASS } from '@/hooks/constants';

export function hoosGetPosthogAppendNoCaptureClasses(
	originalClasses: string,
	noCaptureClass = POSTHOG_NO_CAPTURE_CLASS,
) {
	return [originalClasses, noCaptureClass].join(' ');
}
