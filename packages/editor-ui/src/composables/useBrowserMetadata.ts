export function useBrowserMetadata() {
	const userAgent = window.navigator.userAgent.toLowerCase(),
		macosPlatforms = /(macintosh|macintel|macppc|mac68k|macos)/i,
		windowsPlatforms = /(win32|win64|windows|wince)/i,
		iosPlatforms = /(iphone|ipad|ipod)/i,
		androidPlatforms = /(android)/i;

	let operatingSystem;
	if (macosPlatforms.test(userAgent)) {
		operatingSystem = 'macos';
	} else if (iosPlatforms.test(userAgent)) {
		operatingSystem = 'ios';
	} else if (windowsPlatforms.test(userAgent)) {
		operatingSystem = 'windows';
	} else if (androidPlatforms.test(userAgent)) {
		operatingSystem = 'android';
	} else {
		operatingSystem = 'linux';
	}

	const isMacOs = operatingSystem === 'macos';

	return {
		operatingSystem,
		isMacOs,
	};
}
