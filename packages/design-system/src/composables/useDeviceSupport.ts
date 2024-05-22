import { ref } from 'vue';

export function useDeviceSupport() {
	const isTouchDevice = ref(window.hasOwnProperty('ontouchstart') || navigator.maxTouchPoints > 0);
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
