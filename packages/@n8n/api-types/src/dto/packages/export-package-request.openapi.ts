import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

// Field wording is copied from the legacy `exportPackageRequest.yml`, so the generated spec matches it.
export const exportPackageRequestFieldDocs = {
	agentIds: {
		description: 'IDs of the agents to include. Requires the agents module.',
		example: ['uT9LdQx7rK2MvB4f'],
	},
	workflowIds: {
		description: 'IDs of the workflows to include in the exported package.',
		example: ['2tUt1wbLX592XDdX'],
	},
	folderIds: {
		description:
			'IDs of the folders to include in the exported package. Each folder is exported with its nested folders.',
		example: ['9xKp2mNqRzAbCdEf'],
	},
	projectIds: {
		description:
			'IDs of the projects to include in the exported package. Includes their agents when the agents module is enabled.',
		example: ['Ox8O54VQrmBrb4qL'],
	},
	includeVariableValues: {
		description:
			'Whether values of variables referenced by the exported entities are bundled into the package. When `false`, variables still travel as name/type files and are listed in the package requirements, but no values travel with the package.',
	},
	includeTags: {
		description:
			'Whether tags assigned to the exported workflows are bundled into the package. When `false`, no tag files, tag references, or tag requirements travel with the package.',
	},
	dependencyPolicy: {
		description:
			'Policy for workflow and agent dependencies outside the selected package contents. Includes static workflow references and disabled agent references. `fail` aborts when a required workflow or agent is absent from the package. `include-in-package` adds accessible dependencies recursively. `reference-only` records external requirements without including those definitions. The same policy applies to workflows and agents.',
		example: 'fail' as const,
	},
	versionPolicy: {
		description:
			'Which version of each workflow and agent travels in the package. `latest` exports the current draft. `published-strict` requires a published version. `prefer-published` uses the published version when available and the draft otherwise. `ignore-unpublished` skips unpublished selections. Dependencies that cannot be included cause the export to fail only when `dependencyPolicy` is `fail` or `include-in-package`. With `reference-only`, the export records them as external requirements. The selected version supplies the definition and its references. Workflow names, settings, and tags always use their current values. Agent IDs, names, and MCP availability always use their current values.',
		example: 'latest' as const,
	},
	credentialExportPolicy: {
		description:
			'Whether expression values from credential data are bundled into the package. `expression-values-only` includes credential fields whose value is an n8n expression (for example `={{ $secrets.apiKey }}`); literal values never travel either way. `no-values` keeps credential data out of the package entirely, so each credential file carries only its id, name and type.',
		example: 'expression-values-only' as const,
	},
	includeArchivedWorkflows: {
		description:
			'Whether folder and project exports include their archived workflows. When `false` (default) they are left out. When `true` they travel with `isArchived: true` and are archived on import. Workflows listed in `workflowIds` always export, also when archived.',
		example: false,
	},
} satisfies Record<string, ZodOpenAPIMetadata>;
