export function addTargetBlank(html: string) {
	return html.includes('a href')
		? html.replace(/a href/g, 'a target="_blank" href')
		: html;
}
