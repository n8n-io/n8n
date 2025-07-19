import { ref } from 'vue';

export function useDeviceSupport() {
	/**
	 * Check if the device is a touch device using multiple detection methods:
	 * 1. maxTouchPoints > 0 indicates touch capability (primary method)
	 * 2. matchMedia queries for pointer types (fallback for older devices):
	 *    - `fine` will check for an accurate pointing device (mice, touch-pads, styluses)
	 *    - `coarse` will check for a pointing device of limited accuracy (touchscreens)
	 *    - `any-pointer` will check for the presence of any pointing device
	 *
	 * Note: Modern hybrid tablets (iPad Pro, Surface Pro, Galaxy Tab, etc.) often report
	 * both fine and coarse pointers due to supporting multiple input methods (touch, pen, keyboard).
	 * We prioritize maxTouchPoints detection to ensure proper touch support regardless of
	 * additional input capabilities.
	 */
	const hasTouchPoints = ref(navigator.maxTouchPoints > 0);
	const hasCoarsePointer = ref(window.matchMedia('(any-pointer: coarse)').matches);
	const hasFinePointer = ref(window.matchMedia('(any-pointer: fine)').matches);

	const isTouchDevice = ref(
		hasTouchPoints.value || (hasCoarsePointer.value && !hasFinePointer.value),
	);
	const userAgent = ref(navigator.userAgent.toLowerCase());

	const isIOs = ref(
		userAgent.value.includes('iphone') ||
			userAgent.value.includes('ipad') ||
			userAgent.value.includes('ipod'),
	);
	const isAndroidOs = ref(userAgent.value.includes('android'));
	const isMacOs = ref(userAgent.value.includes('macintosh') || isIOs.value);
	const isMobileDevice = ref(isIOs.value || isAndroidOs.value);

	const controlKeyCode = ref(isMacOs.value ? 'Meta' : 'Control');

	function isCtrlKeyPressed(e: MouseEvent | KeyboardEvent): boolean {
		if (isMacOs.value) {
			return (e as KeyboardEvent).metaKey;
		}
		return (e as KeyboardEvent).ctrlKey;
	}

	return {
		userAgent: userAgent.value,
		isTouchDevice: isTouchDevice.value,
		isAndroidOs: isAndroidOs.value,
		isIOs: isIOs.value,
		isMacOs: isMacOs.value,
		isMobileDevice: isMobileDevice.value,
		controlKeyCode: controlKeyCode.value,
		isCtrlKeyPressed,
	};
}
