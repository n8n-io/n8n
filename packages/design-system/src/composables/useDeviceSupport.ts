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
	const isMacOs = ref(
		userAgent.value.includes('macintosh') ||
			userAgent.value.includes('ipad') ||
			userAgent.value.includes('iphone') ||
			userAgent.value.includes('ipod'),
	);
	const controlKeyCode = ref(isMacOs.value ? 'Meta' : 'Control');

	function isCtrlKeyPressed(e: MouseEvent | KeyboardEvent): boolean {
		if (isMacOs.value) {
			return (e as KeyboardEvent).metaKey;
		}
		return (e as KeyboardEvent).ctrlKey;
	}

	return {
		isTouchDevice: isTouchDevice.value,
		isMacOs: isMacOs.value,
		controlKeyCode: controlKeyCode.value,
		isCtrlKeyPressed,
	};
}
