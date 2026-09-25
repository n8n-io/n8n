export interface ConsentUiHints {
	/** design-system icon name (updatedIconSet) for the consent logo tile; omit to keep the client-brand / mcp fallback */
	icon?: string;
	/** noun key inserted into first-party consent copy, e.g. 'form' (later 'webhook'); resolved to a localized word on the frontend */
	consentType?: string;
}
