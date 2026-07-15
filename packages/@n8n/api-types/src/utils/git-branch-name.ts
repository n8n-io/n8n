/**
 * Approximates `git check-ref-format --branch`. Rejects names git would refuse
 * so branch creation/checkout fails fast with a clear message instead of deep
 * in the git layer.
 */
export function isValidGitBranchName(name: string): boolean {
	if (!name) return false;
	if (/\s/.test(name)) return false; // no whitespace
	if (name.startsWith('-') || name.startsWith('/')) return false;
	if (name.endsWith('/') || name.endsWith('.') || name.endsWith('.lock')) return false;
	if (name.includes('..') || name.includes('//') || name.includes('@{')) return false;
	// disallowed characters: ~ ^ : ? * [ \ and ASCII control chars
	// eslint-disable-next-line no-control-regex
	if (/[~^:?*[\\\x00-\x1f\x7f]/.test(name)) return false;
	return true;
}
