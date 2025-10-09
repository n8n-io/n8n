/**
 * Custom stylelint formatter that outputs a summary by package
 * @type {import('stylelint').Formatter}
 */
export default function formatter(results) {
	const packageStats = new Map();
	let totalWarnings = 0;
	let totalErrors = 0;

	for (const result of results) {
		if (result.warnings.length === 0) continue;

		// Extract package name from file path
		const match = result.source.match(/packages\/([^/]+\/[^/]+)/);
		const packageName = match ? match[1] : 'unknown';

		if (!packageStats.has(packageName)) {
			packageStats.set(packageName, { warnings: 0, errors: 0 });
		}

		const stats = packageStats.get(packageName);

		for (const warning of result.warnings) {
			if (warning.severity === 'error') {
				stats.errors++;
				totalErrors++;
			} else {
				stats.warnings++;
				totalWarnings++;
			}
		}
	}

	if (packageStats.size === 0) {
		return '✓ No style issues found\n';
	}

	let output = '\n📊 Style Lint Summary:\n';
	output += '─'.repeat(50) + '\n';

	for (const [packageName, stats] of packageStats) {
		const parts = [];
		if (stats.errors > 0) parts.push(`${stats.errors} error${stats.errors > 1 ? 's' : ''}`);
		if (stats.warnings > 0) parts.push(`${stats.warnings} warning${stats.warnings > 1 ? 's' : ''}`);

		output += `  ${packageName}: ${parts.join(', ')}\n`;
	}

	output += '─'.repeat(50) + '\n';
	output += `  Total: ${totalErrors} error${totalErrors !== 1 ? 's' : ''}, ${totalWarnings} warning${totalWarnings !== 1 ? 's' : ''}\n`;
	output += '\n';

	return output;
}
