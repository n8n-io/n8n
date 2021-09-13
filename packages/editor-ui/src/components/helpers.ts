import dateformat from 'dateformat';

const KEYWORDS_TO_FILTER = ['API', 'OAuth1', 'OAuth2'];

export function addTargetBlank(html: string) {
	return html.includes('href=')
		? html.replace(/href=/g, 'target="_blank" href=')
		: html;
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
