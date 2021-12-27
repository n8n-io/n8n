import dateformat from 'dateformat';

const KEYWORDS_TO_FILTER = ['API', 'OAuth1', 'OAuth2'];
const SI_SYMBOL = ['', 'k', 'M', 'G', 'T', 'P', 'E'];

export function abbreviateNumber(num: number) {
	const tier = (Math.log10(Math.abs(num)) / 3) | 0;

	if (tier === 0) return num;

	const suffix = SI_SYMBOL[tier];
	const scale = Math.pow(10, tier * 3);
	const scaled = num / scale;

	return Number(scaled.toFixed(1)) + suffix;
}

export function convertToDisplayDate (epochTime: number) {
	return dateformat(epochTime, 'yyyy-mm-dd HH:MM:ss');
}

export function convertToHumanReadableDate (epochTime: number) {
	return dateformat(epochTime, 'd mmmm, yyyy @ HH:MM Z');
}

export function getAppNameFromCredType(name: string) {
	return name.split(' ').filter((word) => !KEYWORDS_TO_FILTER.includes(word)).join(' ');
}

export function getStyleTokenValue(name: string): string {
	const style = getComputedStyle(document.body);
	return style.getPropertyValue(name);
}
