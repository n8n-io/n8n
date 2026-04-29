/**
 * Pick the builder tool-name list. The agent gets a narrow subset of
 * `createAllTools()` — the production sub-agent rules — and we additionally
 * gate `templates` on the eval-only `includeTemplates` flag for the
 * with/without-templates A/B comparison.
 *
 * Lives in its own module so unit tests can import it without pulling in the
 * full Mastra/agent dependency chain.
 */
export function selectBuilderToolNames(opts: {
	mode: 'sandbox' | 'inline';
	includeTemplates: boolean;
}): string[] {
	const base =
		opts.mode === 'sandbox'
			? ['nodes', 'workflows', 'credentials', 'data-tables']
			: ['build-workflow', 'nodes', 'workflows', 'data-tables'];
	return opts.includeTemplates ? [...base, 'templates'] : base;
}
