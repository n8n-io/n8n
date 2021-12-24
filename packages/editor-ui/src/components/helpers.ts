import dateformat from 'dateformat';

const KEYWORDS_TO_FILTER = ['API', 'OAuth1', 'OAuth2'];

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
