// PROTOTYPE: curated content for the V3 group card, keyed by group NAME.
// Services map to real member node names (icon/count/open resolved from the
// actual nodes). Parameters show the node's current value (via `source`) and are
// editable as a mock (localStorage), never written back to the node.

export interface GroupServiceConfig {
	label: string;
	/** Member node names this service owns (matched against the group's nodes). */
	nodeNames: string[];
}

export type GroupParamType = 'text' | 'select' | 'longtext';

export interface GroupParamConfig {
	id: string;
	label: string;
	type: GroupParamType;
	/** Options for `select` params (mock list). */
	options?: string[];
	/** Where to read the current real value: node name + dot path into its
	 * parameters (numeric segments index arrays). Omit for composite/derived
	 * params that have no single source — those show `fallback`. */
	source?: { nodeName: string; parameterPath: string };
	/** Shown when there is no override and no resolvable `source` value. */
	fallback: string;
}

export interface GroupV3Config {
	services: GroupServiceConfig[];
	parameters: GroupParamConfig[];
}

const CLAUDE_MODELS = [
	'Claude Opus 4.6',
	'Claude Sonnet 4.6',
	'Claude Haiku 4.5',
	'GPT-4.1',
	'GPT-4o',
];

const EMBEDDING_MODELS = [
	'text-embedding-3-large',
	'text-embedding-3-small',
	'text-embedding-ada-002',
];

export const GROUP_V3_CONFIG: Record<string, GroupV3Config> = {
	'Check for new calls and download': {
		services: [
			{
				label: 'Google Drive',
				nodeNames: ['List Account Folders', 'List Call Recordings', 'Download Recording'],
			},
			{ label: 'Supabase', nodeNames: ['Create Call Record', 'Find Account', 'Create Account'] },
		],
		parameters: [
			{
				id: 'drive-folder',
				label: 'Source Drive folder',
				type: 'text',
				source: {
					nodeName: 'List Account Folders',
					parameterPath: 'filter.folderId.cachedResultName',
				},
				fallback: 'Research Recordings',
			},
			{
				id: 'supabase-tables',
				label: 'Supabase tables',
				type: 'text',
				fallback: 'project (lookup + create)',
			},
		],
	},

	'Upload video': {
		services: [
			{ label: 'Mux', nodeNames: ['Upload Video', 'Get Upload Status', 'Get Video Asset'] },
			{ label: 'Supabase', nodeNames: ['Save Playback ID'] },
		],
		parameters: [
			{
				id: 'content-type',
				label: 'Upload content type',
				type: 'text',
				source: {
					nodeName: 'Upload Video',
					parameterPath: 'headerParameters.parameters.0.value',
				},
				fallback: 'video/mp4',
			},
		],
	},

	'Transcribe and analysis': {
		services: [
			{ label: 'Deepgram', nodeNames: ['Transcribe Call'] },
			{ label: 'Anthropic', nodeNames: ['Claude Model'] },
			{
				label: 'Supabase',
				nodeNames: ['Save Transcript', 'Get Call Record', 'Get Account Context'],
			},
		],
		parameters: [
			{
				id: 'deepgram',
				label: 'Deepgram model',
				type: 'text',
				fallback: 'nova-3',
			},
			{
				id: 'llm-model',
				label: 'LLM model',
				type: 'select',
				options: CLAUDE_MODELS,
				source: { nodeName: 'Claude Model', parameterPath: 'model.cachedResultName' },
				fallback: 'Claude Opus 4.6',
			},
			{
				id: 'system-prompt',
				label: 'System prompt',
				type: 'longtext',
				source: { nodeName: 'Analyze Sales Call', parameterPath: 'options.systemMessage' },
				fallback:
					'You are a user sales analyst for n8n. Extract structured participant and account information from interview transcripts.',
			},
		],
	},

	'Store vectors': {
		services: [
			{ label: 'Supabase', nodeNames: ['Store Call Embeddings'] },
			{ label: 'OpenAI', nodeNames: ['Embed Chunks'] },
		],
		parameters: [
			{
				id: 'embedding-model',
				label: 'Embedding model',
				type: 'select',
				options: EMBEDDING_MODELS,
				source: { nodeName: 'Embed Chunks', parameterPath: 'model' },
				fallback: 'text-embedding-3-large',
			},
			{
				id: 'vector-table',
				label: 'Vector table',
				type: 'text',
				source: { nodeName: 'Store Call Embeddings', parameterPath: 'tableName.cachedResultName' },
				fallback: 'session_vectors',
			},
		],
	},

	'Save and notify': {
		services: [
			{ label: 'Supabase', nodeNames: ['Save Call Insights', 'Save Highlights'] },
			{ label: 'Slack', nodeNames: ['Notify Rep in Slack'] },
		],
		parameters: [
			{
				id: 'review-url',
				label: 'Review app URL',
				type: 'text',
				fallback: 'review.example.com',
			},
		],
	},
};
