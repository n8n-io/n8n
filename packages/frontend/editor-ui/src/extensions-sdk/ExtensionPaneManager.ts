import { useToast } from '@/composables/useToast';
import { SETTINGS_EXTENSIONS_CONTAINER_ID } from '@/constants';

export interface ExtensionIframeManagerOptions {
	watchStyleChanges?: boolean;
}

export interface IframeMessage {
	type: string;
	frameId?: string;
	payload?: string;
	elementId?: string;
}

// TODO: Observe style changes
export class ExtensionIframeManager {
	private iframes: Map<string, HTMLIFrameElement>;

	private readyFrames: Set<string>;

	private pendingContentUpdates: Map<string, string>;

	private styleCache: string;

	private styleElements: Element[];

	private options: ExtensionIframeManagerOptions;

	constructor(options: ExtensionIframeManagerOptions = {}) {
		this.iframes = new Map<string, HTMLIFrameElement>();
		this.readyFrames = new Set<string>();
		this.pendingContentUpdates = new Map<string, string>();
		this.styleCache = '';
		this.styleElements = [];
		this.options = {
			watchStyleChanges: true,
			...options,
		};
		window.addEventListener('message', this.handleIframeMessage.bind(this));
	}

	getReadyFrames(): Set<string> {
		return this.readyFrames;
	}

	// TODO: Check what this is picking up, we don't need all styles in iframes
	async collectStyles(): Promise<void> {
		return await new Promise((resolve) => {
			// Get all stylesheet elements
			const styleSheets = Array.from(document.styleSheets);
			let combinedStyles = '';

			// Process each stylesheet
			styleSheets.forEach((sheet) => {
				try {
					// Check if we can access the rules (may fail for cross-origin sheets)
					if (sheet.cssRules) {
						// Convert CSSRuleList to a string
						const rules = Array.from(sheet.cssRules);
						rules.forEach((rule) => {
							combinedStyles += rule.cssText + '\n';
						});
					}
				} catch (e) {
					console.warn('Could not access rules from stylesheet:', e);
				}
			});

			// Add any inline styles from style elements
			const styleElements = document.querySelectorAll('style');
			styleElements.forEach((style) => {
				combinedStyles += style.textContent + '\n';
			});

			// Store the collected styles
			this.styleCache = combinedStyles;

			// Send updated styles to all registered iframes
			this.sendStylesToAllIframes();

			resolve();
		});
	}

	private sendStylesToAllIframes(): void {
		// Send styles to all registered and ready iframes
		this.readyFrames.forEach((frameId) => {
			this.sendStylesToIframe(frameId);
		});
	}

	private sendStylesToIframe(frameId: string): void {
		const iframe = this.iframes.get(frameId);
		if (iframe?.contentWindow) {
			iframe.contentWindow.postMessage(
				{
					type: 'setStyles',
					payload: this.styleCache,
				},
				'*',
			);
		}
	}

	// Update styles when the parent app's styles change
	async updateStyles(): Promise<void> {
		return await this.collectStyles();
	}

	private handleIframeMessage(event: MessageEvent): void {
		const data = event.data as IframeMessage;

		if (data.type === 'iframeReady' && data.frameId) {
			const frameId = data.frameId;

			// Mark frame as ready
			this.readyFrames.add(frameId);

			this.sendStylesToIframe(frameId);

			// Check if there are pending content updates for this frame
			if (this.pendingContentUpdates.has(frameId)) {
				const content = this.pendingContentUpdates.get(frameId) as string;
				this.applyContentUpdate(frameId, content);
				this.pendingContentUpdates.delete(frameId);
			}
		} else if (data.type === 'setContent' && data.frameId) {
			const frameId = data.frameId;
			this.applyContentUpdate(frameId, data.payload as string);
		} else if (data.type === 'appendContent' && data.frameId) {
			const frameId = data.frameId;
			this.appendPanelContent(
				this.iframes.get(frameId) as HTMLIFrameElement,
				data.payload as string,
			);
		} else if (data.type === 'setElementContent' && data.frameId && data.elementId) {
			const frameId = data.frameId;
			this.setElementContent(
				this.iframes.get(frameId) as HTMLIFrameElement,
				data.elementId,
				data.payload as string,
			);
		}
	}

	createSettingsExtensionIframe(
		id: string,
		name: string,
		enableScripts?: boolean,
	): HTMLIFrameElement {
		// TODO: This only works for settings extensions
		const settingsExtensionContainer = document.getElementById(SETTINGS_EXTENSIONS_CONTAINER_ID);

		if (!settingsExtensionContainer) {
			throw new Error(
				`Settings extension container with id "${SETTINGS_EXTENSIONS_CONTAINER_ID}" not found`,
			);
		}

		// Create boilerplate HTML content for the iframe
		// This includes a script to handle method calls and content updates
		// and a style element for injecting styles from the parent app
		// TODO: Extract this to a separate file and make copy/pasted code reusable (also move scripts to body when injecting)
		const htmlContent = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>${name}</title>
				<style id="parent-app-styles">
					/* Styles will be injected here via postMessage */
				</style>
				<script>
					// Content update handler
					window.addEventListener('message', (event) => {
						if (event.data.type === 'setContent') {
							const container = document.getElementById('plugin-content');
							if (container) {
								container.innerHTML = event.data.payload;

								// Execute scripts
								const scripts = container.querySelectorAll('script');
								scripts.forEach(oldScript => {
									const newScript = document.createElement('script');

									Array.from(oldScript.attributes).forEach(attr => {
										newScript.setAttribute(attr.name, attr.value);
									});

									newScript.textContent = oldScript.textContent;
									oldScript.parentNode.replaceChild(newScript, oldScript);
								});
							}
						}
						else if (event.data.type === 'appendContent') {
							const container = document.getElementById('plugin-content');
							if (container) {
								container.innerHTML += event.data.payload;

								// Execute scripts
								const scripts = container.querySelectorAll('script');
								scripts.forEach(oldScript => {
									const newScript = document.createElement('script');

									Array.from(oldScript.attributes).forEach(attr => {
										newScript.setAttribute(attr.name, attr.value);
									});

									newScript.textContent = oldScript.textContent;
									oldScript.parentNode.replaceChild(newScript, oldScript);
								});
							}
						}
						else if (event.data.type === 'setElementContent') {
							const container = document.getElementById('plugin-content');
							if (container) {
								const element = container.querySelector('#' + event.data.elementId);
								if (element) {
									element.innerHTML = event.data.payload;
									// Execute scripts
									const scripts = container.querySelectorAll('script');
									scripts.forEach(oldScript => {
										const newScript = document.createElement('script');

										Array.from(oldScript.attributes).forEach(attr => {
											newScript.setAttribute(attr.name, attr.value);
										});

										newScript.textContent = oldScript.textContent;
										oldScript.parentNode.replaceChild(newScript, oldScript);
									});
								}
							}
						}
						else if (event.data.type === 'setStyles') {
							const styleElement = document.getElementById('parent-app-styles');
							if (styleElement) {
								styleElement.textContent = event.data.payload;
							}
						}
					});

					// Notify parent when ready
					window.addEventListener('load', () => {
						window.parent.postMessage({
							type: 'iframeReady',
							frameId: '${id}'
						}, '*');
					});
				</script>
			</head>
			<body>
				<div id="plugin-content"></div>
			</body>
			</html>
			`;

		// Create a Blob URL from the HTML content
		const blob = new Blob([htmlContent], { type: 'text/html' });
		const blobURL = URL.createObjectURL(blob);

		// Create iframe with the Blob URL as src
		const extensionIFrame = document.createElement('iframe');
		extensionIFrame.id = id;
		extensionIFrame.style.height = '100%';
		if (enableScripts) {
			extensionIFrame.sandbox = 'allow-scripts';
		} else {
			extensionIFrame.sandbox = '';
		}
		extensionIFrame.src = blobURL;
		settingsExtensionContainer.appendChild(extensionIFrame);

		// Clean up the Blob URL when the iframe loads
		extensionIFrame.onload = () => {
			URL.revokeObjectURL(blobURL);
		};

		return extensionIFrame;
	}

	setPanelContent(pane: HTMLIFrameElement, content: string): void {
		const frameId = pane.id;

		// If the frame is ready, update it immediately
		if (this.readyFrames.has(frameId)) {
			this.applyContentUpdate(frameId, content);
		} else {
			// Otherwise queue the update for when the frame is ready
			this.pendingContentUpdates.set(frameId, content);
		}
	}

	setElementContent(pane: HTMLIFrameElement, elementId: string, content: string): void {
		const frameId = pane.id;
		const iframe = this.iframes.get(frameId);
		if (iframe?.contentWindow) {
			iframe.contentWindow.postMessage(
				{
					type: 'setElementContent',
					elementId,
					payload: content,
				},
				'*',
			);
		} else {
			useToast().showError(
				new Error(`Iframe with id "${frameId}" not found`),
				'Error loading extension',
			);
		}
	}

	appendPanelContent(pane: HTMLIFrameElement, content: string): void {
		const frameId = pane.id;
		const iframe = this.iframes.get(frameId);
		if (iframe?.contentWindow) {
			iframe.contentWindow.postMessage(
				{
					type: 'appendContent',
					payload: content,
				},
				'*',
			);
		} else {
			useToast().showError(
				new Error(`Iframe with id "${frameId}" not found`),
				'Error loading extension',
			);
		}
	}

	applyContentUpdate(frameId: string, content: string): void {
		const iframe = this.iframes.get(frameId);
		if (iframe?.contentWindow) {
			iframe.contentWindow.postMessage(
				{
					type: 'setContent',
					payload: content,
				},
				'*',
			);
		} else {
			useToast().showError(
				new Error(`Iframe with id "${frameId}" not found`),
				'Error loading extension',
			);
		}
	}

	registerIframe(extensionId: string, iframe: HTMLIFrameElement): void {
		this.iframes.set(extensionId, iframe);
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
			if (previousStyle?.parentNode) {
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
