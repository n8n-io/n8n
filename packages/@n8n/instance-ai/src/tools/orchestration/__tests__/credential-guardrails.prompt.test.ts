import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PLANNER_AGENT_PROMPT } from '../plan-agent-prompt';

const WORKFLOW_BUILDER_SKILL = readFileSync(
	join(__dirname, '..', '..', '..', '..', 'skills', 'workflow-builder', 'SKILL.md'),
	'utf8',
);
const WORKFLOW_BUILDER_SDK_RULES = readFileSync(
	join(
		__dirname,
		'..',
		'..',
		'..',
		'..',
		'skills',
		'workflow-builder',
		'references',
		'sdk-rules.md',
	),
	'utf8',
);
const WORKFLOW_BUILDER_LIFECYCLE = readFileSync(
	join(
		__dirname,
		'..',
		'..',
		'..',
		'..',
		'skills',
		'workflow-builder',
		'references',
		'build-lifecycle.md',
	),
	'utf8',
);

describe('credential guardrail prompts', () => {
	it('does not frame API keys as acceptable ask-user inputs in the workflow-builder skill', () => {
		expect(WORKFLOW_BUILDER_SKILL).not.toContain('a chat ID, API key, external resource name');
		expect(WORKFLOW_BUILDER_SKILL).toContain('Never invent credential IDs, API tokens');
	});

	it('keeps inbound trigger authentication disabled unless explicitly requested', () => {
		expect(WORKFLOW_BUILDER_SDK_RULES).toContain(
			'The credential-selection guidance above applies to outbound service calls.',
		);
		expect(WORKFLOW_BUILDER_SDK_RULES).toContain('keep authentication at its');
		expect(WORKFLOW_BUILDER_SDK_RULES).toContain(
			'default `none` unless the user explicitly asks to authenticate inbound traffic',
		);
	});

	it('tells the planner not to block planning on credential selection', () => {
		expect(PLANNER_AGENT_PROMPT).toContain('Handle credentials without blocking planning');
		expect(PLANNER_AGENT_PROMPT).toContain('Treat `ask-user` as a last resort');
		expect(PLANNER_AGENT_PROMPT).toContain('do not ask a bundle of setup/default questions');
		expect(PLANNER_AGENT_PROMPT).toContain('If the user already named a credential');
		expect(PLANNER_AGENT_PROMPT).toContain('If there is exactly one matching credential');
		expect(PLANNER_AGENT_PROMPT).toContain('auto-select it, do not ask');
		expect(PLANNER_AGENT_PROMPT).toContain('If there are no matching credentials, do not ask');
		expect(PLANNER_AGENT_PROMPT).toContain(
			'Do not offer a choice like "build now and set up credentials later"',
		);
		expect(PLANNER_AGENT_PROMPT).toContain('builder will use a mocked or unresolved credential');
		expect(PLANNER_AGENT_PROMPT).toContain(
			'If there is more than one credential of the same required type',
		);
		expect(PLANNER_AGENT_PROMPT).toContain('ask once with a single-select');
		expect(PLANNER_AGENT_PROMPT).toContain('cannot be discovered, only chosen');
		expect(PLANNER_AGENT_PROMPT).toContain('credential-backed resource investigation');
		expect(PLANNER_AGENT_PROMPT).toContain('Do not turn that into a credential-choice question');
		expect(PLANNER_AGENT_PROMPT).toContain('Never ask for account identifiers');
		expect(PLANNER_AGENT_PROMPT).toContain('Google account email');
		expect(PLANNER_AGENT_PROMPT).toContain('Google Calendar ID/email');
		expect(PLANNER_AGENT_PROMPT).toContain('workflows(action="setup")');
		expect(PLANNER_AGENT_PROMPT).toContain('Record the chosen credential name in `assumptions`');
	});

	it('tells the planner to use the contextual timezone before asking', () => {
		expect(PLANNER_AGENT_PROMPT).toContain(
			"Never ask for the user's timezone when `<user-timezone>` is present",
		);
		expect(PLANNER_AGENT_PROMPT).toContain('use `<current-datetime>` / `<user-timezone>`');
		expect(PLANNER_AGENT_PROMPT).toContain(
			'Only ask if timezone is missing and a date or schedule cannot be interpreted safely',
		);
	});

	it('tells the builder to wrap ambiguous resource matches with placeholder()', () => {
		expect(WORKFLOW_BUILDER_SDK_RULES).toContain('Resource IDs with more than one candidate');
		expect(WORKFLOW_BUILDER_SDK_RULES).toContain('If `explore-resources` returns more');
		expect(WORKFLOW_BUILDER_SDK_RULES).toContain("`placeholder('Select <resource>')`");
	});

	it('keeps builder guidance grounded in the inline setup card', () => {
		expect(WORKFLOW_BUILDER_LIFECYCLE).toContain('inline setup card');
		expect(WORKFLOW_BUILDER_LIFECYCLE).toContain('the AI Assistant panel');
		expect(WORKFLOW_BUILDER_LIFECYCLE).not.toMatch(/setup wizard/i);
	});

	it('does not inline bulky static node guides in the workflow-builder skill', () => {
		expect(WORKFLOW_BUILDER_SDK_RULES).toContain('Node Configuration Safety Rules');
		expect(WORKFLOW_BUILDER_SKILL).not.toContain('nodes(action="guide")');
		expect(WORKFLOW_BUILDER_SKILL).not.toContain(
			'### Set Node Updates - Comprehensive Type Handling Guide',
		);
		expect(WORKFLOW_BUILDER_SKILL).not.toContain('#### Complete Operator Reference');
		expect(WORKFLOW_BUILDER_SKILL).not.toContain(
			'## IMPORTANT: ResourceLocator Parameter Handling',
		);
	});
});
