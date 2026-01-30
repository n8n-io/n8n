import type { BrowserApiPushMessage } from '@n8n/api-types/push/browser-api';
import { useBrowserNotifications } from '@/app/composables/useBrowserNotifications';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';

/**
 * Validates that a URL is a safe HTTP/HTTPS URL.
 * Returns true if valid, false otherwise.
 */
function isValidHttpUrl(urlString: string): boolean {
	try {
		const url = new URL(urlString);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

/**
 * Plays a custom sound from a URL using the Audio element.
 * Only allows HTTP/HTTPS URLs for security.
 */
function playCustomSound(
	url: string,
	volume: number,
	toast: ReturnType<typeof useToast>,
	i18n: ReturnType<typeof useI18n>,
): void {
	if (!isValidHttpUrl(url)) {
		toast.showMessage({
			title: i18n.baseText('browserApi.playSound.failed.title'),
			message: i18n.baseText('browserApi.playSound.invalidUrl.message'),
			type: 'warning',
		});
		return;
	}

	const audio = new Audio(url);
	audio.volume = volume;
	audio.play().catch(() => {
		toast.showMessage({
			title: i18n.baseText('browserApi.playSound.failed.title'),
			message: i18n.baseText('browserApi.playSound.failed.message'),
			type: 'warning',
		});
	});
}

/**
 * Plays a preset sound using the Web Audio API.
 * Synthesizes simple tones for each preset type.
 */
function playPresetSound(sound: 'success' | 'error' | 'warning' | 'info', volume: number): void {
	const audioContext = new AudioContext();

	// Sound configurations: frequency (Hz), duration (ms), waveform
	const soundConfigs: Record<
		typeof sound,
		{ frequencies: number[]; duration: number; waveform: OscillatorType }
	> = {
		success: { frequencies: [523.25, 659.25, 783.99], duration: 150, waveform: 'sine' }, // C5, E5, G5 (major chord arpeggio)
		error: { frequencies: [200, 150], duration: 200, waveform: 'square' }, // Low descending tone
		warning: { frequencies: [440, 440], duration: 150, waveform: 'triangle' }, // A4 repeated
		info: { frequencies: [880], duration: 100, waveform: 'sine' }, // A5 short ping
	};

	const config = soundConfigs[sound];
	let startTime = audioContext.currentTime;

	for (const freq of config.frequencies) {
		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();

		oscillator.type = config.waveform;
		oscillator.frequency.value = freq;

		gainNode.gain.setValueAtTime(0, startTime);
		gainNode.gain.linearRampToValueAtTime(volume * 0.3, startTime + 0.01);
		gainNode.gain.linearRampToValueAtTime(0, startTime + config.duration / 1000);

		oscillator.connect(gainNode);
		gainNode.connect(audioContext.destination);

		oscillator.start(startTime);
		oscillator.stop(startTime + config.duration / 1000);

		startTime += config.duration / 1000;
	}
}

/**
 * Displays a native browser notification.
 * Shows a warning toast if notifications are blocked or not supported.
 * For 'default' permission state, shows a clickable toast to request permission.
 */
function handleNotification(event: BrowserApiPushMessage): void {
	const { isSupported, isEnabled, isDenied, requestPermission, showNotification } =
		useBrowserNotifications();
	const toast = useToast();
	const i18n = useI18n();

	if (event.data.type !== 'notification') {
		return;
	}

	const { notification } = event.data;

	if (!isSupported.value) {
		toast.showMessage({
			title: i18n.baseText('browserApi.notification.notSupported.title'),
			message: i18n.baseText('browserApi.notification.notSupported.message'),
			type: 'warning',
		});
		return;
	}

	if (isDenied.value) {
		toast.showMessage({
			title: i18n.baseText('browserApi.notification.denied.title'),
			message: i18n.baseText('browserApi.notification.denied.message'),
			type: 'warning',
		});
		return;
	}

	// Validate icon URL - only allow HTTP/HTTPS URLs or use default favicon
	const defaultIcon = '/favicon.ico';
	const notificationIcon =
		notification.icon && isValidHttpUrl(notification.icon) ? notification.icon : defaultIcon;

	if (!isEnabled.value) {
		toast.showToast({
			title: i18n.baseText('browserApi.notification.notEnabled.title'),
			message: i18n.baseText('browserApi.notification.notEnabled.message'),
			type: 'warning',
			duration: 0,
			closeOnClick: true,
			async onClick() {
				const result = await requestPermission({ force: true });
				if (result.permission === 'granted') {
					showNotification(notification.title, {
						body: notification.body,
						icon: notificationIcon,
						tag: `n8n-workflow-${event.data.workflowId ?? 'notification'}`,
					});
				}
			},
		});
		return;
	}

	showNotification(notification.title, {
		body: notification.body,
		icon: notificationIcon,
		tag: `n8n-workflow-${event.data.workflowId ?? 'notification'}`,
	});
}

/**
 * Plays a sound in the browser.
 * Supports preset sounds (synthesized via Web Audio API) or custom URLs.
 */
function handlePlaySound(event: BrowserApiPushMessage): void {
	const toast = useToast();
	const i18n = useI18n();

	if (event.data.type !== 'playSound') {
		return;
	}

	const { sound, url, volume = 1.0 } = event.data.playSound;
	const clampedVolume = Math.max(0, Math.min(1, volume));

	if (sound === 'custom') {
		if (!url) {
			toast.showMessage({
				title: i18n.baseText('browserApi.playSound.noUrl.title'),
				message: i18n.baseText('browserApi.playSound.noUrl.message'),
				type: 'warning',
			});
			return;
		}
		playCustomSound(url, clampedVolume, toast, i18n);
	} else {
		playPresetSound(sound, clampedVolume);
	}
}

/**
 * Handles browser API push messages by dispatching to the appropriate handler
 * based on the message type. This provides a generic system for triggering
 * browser-side functionality from workflow nodes.
 *
 * Supported types:
 * - 'notification': Display a native browser notification
 * - 'playSound': Play a sound (preset or custom URL)
 *
 */
export function browserApi(event: BrowserApiPushMessage): void {
	switch (event.data.type) {
		case 'notification':
			handleNotification(event);
			break;
		case 'playSound':
			handlePlaySound(event);
			break;
	}
}
