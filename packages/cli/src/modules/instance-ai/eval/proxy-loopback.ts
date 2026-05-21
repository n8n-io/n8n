// Ensures NO_PROXY includes loopback so HTTP_PROXY doesn't route the wire server through a proxy.
// Reference-counted: process.env is shared, so overlapping eval runs must not stomp on each other.
let activeCount = 0;
let originalValue: string | undefined;
let hadOriginal = false;

export function patchNoProxyForLoopback(): () => void {
	if (activeCount === 0) {
		hadOriginal = Object.prototype.hasOwnProperty.call(process.env, 'NO_PROXY');
		originalValue = process.env.NO_PROXY;
		applyLoopbackPatch(originalValue);
	}
	activeCount++;

	let restored = false;
	return () => {
		if (restored) return;
		restored = true;
		activeCount--;
		if (activeCount === 0) {
			if (!hadOriginal) {
				delete process.env.NO_PROXY;
			} else {
				process.env.NO_PROXY = originalValue;
			}
			originalValue = undefined;
			hadOriginal = false;
		}
	};
}

function applyLoopbackPatch(previous: string | undefined): void {
	const loopback = '127.0.0.1,localhost';
	if (previous === undefined || previous.length === 0) {
		process.env.NO_PROXY = loopback;
		return;
	}
	const entries = previous.split(',').map((s) => s.trim());
	const alreadyPresent = entries.includes('127.0.0.1') && entries.includes('localhost');
	if (!alreadyPresent) {
		process.env.NO_PROXY = `${loopback},${previous}`;
	}
}
