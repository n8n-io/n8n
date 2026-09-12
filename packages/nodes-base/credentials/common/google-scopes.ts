const SCOPE_SEPARATOR = /[,\s\n]+/;

export function parseGoogleScopes(rawScopes: string): string[] {
	return rawScopes.replace(/\\n/g, '\n').trim().split(SCOPE_SEPARATOR).filter(Boolean);
}

export function formatGoogleScopesForJwt(scopes: string[]): string {
	return scopes.join(' ');
}
