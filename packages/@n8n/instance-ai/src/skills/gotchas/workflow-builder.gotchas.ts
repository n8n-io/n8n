import type { SkillGotcha } from '../skill-gotchas';

/**
 * Ledger for the `## Gotchas` lines in `skills/workflow-builder/SKILL.md`.
 * Add an entry when you add a line. Record the eval cases that fail without
 * the line after an ablation run, and delete lines that no eval needs.
 */
export const WORKFLOW_BUILDER_GOTCHAS: readonly SkillGotcha[] = [
	{
		id: 'if-branches-on-builder',
		fixes: 'IF branches written after `export default` were dropped from the saved graph.',
		origin: '#32844',
		evalCases: [],
	},
	{
		id: 'filter-is-not-an-action',
		fixes: 'Builds filtered items but never performed the requested side effect.',
		origin: '#33530',
		evalCases: [],
	},
	{
		id: 'zero-based-indices',
		fixes: 'Sources wired to `.input(1)` as the first Merge input.',
		origin: 'unknown',
		evalCases: [],
	},
	{
		id: 'on-error-one-handler',
		fixes: 'Passed an array to `.onError()`, which lost the error routes.',
		origin: '#38254',
		evalCases: [],
	},
	{
		id: 'zero-items-end-branch',
		fixes: 'Added needless empty-check IF gates and `alwaysOutputData`.',
		origin: '#33530',
		evalCases: [],
	},
	{
		id: 'always-output-data-empty-json',
		fixes: 'Digests reported one row when upstream returned nothing.',
		origin: '#33530',
		evalCases: [],
	},
	{
		id: 'execute-once',
		fixes: 'Summary notifications were sent once for each item.',
		origin: '#31412',
		evalCases: [],
	},
	{
		id: 'first-is-not-per-item',
		fixes: 'Every item reused the first item value through `.first()`.',
		origin: '#31660',
		evalCases: [],
	},
	{
		id: 'insert-node-replaces-payload',
		fixes: 'An inserted create node replaced the downstream payload with API metadata.',
		origin: '#36184',
		evalCases: [],
	},
	{
		id: 'polling-dedupe',
		fixes: 'Polling triggers created duplicate records for re-polled items.',
		origin: '#37436',
		evalCases: [],
	},
	{
		id: 'digest-reads-stored-rows',
		fixes: 'Weekly summaries used only the current run, or gated on `$now.weekday`.',
		origin: '#33530',
		evalCases: [],
	},
	{
		id: 'normalize-free-text',
		fixes: 'Code-node classifiers matched one phrasing and misrouted the rest.',
		origin: 'unknown',
		evalCases: [],
	},
	{
		id: 'mock-output-raw-json',
		fixes: 'Mock output wrapped items in `{ json }`, which broke expression checks.',
		origin: 'unknown',
		evalCases: [],
	},
	{
		id: 'mock-output-all-fields',
		fixes: 'Expression-path validation failed on optional fields missing from mocks.',
		origin: '#31340',
		evalCases: [],
	},
	{
		id: 'mock-output-cardinality',
		fixes: 'Single-item mocks hid list-vs-single bugs until the first real run.',
		origin: '#32144',
		evalCases: [],
	},
	{
		id: 'webhook-envelope-shape',
		fixes: 'Invented flat webhook mocks verified green, then parsed empty on real calls.',
		origin: 'unknown',
		evalCases: [],
	},
	{
		id: 'openai-output-shape',
		fixes: 'Downstream nodes read `$json.text` from OpenAI output.',
		origin: '#32484',
		evalCases: [],
	},
	{
		id: 'anthropic-output-shape',
		fixes: 'Downstream nodes treated Anthropic `$json.content` as a string.',
		origin: '#35850',
		evalCases: [],
	},
	{
		id: 'python-native-runner',
		fixes: 'Python Code nodes used helpers or imports that the native runner rejects.',
		origin: '#37083',
		evalCases: [],
	},
	{
		id: 'placeholder-not-wrapped',
		fixes: 'Placeholders wrapped in `expr()` were not detected by setup.',
		origin: '#31412',
		evalCases: [],
	},
	{
		id: 'resource-locator-shape',
		fixes: 'Resource locators were left empty or held names in `list` mode.',
		origin: '#32940',
		evalCases: [],
	},
	{
		id: 'keep-user-values',
		fixes: 'Concrete user-provided values were replaced with placeholders.',
		origin: '#32969',
		evalCases: [],
	},
	{
		id: 'keep-node-ids-and-layout',
		fixes: 'Edits changed node ids or positions, which reset state and layout.',
		origin: '#36236',
		evalCases: [],
	},
	{
		id: 'unique-webhook-path',
		fixes: 'Generic webhook paths collided with other workflows on publish.',
		origin: '#42005',
		evalCases: [],
	},
	{
		id: 'inbound-auth-none',
		fixes: 'The builder added authentication to inbound triggers by default.',
		origin: '#29648',
		evalCases: [],
	},
	{
		id: 'tool-names',
		fixes: 'AI tool nodes had default or service-prefixed names.',
		origin: '#33604',
		evalCases: [],
	},
	{
		id: 'data-table-snake-case',
		fixes: 'Workflow code used camelCase Data Table columns that do not exist.',
		origin: '#31412',
		evalCases: [],
	},
	{
		id: 'data-table-no-unfiltered',
		fixes: 'Unfiltered table queries pulled large rows into the context.',
		origin: '#37489',
		evalCases: [],
	},
	{
		id: 'resolved-credentials-are-connected',
		fixes: 'Auto-attached credentials were sent to setup again.',
		origin: '#33802',
		evalCases: [],
	},
	{
		id: 'no-raw-credential-objects',
		fixes: 'Round-tripped code kept raw credential objects.',
		origin: 'unknown',
		evalCases: [],
	},
	{
		id: 'gateway-covered-before-asking',
		fixes: 'The builder asked which search or scraping service to use.',
		origin: '#35019',
		evalCases: [],
	},
	{
		id: 'no-re-ask',
		fixes: 'The builder re-asked answered or skipped questions.',
		origin: '#32755',
		evalCases: [],
	},
	{
		id: 'debug-before-repair',
		fixes: 'Repairs changed nodes on a guess without reading the real error.',
		origin: 'unknown',
		evalCases: [],
	},
	{
		id: 'no-dismissing-live-errors',
		fixes: 'Live execution errors were dismissed as harness artifacts.',
		origin: '#32835',
		evalCases: [],
	},
	{
		id: 'capability-honesty',
		fixes: 'Infeasible capabilities were silently replaced with stand-ins.',
		origin: '#33063',
		evalCases: [],
	},
	{
		id: 'missing-resource',
		fixes: 'Builds stalled or invented ids when a required resource did not exist.',
		origin: 'unknown',
		evalCases: [],
	},
	{
		id: 'folder-placement',
		fixes: 'New workflows landed at the project root when their folder was clear.',
		origin: '#37865',
		evalCases: [],
	},
	{
		id: 'early-setup-not-visible',
		fixes: 'The visible-output rule stopped early credential setup calls.',
		origin: 'f3f50622cd1',
		evalCases: [],
	},
	{
		id: 'no-auto-publish',
		fixes: 'The builder published workflows before the user tested them.',
		origin: 'unknown',
		evalCases: [],
	},
];
