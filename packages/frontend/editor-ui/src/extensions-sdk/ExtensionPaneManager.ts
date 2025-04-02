import { SETTINGS_EXTENSIONS_CONTAINER_ID } from '@/constants';

export interface ExtensionIframeManagerOptions {
	watchStyleChanges?: boolean;
}

// TODO: Observe style changes
export class ExtensionIframeManager {
	private iframes: Map<string, HTMLIFrameElement>;

	private styleCache: string;

	private styleElements: Element[];

	private options: ExtensionIframeManagerOptions;

	constructor(options: ExtensionIframeManagerOptions = {}) {
		this.iframes = new Map<string, HTMLIFrameElement>();
		this.styleCache = '';
		this.styleElements = [];
		this.options = {
			watchStyleChanges: true,
			...options,
		};
	}

	async collectStyles(): Promise<string> {
		// Get all style elements in the head
		const styleElements = Array.from(
			document.head.querySelectorAll('style, link[rel="stylesheet"]'),
		);
		this.styleElements = styleElements;

		let combinedStyles = '';

		// Process each style element
		for (const element of styleElements) {
			try {
				// For <style> elements, get the CSS text directly
				if (element.tagName === 'STYLE') {
					const styleElement = element as HTMLStyleElement;
					combinedStyles += styleElement.textContent + '\n';
				}
				// For <link> elements, fetch the CSS file
				else if (element.tagName === 'LINK') {
					const linkElement = element as HTMLLinkElement;
					if (linkElement.rel === 'stylesheet' && linkElement.href) {
						try {
							const response = await fetch(linkElement.href);
							if (response.ok) {
								const css = await response.text();
								combinedStyles += css + '\n';
							}
						} catch (error) {
							console.warn(`Could not fetch stylesheet: ${linkElement.href}`, error);
						}
					}
				}
			} catch (error) {
				console.error('Error collecting styles:', error);
			}
		}

		this.styleCache = combinedStyles;
		return this.styleCache;
	}

	createSettingsExtensionIframe(id: string, name: string): HTMLIFrameElement {
		const settingsExtensionContainer = document.getElementById(SETTINGS_EXTENSIONS_CONTAINER_ID);
		if (!settingsExtensionContainer) {
			throw new Error(
				`Settings extension container with id "${SETTINGS_EXTENSIONS_CONTAINER_ID}" not found`,
			);
		}
		const extensionIFrame = document.createElement('iframe');
		extensionIFrame.id = id;
		settingsExtensionContainer.appendChild(extensionIFrame);

		return extensionIFrame;
	}

	registerIframe(extensionId: string, iframe: HTMLIFrameElement): void {
		this.iframes.set(extensionId, iframe);

		// Make sure the iframe is ready before injecting styles
		iframe.addEventListener('load', () => {
			this.injectStylesIntoIframe(iframe);
		});

		// If the iframe is already loaded, inject styles now
		if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
			this.injectStylesIntoIframe(iframe);
		}
	}

	unregisterIframe(extensionId: string): void {
		this.iframes.delete(extensionId);
	}

	injectStylesIntoIframe(iframe: HTMLIFrameElement): void {
		try {
			const iframeWindow = iframe.contentWindow;
			if (!iframeWindow) {
				throw new Error('Cannot access iframe content window');
			}

			const iframeDoc = iframe.contentDocument || iframeWindow.document;
			if (!iframeDoc) {
				throw new Error('Cannot access iframe document');
			}

			// Create a style element in the iframe
			const styleElement = iframeDoc.createElement('style');
			styleElement.setAttribute('data-source', 'parent-app');
			styleElement.textContent = this.styleCache;

			// Remove any previous injected styles
			const previousStyle = iframeDoc.querySelector('style[data-source="parent-app"]');
			if (previousStyle && previousStyle.parentNode) {
				previousStyle.parentNode.removeChild(previousStyle);
			}

			// Add the new styles to the iframe's head
			if (iframeDoc.head) {
				iframeDoc.head.appendChild(styleElement);
			} else {
				console.warn('Iframe has no head element for style injection');
			}
		} catch (error) {
			console.error('Error injecting styles into iframe:', error);
		}
	}

	destroy(): void {
		this.iframes.clear();
	}
}
