import { GROUP_DESCRIPTION_MAX_LENGTH, NODE_GROUPING_RULES } from 'n8n-workflow';

import {
	GROUPING_GUIDANCE,
	NODE_GROUPS_REFERENCE,
	SDK_LANGUAGE_REFERENCE,
	buildSdkLanguageReference,
} from './sdk-language';
import {
	SDK_METHODS,
	FORBIDDEN_NODE_TYPES,
	SAFE_JSON_METHOD_NAMES,
	SAFE_STRING_METHOD_NAMES,
	BUILDER_BLOCKED_GLOBALS,
	SDK_INLINE_CONSTRAINTS,
	DANGEROUS_GLOBALS,
	ALLOWED_METHODS,
} from '../../ast-interpreter';

const publicMethods = SDK_METHODS.filter((m) => m.public);
const internalMethods = SDK_METHODS.filter((m) => !m.public);

describe('SDK language source-of-truth alignment', () => {
	it('derives ALLOWED_METHODS from the SDK_METHODS table', () => {
		expect([...ALLOWED_METHODS].sort()).toEqual(SDK_METHODS.map((m) => m.name).sort());
	});

	it('derives the blocked globals reference from the enforced globals', () => {
		const renderedNames = BUILDER_BLOCKED_GLOBALS.map((g) => g.name).sort();
		expect(renderedNames).toEqual([...DANGEROUS_GLOBALS].sort());
	});
});

describe('SDK_LANGUAGE_REFERENCE rendering', () => {
	it('lists every public builder method', () => {
		for (const m of publicMethods) {
			expect(SDK_LANGUAGE_REFERENCE).toContain(`.${m.name}()`);
		}
	});

	it('does not present internal methods as builder methods', () => {
		const methodsSection = SDK_LANGUAGE_REFERENCE.split('## Forbidden constructs')[0];
		for (const m of internalMethods) {
			expect(methodsSection).not.toContain(`.${m.name}()`);
		}
	});

	it('includes every forbidden-construct remediation string', () => {
		for (const message of Object.values(FORBIDDEN_NODE_TYPES)) {
			expect(SDK_LANGUAGE_REFERENCE).toContain(message);
		}
	});

	it('names the safe non-builder methods', () => {
		for (const name of SAFE_JSON_METHOD_NAMES) {
			expect(SDK_LANGUAGE_REFERENCE).toContain(`JSON.${name}`);
		}
		for (const name of SAFE_STRING_METHOD_NAMES) {
			expect(SDK_LANGUAGE_REFERENCE).toContain(`.${name}()`);
		}
	});

	it('includes every blocked global and inline constraint', () => {
		for (const g of BUILDER_BLOCKED_GLOBALS) {
			expect(SDK_LANGUAGE_REFERENCE).toContain(g.name);
			if (g.alternative) {
				expect(SDK_LANGUAGE_REFERENCE).toContain(g.alternative);
			}
		}
		for (const c of SDK_INLINE_CONSTRAINTS) {
			expect(SDK_LANGUAGE_REFERENCE).toContain(c);
		}
	});

	it('steers runtime logic to a Code node or expression', () => {
		expect(SDK_LANGUAGE_REFERENCE).toContain('Code node');
		expect(SDK_LANGUAGE_REFERENCE).toContain("expr('{{ ... }}')");
	});
});

describe('buildSdkLanguageReference', () => {
	it('includes the groups docs by default', () => {
		expect(buildSdkLanguageReference()).toBe(buildSdkLanguageReference({ includeGroups: true }));
		expect(buildSdkLanguageReference()).toContain(NODE_GROUPS_REFERENCE);
	});

	it('omits only the groups docs when includeGroups is false', () => {
		const withoutGroups = buildSdkLanguageReference({ includeGroups: false });

		expect(withoutGroups).not.toContain('## Node groups');
		// The rest of the reference is intact.
		expect(withoutGroups).toContain('restricted subset of TypeScript');
		expect(withoutGroups).toContain('## Forbidden constructs');
		expect(withoutGroups).toContain('## Where to put runtime logic');
	});
});

describe('NODE_GROUPS_REFERENCE', () => {
	it('explains what a group is (visual-only) and how to declare one', () => {
		expect(NODE_GROUPS_REFERENCE).toContain('## Node groups');
		expect(NODE_GROUPS_REFERENCE).toMatch(/visual/i);
	});

	it('explains how to declare a group', () => {
		// The worked example: .group(name, [members], options?) declared on the workflow.
		expect(NODE_GROUPS_REFERENCE).toMatch(/\.group\('[^']+', \[/);
	});

	it('documents the description and its length limit without calling it optional', () => {
		expect(NODE_GROUPS_REFERENCE).toContain('description:');
		expect(NODE_GROUPS_REFERENCE).toContain(`${GROUP_DESCRIPTION_MAX_LENGTH} characters`);
		expect(NODE_GROUPS_REFERENCE).not.toMatch(/`description` is optional/i);
	});

	it('tells an editing agent to keep existing descriptions', () => {
		expect(NODE_GROUPS_REFERENCE).toMatch(/keep the .+ and their descriptions\s+intact/is);
	});

	it('tells agents to fix what a dropped-group warning reports, not the boundary', () => {
		// A build took two dropped-group warnings as licence to publish the stage
		// ungrouped instead of fixing the group.
		expect(NODE_GROUPS_REFERENCE).toMatch(/drop an invalid group.+report a warning/is);
		expect(NODE_GROUPS_REFERENCE).toMatch(/never means the stage should\s+stay ungrouped/is);
		// The warning also fires for a duplicate name or a missing member, so telling the
		// agent to redraw the boundary would misdirect it.
		expect(NODE_GROUPS_REFERENCE).toMatch(/fix what it reports/i);
		expect(NODE_GROUPS_REFERENCE).not.toMatch(/the boundary was wrong/i);
		expect(NODE_GROUPS_REFERENCE).toMatch(/never re-emit the\s+same invalid group/is);
		expect(NODE_GROUPS_REFERENCE).not.toContain('rejected on save');
	});

	it('states the single entry/exit boundary rule that grouping enforces', () => {
		// reason: 'invalid-subgraph' — grouping rejects a group with more than one
		// incoming or outgoing main connection (single entry/exit *boundary*).
		expect(NODE_GROUPS_REFERENCE).toMatch(/single entry and exit/i);
		expect(NODE_GROUPS_REFERENCE).toMatch(/incoming and one outgoing main connection/i);
	});

	it('does not claim the extraction-only per-node single-main-port rule', () => {
		// `multiple-input/-output-branches` is extraction-only, never fired by grouping.
		expect(NODE_GROUPS_REFERENCE).not.toMatch(/input branch|output branch/i);
	});

	it('is embedded verbatim in the IAI-facing full reference', () => {
		// Guarantees Instance AI ships exactly the shared constant, no drift.
		expect(SDK_LANGUAGE_REFERENCE).toContain(NODE_GROUPS_REFERENCE);
	});

	describe('rules for valid groups', () => {
		it('states the no-trigger rule', () => {
			// reason: 'trigger-selected'
			expect(NODE_GROUPS_REFERENCE).toMatch(/trigger nodes? (cannot|can't|may not|must not)/i);
		});

		it('states the single-connected-subgraph rule', () => {
			// reason: 'invalid-subgraph' — one connected chunk, not two islands.
			expect(NODE_GROUPS_REFERENCE).toMatch(/single connected|one connected/i);
		});

		it('states the AI-Agent-and-sub-nodes-together rule in plain terms', () => {
			// reason: 'non-main-boundary' — an ai_languageModel/ai_tool/ai_memory wire
			// must not cross the group boundary, so an Agent and its sub-nodes are
			// either all in or all out.
			expect(NODE_GROUPS_REFERENCE).toMatch(/agent/i);
			expect(NODE_GROUPS_REFERENCE).toMatch(/all (inside|in).*all (outside|out)/is);
		});

		it('states the one-group-per-node rule', () => {
			// A node belongs to at most one group.
			expect(NODE_GROUPS_REFERENCE).toMatch(
				/only one group|at most one group|one group at a time/i,
			);
		});

		it('states the unique-name-and-id rule', () => {
			expect(NODE_GROUPS_REFERENCE).toMatch(
				/names? and ids?[^.]*unique|unique[^.]*names? and ids?/i,
			);
		});

		it('states the at-least-one-member rule', () => {
			expect(NODE_GROUPS_REFERENCE).toMatch(/at least one (node|member)/i);
		});
	});
});

describe('GROUPING_GUIDANCE', () => {
	it('is served under the heading both consumers key on', () => {
		// MCP (best-practices tool) and Instance AI (node-groups KB entry) both assert
		// on this heading to detect that grouping guidance shipped.
		expect(GROUPING_GUIDANCE).toContain('## Grouping');
	});

	describe('when and how much to group', () => {
		it('makes the grouping decision mandatory while leaving "no groups" a valid answer', () => {
			// The observed failure was omission, not misjudgement: the agent knew the
			// criteria and never reached the step.
			expect(GROUPING_GUIDANCE).toMatch(/explicit grouping decision/i);
			expect(GROUPING_GUIDANCE).toMatch(/skipping the decision is not/i);
			expect(GROUPING_GUIDANCE).toMatch(/deciding against groups/i);
		});

		it('decides whether to group by counting, not by shape', () => {
			// An agent read "purely linear" as a standalone exemption and skipped the
			// count: 9 top-level items, no groups.
			expect(GROUPING_GUIDANCE).toMatch(/count top-level items/i);
			expect(GROUPING_GUIDANCE).toMatch(/more than 7 → you must group/i);
			expect(GROUPING_GUIDANCE).toMatch(
				/linear pipeline is the normal case for grouping, not an exemption/i,
			);
		});

		it('leaves a workflow under the ceiling ungrouped', () => {
			expect(GROUPING_GUIDANCE).toMatch(/7 or fewer.+leave it ungrouped/is);
		});

		it('tells agents to widen boundaries instead of emitting one-node groups', () => {
			expect(GROUPING_GUIDANCE).toMatch(/one or two nodes mean the boundaries are too fine/i);
		});

		it('says where to cut when an objective ends in a branch', () => {
			// A build grouped an IF with its stop branch and lost both groups to
			// `Output Edge From Non-Leaf Node`: the IF continued inside and exited too.
			expect(GROUPING_GUIDANCE).toMatch(/both continues inside it and exits it/i);
			// A branch node whose paths both leave is a leaf with one exit, so keeping it
			// inside is valid and costs the fewest top-level items.
			expect(GROUPING_GUIDANCE).toMatch(
				/keep the branch node inside and leave both its paths outside/i,
			);
			expect(GROUPING_GUIDANCE).toMatch(/end the group before the branch node/i);
			expect(GROUPING_GUIDANCE).toMatch(/leave the branch node and its stop path outside/i);
		});

		it('breaks ties toward fewer, larger groups', () => {
			expect(GROUPING_GUIDANCE).toMatch(/in doubt, fewer and larger/i);
		});

		it('does not let the ceiling justify an invalid or absurd split', () => {
			// A branchy graph cannot always reach 7, and chasing the number produces
			// groups the save path drops.
			expect(GROUPING_GUIDANCE).toMatch(/never break a validity rule/i);
			expect(GROUPING_GUIDANCE).toMatch(/split one objective to hit the number/i);
		});

		it('allows exceeding the ceiling only for items that cannot be grouped', () => {
			// A build left five groupable nodes at the top level and settled at 8.
			expect(GROUPING_GUIDANCE).toMatch(/staying above 7 is only acceptable/i);
			expect(GROUPING_GUIDANCE).toMatch(/cannot join one without breaking a validity rule/i);
			expect(GROUPING_GUIDANCE).toMatch(/check each one before you settle/i);
		});

		it('gives a group count for a medium workflow', () => {
			// Without a number, "larger workflows" is unfalsifiable and the model
			// over-groups — this range is the main fix.
			expect(GROUPING_GUIDANCE).toMatch(/3 to 5|3-5/);
		});

		it('caps what is visible at the canvas top level', () => {
			expect(GROUPING_GUIDANCE).toMatch(/at most 7 top-level items/i);
			expect(GROUPING_GUIDANCE).toMatch(/trigger \+ groups \+ nodes left outside/i);
		});

		it('makes a group a business outcome rather than a technical category', () => {
			expect(GROUPING_GUIDANCE).toMatch(/business outcome/i);
			expect(GROUPING_GUIDANCE).toMatch(/never a technical category/i);
			expect(GROUPING_GUIDANCE).toMatch(/merge groups serving the same outcome/i);
		});

		it('keeps the groups-vs-sub-workflows distinction', () => {
			expect(GROUPING_GUIDANCE).toMatch(/sub-workflow/i);
		});
	});

	describe('naming', () => {
		it('caps titles at 2-4 words and demands outcome-first phrasing', () => {
			expect(GROUPING_GUIDANCE).toMatch(/outcome-first/i);
			expect(GROUPING_GUIDANCE).toMatch(/2-4 words/);
		});

		it('prefers one outcome over two verbs, without licensing a split', () => {
			// Builds produced "Charge & ship" and "Store & alert": the steps, not the
			// outcome. Coverage still wins — a two-verb title beats fewer groups.
			expect(GROUPING_GUIDANCE).toMatch(/naming one outcome/i);
			expect(GROUPING_GUIDANCE).toMatch(/find the outcome they add up to/i);
			expect(GROUPING_GUIDANCE).toMatch(
				/two-verb title beats splitting a coherent stage or leaving it ungrouped/i,
			);
		});

		it('bans implementation jargon in titles', () => {
			expect(GROUPING_GUIDANCE).toMatch(/no node, credential, or API names/i);
		});

		it('gives the self-explanatory test for a title', () => {
			expect(GROUPING_GUIDANCE).toMatch(/from the title alone/i);
		});

		it('tells agents to split a group whose purpose will not fit the title', () => {
			expect(GROUPING_GUIDANCE).toMatch(/doing too much — split it/i);
		});
	});

	describe('descriptions', () => {
		it('requires one on every group', () => {
			expect(GROUPING_GUIDANCE).toMatch(/one per group/i);
		});

		it('forbids restating the title, including as an opening clause', () => {
			// An agent restated the title and appended a detail, and the collapsed group
			// clipped the description before the detail was visible.
			expect(GROUPING_GUIDANCE).toMatch(/add to the title — never restate it/i);
			expect(GROUPING_GUIDANCE).toMatch(/open by repeating it/i);
		});

		it('tells agents to lead with the detail because collapsed text is clipped', () => {
			expect(GROUPING_GUIDANCE).toMatch(/collapsed groups clip the text/i);
		});

		it('forbids opening on the nodes the group is built from', () => {
			// A build spent the visible half of a description on "AI agent with Postgres
			// chat memory", which the reader can already see on the canvas.
			expect(GROUPING_GUIDANCE).toMatch(/never open on the parts list/i);
			expect(GROUPING_GUIDANCE).toMatch(/says only what the reader can already see/i);
		});

		it('interpolates the length cap instead of hardcoding it', () => {
			// A hardcoded number silently starts lying the day the constant moves.
			expect(GROUPING_GUIDANCE).toContain(`${GROUP_DESCRIPTION_MAX_LENGTH} characters`);
		});

		it('shows worked title-to-description pairs', () => {
			expect(GROUPING_GUIDANCE).toMatch(/^- "[^"]+" → "[^"]+"$/m);
		});
	});

	describe('boundary with NODE_GROUPS_REFERENCE', () => {
		it.each(Object.values(NODE_GROUPING_RULES))(
			'does not restate the structural validity rules',
			(rule) => {
				// Duplicating a rule lets the two copies contradict each other
				// and MCP can serve one without the other.
				expect(GROUPING_GUIDANCE).not.toContain(rule.sdkReference);
			},
		);

		it('does not claim invalid groups are rejected on save', () => {
			// Agent save tools prune the invalid group and warn, so an agent never hits the
			// server-side rejection — promising one would misdescribe what it will see.
			expect(GROUPING_GUIDANCE).not.toContain('rejected on save');
		});

		it('points agents at the reference for the exact rules', () => {
			expect(GROUPING_GUIDANCE).toMatch(/node groups reference/i);
		});
	});
});
