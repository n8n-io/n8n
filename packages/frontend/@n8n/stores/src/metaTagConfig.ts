function getTagName(configName: string): string {
	return `n8n:config:${configName}`;
}

/**
 * Utility function to read and decode base64-encoded configuration values from meta tags
 */
export function getConfigFromMetaTag(configName: string): string | null {
	const tagName = getTagName(configName);

	try {
		const metaTag = document.querySelector(`meta[name="${tagName}"]`);
		if (!metaTag) {
			return null;
		}

		const encodedContent = metaTag.getAttribute('content');
		if (!encodedContent) {
			return null;
		}

		// Decode base64 content
		const content = atob(encodedContent);
		return content;
	} catch (error) {
		console.warn(`Failed to read n8n config for "${tagName}":`, error);
		return null;
	}
}

/**
 * Utility function to read and parse configuration values from meta tags
 */
export function getAndParseConfigFromMetaTag<T>(configName: string): T | null {
	const config = getConfigFromMetaTag(configName);
	if (!config) {
		return null;
	}

	try {
		return JSON.parse(config) as T;
	} catch (error) {
		console.warn(`Failed to parse n8n config for "${getTagName(configName)}":`, error);
		return null;
	}
}
