import { ref } from 'vue';

export function useDeviceSupport() {
	/**
	 * Check if the device is a touch device but exclude devices that have a fine pointer (mouse or track-pad)
	 * - `fine` will check for an accurate pointing device. Examples include mice, touch-pads, and drawing styluses
	 * - `coarse` will check for a pointing device of limited accuracy. Examples include touchscreens and motion-detection sensors
	 * - `any-pointer` will check for the presence of any pointing device, if there are multiple of them
	 */
	const isTouchDevice = ref(
		window.matchMedia('(any-pointer: coarse)').matches &&
			!window.matchMedia('(any-pointer: fine)').matches,
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
