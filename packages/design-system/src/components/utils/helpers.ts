export function addTargetBlank(html: string) {
	return html?.includes('href=') ? html.replace(/href=/g, 'target="_blank" href=') : html;
}
