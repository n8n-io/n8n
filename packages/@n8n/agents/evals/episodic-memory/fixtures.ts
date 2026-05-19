import type { EpisodicMemoryScenario } from './types';

const REVIEW_TURN_TEMPLATES = [
	(topic: string) =>
		`Before we move on with ${topic}, give me the current working summary in two concise bullets.`,
	(topic: string) =>
		`For ${topic}, separate what is decided from what is still just background context.`,
	(topic: string) =>
		`Quick checkpoint on ${topic}: tell me what would be risky to assume too broadly.`,
	(topic: string) =>
		`Let's keep ${topic} tidy; restate only durable facts and avoid inventing new details.`,
	(topic: string) =>
		`For ${topic}, call out any exact names or identifiers that should be preserved verbatim.`,
	(topic: string) =>
		`I'm going to continue this thread on ${topic}; keep the answer short and focused.`,
	(topic: string) => `For ${topic}, what is the most likely thing we will need to remember later?`,
	(topic: string) => `Let's sanity-check ${topic}: what is current state versus historical setup?`,
	(topic: string) => `For ${topic}, give me a compact handoff note without adding new commitments.`,
	(topic: string) => `Before the next detail on ${topic}, list any open questions in one sentence.`,
	(topic: string) =>
		`For ${topic}, keep exact artifacts separate from general package or workflow names.`,
	(topic: string) => `Can you restate ${topic} as if another teammate will read this later?`,
	(topic: string) =>
		`For ${topic}, identify which facts are customer-specific and which are reusable.`,
	(topic: string) => `Let's pause on ${topic}; what should not be treated as a universal rule?`,
	(topic: string) =>
		`For ${topic}, summarize the latest state without losing the earlier correction history.`,
	(topic: string) =>
		`Give me a one-paragraph status note for ${topic}, but keep uncertainty explicit.`,
	(topic: string) => `For ${topic}, what would you verify before acting on this later?`,
	(topic: string) =>
		`Let's make the ${topic} notes easier to audit; mention source-like evidence when possible.`,
	(topic: string) => `For ${topic}, compress the discussion so far into durable memory candidates.`,
	(topic: string) =>
		`Before wrapping this part of ${topic}, state the current conclusion and any discarded alternative.`,
];

function buildPrompts(topic: string, anchors: string[], targetCount: number): string[] {
	const anchorSlots = new Map<number, string>();
	for (let index = 0; index < anchors.length; index++) {
		const slot = Math.floor(((index + 1) * targetCount) / (anchors.length + 1));
		anchorSlots.set(slot, anchors[index]);
	}

	const prompts: string[] = [];
	let fillerIndex = 0;
	for (let index = 0; index < targetCount; index++) {
		const anchor = anchorSlots.get(index);
		if (anchor) {
			prompts.push(anchor);
			continue;
		}
		const template = REVIEW_TURN_TEMPLATES[fillerIndex % REVIEW_TURN_TEMPLATES.length];
		prompts.push(template(topic));
		fillerIndex++;
	}
	return prompts;
}

export const episodicMemoryScenarios = [
	{
		id: 'exact-artifact-inventory',
		name: 'Exact artifact inventory across threads',
		threads: [
			{
				id: 'north-pier-planning',
				prompts: buildPrompts(
					'North Pier Coffee vendor onboarding',
					[
						'For the North Pier Coffee vendor onboarding trial, remember that the customer tracker is exactly `North Pier Vendor Queue - Trial`.',
						'Small correction: the Slack channel is exactly `#vendor-trial-northpier`, not `#northpier-vendors`.',
						'The reusable package name is `Vendor Intake Concierge`; keep that separate from North Pier-specific artifacts.',
						'Final North Pier handoff: tracker `North Pier Vendor Queue - Trial`, Slack `#vendor-trial-northpier`, reusable package `Vendor Intake Concierge`.',
					],
					28,
				),
			},
			{
				id: 'harborlight-planning',
				prompts: buildPrompts(
					'Harborlight Foods vendor onboarding',
					[
						'For Harborlight Foods, the Google Sheet is exactly `Harborlight Vendor Intake - Pilot`.',
						'Their Slack channel is exactly `#vendor-pilot-harborlight`, and the package is still `Vendor Intake Concierge`.',
						'Harborlight should keep its tracker and Slack names customer-specific, even though the package name stays reusable.',
					],
					22,
				),
			},
		],
		expectedActiveEpisodes: [
			{
				id: 'north-pier-artifacts',
				description: 'North Pier exact tracker and Slack artifacts',
				match: { all: ['North Pier Vendor Queue - Trial', '#vendor-trial-northpier'] },
			},
			{
				id: 'harborlight-artifacts',
				description: 'Harborlight exact tracker and Slack artifacts',
				match: { all: ['Harborlight Vendor Intake - Pilot', '#vendor-pilot-harborlight'] },
			},
			{
				id: 'package-name',
				description: 'Reusable package name remains separate',
				match: { all: ['Vendor Intake Concierge'] },
			},
		],
		staleFacts: [],
		forbiddenFacts: [],
		exactIdentifiers: [
			'North Pier Vendor Queue - Trial',
			'#vendor-trial-northpier',
			'Harborlight Vendor Intake - Pilot',
			'#vendor-pilot-harborlight',
			'Vendor Intake Concierge',
		],
		recallQueries: [
			{
				id: 'artifact-inventory',
				prompt:
					'Without me restating prior context, what exact tracker names and Slack channels did we already decide for the vendor pilots?',
				shouldCallRecallMemory: true,
				expectedFacts: ['north-pier-artifacts', 'harborlight-artifacts'],
				forbiddenFacts: [],
			},
		],
		finalQuestions: [
			{
				id: 'package-separation',
				prompt:
					'Remind me what package name we decided before, and how it relates to the customer-specific tracker names.',
				expectedFacts: ['package-name'],
				forbiddenFacts: [],
			},
		],
	},
	{
		id: 'correction-supersession',
		name: 'Same-case correction and supersession',
		threads: [
			{
				id: 'access-runbook',
				prompts: buildPrompts(
					'Meridian access runbook',
					[
						'For the Meridian access runbook, initially note that approvals are owned by Paula in Security.',
						'Correction for Meridian: approvals are owned by Devon in IT Ops, not Paula in Security.',
						'Carry forward the corrected owner Devon, and treat the Paula owner note as stale.',
						'Final Meridian handoff: approval ownership is Devon in IT Ops; Paula in Security was the discarded initial note.',
					],
					45,
				),
			},
		],
		expectedActiveEpisodes: [
			{
				id: 'correct-owner',
				description: 'Meridian approvals use the corrected owner',
				match: { all: ['Meridian', 'Devon', 'IT Ops'] },
			},
		],
		staleFacts: [
			{
				id: 'stale-owner',
				description: 'The old owner must not remain current',
				match: { regex: ['Meridian[\\s\\S]{0,120}approvals are owned by Paula in Security'] },
			},
		],
		forbiddenFacts: [],
		exactIdentifiers: ['Meridian', 'Devon', 'IT Ops'],
		recallQueries: [
			{
				id: 'corrected-owner',
				prompt:
					'What did we previously decide about the Meridian approval owner after the correction?',
				shouldCallRecallMemory: true,
				expectedFacts: ['correct-owner'],
				forbiddenFacts: ['stale-owner'],
			},
		],
		finalQuestions: [],
	},
	{
		id: 'similar-distinct-cases',
		name: 'Similar but distinct cases stay separate',
		threads: [
			{
				id: 'atlas-routing',
				prompts: buildPrompts(
					'Atlas Supply routing investigation',
					[
						'Atlas Supply routing failed because manager emails were stale in the branch mapping file.',
						'The Atlas fix was to ask Finance Ops to refresh `branch_manager_map.csv` before rerunning routing.',
						'Atlas should be remembered as a stale manager-email mapping issue, not as a missing-region-code issue.',
					],
					24,
				),
			},
			{
				id: 'cobalt-routing',
				prompts: buildPrompts(
					'Cobalt Retail routing investigation',
					[
						'Cobalt Retail routing is similar but distinct: their delay is from missing region codes, not stale manager emails.',
						'Cobalt needs `region_code` added before routing can proceed.',
						'Final Cobalt note: missing region codes caused the delay, while stale manager emails were explicitly ruled out.',
					],
					24,
				),
			},
		],
		expectedActiveEpisodes: [
			{
				id: 'atlas-cause',
				description: 'Atlas stale manager email cause',
				match: { all: ['Atlas Supply', 'stale', 'manager emails'] },
			},
			{
				id: 'cobalt-cause',
				description: 'Cobalt missing region code cause',
				match: {
					all: ['Cobalt Retail'],
					oneOf: ['missing region codes', 'region_code is missing', '`region_code` is missing'],
				},
			},
		],
		staleFacts: [],
		forbiddenFacts: [
			{
				id: 'collapsed-cause',
				description: 'Cobalt must not be collapsed into Atlas cause',
				match: {
					all: ['Cobalt Retail'],
					regex: [
						'Cobalt Retail[\\s\\S]{0,140}(caused by stale manager emails|because of stale manager emails|due to stale manager emails)',
					],
				},
			},
		],
		exactIdentifiers: ['Atlas Supply', 'Cobalt Retail', 'branch_manager_map.csv', 'region_code'],
		recallQueries: [
			{
				id: 'similar-cases',
				prompt: 'What similar prior routing cases do we have, and how were they different?',
				shouldCallRecallMemory: true,
				expectedFacts: ['atlas-cause', 'cobalt-cause'],
				forbiddenFacts: ['collapsed-cause'],
			},
		],
		finalQuestions: [],
	},
	{
		id: 'broad-prior-decisions',
		name: 'Broad prior decision recall',
		threads: [
			{
				id: 'launch-decisions',
				prompts: buildPrompts(
					'Project Kestrel launch decisions',
					[
						'For Project Kestrel, we decided the pilot audience is regional operators, not all admins.',
						'We also decided the first report should be a weekly CSV digest, not a live dashboard.',
						'The launch owner is Mira, and risk review stays with Omar.',
						'Do not lose the Project Kestrel owners: Mira owns launch, Omar owns risk review.',
					],
					45,
				),
			},
		],
		expectedActiveEpisodes: [
			{
				id: 'kestrel-audience',
				description: 'Kestrel pilot audience',
				match: { all: ['Project Kestrel', 'regional operators'] },
			},
			{
				id: 'kestrel-report',
				description: 'Kestrel first report format',
				match: { all: ['weekly CSV digest'] },
			},
			{
				id: 'kestrel-owners',
				description: 'Kestrel launch and risk owners',
				match: { all: ['Mira', 'Omar'] },
			},
		],
		staleFacts: [],
		forbiddenFacts: [],
		exactIdentifiers: ['Project Kestrel', 'Mira', 'Omar'],
		recallQueries: [
			{
				id: 'prior-decisions',
				prompt: 'What did we already decide for Project Kestrel?',
				shouldCallRecallMemory: true,
				expectedFacts: ['kestrel-audience', 'kestrel-report', 'kestrel-owners'],
				forbiddenFacts: [],
			},
		],
		finalQuestions: [],
	},
	{
		id: 'stale-current-state',
		name: 'Stale state vs current state',
		threads: [
			{
				id: 'pilot-status',
				prompts: buildPrompts(
					'Solace pilot status',
					[
						'For the Solace pilot, the status started as blocked on legal review.',
						'Update: legal review cleared for Solace, but procurement is now blocking rollout.',
						'Final current state for Solace: procurement is blocking rollout; legal is no longer the blocker.',
						'If we recall Solace later, answer procurement as the current blocker and legal review as cleared historical context.',
					],
					45,
				),
			},
		],
		expectedActiveEpisodes: [
			{
				id: 'solace-current',
				description: 'Solace current blocker',
				match: {
					all: ['Solace', 'procurement'],
					oneOf: ['blocking rollout', 'blocked by procurement', 'blocked on procurement'],
				},
			},
		],
		staleFacts: [
			{
				id: 'solace-stale',
				description: 'Legal is stale as current blocker',
				match: {
					all: ['Solace'],
					oneOf: [
						'legal review is blocking rollout',
						'currently blocked on legal review',
						'current blocker is legal review',
					],
				},
			},
		],
		forbiddenFacts: [],
		exactIdentifiers: ['Solace'],
		recallQueries: [
			{
				id: 'current-state',
				prompt: 'What is the current state we previously landed on for Solace?',
				shouldCallRecallMemory: true,
				expectedFacts: ['solace-current'],
				forbiddenFacts: ['solace-stale'],
			},
		],
		finalQuestions: [],
	},
	{
		id: 'no-result-abstention',
		name: 'No-result abstention',
		threads: [
			{
				id: 'aurora-notes',
				prompts: buildPrompts(
					'Aurora Billing exception review',
					[
						'For Aurora Billing, remember that invoice exceptions should be reviewed every Friday.',
						'Aurora Billing uses the owner alias `billing-review-aurora`.',
						'Keep Aurora Billing separate from unrelated hardware returns or Zephyr process notes.',
					],
					42,
				),
			},
		],
		expectedActiveEpisodes: [
			{
				id: 'aurora-review',
				description: 'Aurora review cadence',
				match: { all: ['Aurora Billing', 'Friday'] },
			},
		],
		staleFacts: [],
		forbiddenFacts: [],
		exactIdentifiers: ['billing-review-aurora'],
		recallQueries: [
			{
				id: 'unknown-project',
				prompt: 'Do we have any prior memory about the Zephyr hardware returns process?',
				shouldCallRecallMemory: true,
				expectedFacts: [],
				forbiddenFacts: ['aurora-review'],
			},
		],
		finalQuestions: [],
	},
	{
		id: 'scope-isolation',
		name: 'Scope isolation',
		threads: [
			{
				id: 'scope-a',
				prompts: buildPrompts(
					'resource Alpha rollout',
					[
						'For resource Alpha, the deployment window is Tuesday at 09:00 UTC.',
						'Alpha uses the private channel `#alpha-rollout-room`.',
						'Alpha rollout memory must stay scoped to resource Alpha only.',
					],
					24,
				),
			},
		],
		isolatedThreads: [
			{
				id: 'scope-b',
				resourceId: 'resource-beta',
				prompts: buildPrompts(
					'resource Beta rollout',
					[
						'For resource Beta, the deployment window is Friday at 21:00 UTC.',
						'Beta uses the private channel `#beta-rollout-room`.',
						'Beta rollout memory must stay scoped to resource Beta and must not appear in Alpha recall.',
					],
					24,
				),
			},
		],
		expectedActiveEpisodes: [
			{
				id: 'alpha-window',
				description: 'Alpha deployment window',
				match: { all: ['Alpha', 'Tuesday', '09:00 UTC'] },
			},
		],
		staleFacts: [],
		forbiddenFacts: [
			{
				id: 'beta-leak',
				description: 'Beta resource facts must not appear',
				match: { all: ['Beta', '#beta-rollout-room'] },
			},
		],
		exactIdentifiers: ['#alpha-rollout-room'],
		recallQueries: [
			{
				id: 'alpha-recall',
				prompt: 'What prior rollout room and window did we store for resource Alpha?',
				shouldCallRecallMemory: true,
				expectedFacts: ['alpha-window'],
				forbiddenFacts: ['beta-leak'],
			},
		],
		finalQuestions: [],
	},
	{
		id: 'source-traceability',
		name: 'Source traceability audit',
		threads: [
			{
				id: 'trace-thread',
				prompts: buildPrompts(
					'TraceCo source traceability',
					[
						'For TraceCo, remember that the audit source is the observation saying `TraceCo approved SOC2 exception EXP-778`.',
						'The exact exception ID is `EXP-778`, and it should remain source-backed.',
						'TraceCo recall should be able to explain the remembered exception from source evidence, not from a generic summary.',
					],
					42,
				),
			},
		],
		expectedActiveEpisodes: [
			{
				id: 'traceco-exception',
				description: 'TraceCo exception is source-backed',
				match: { all: ['TraceCo', 'EXP-778'] },
			},
		],
		staleFacts: [],
		forbiddenFacts: [],
		exactIdentifiers: ['EXP-778'],
		recallQueries: [
			{
				id: 'traceability',
				prompt: 'What prior source-backed exception did we store for TraceCo?',
				shouldCallRecallMemory: true,
				expectedFacts: ['traceco-exception'],
				forbiddenFacts: [],
			},
		],
		finalQuestions: [],
	},
	{
		id: 'adopted-vs-unadopted-proposal',
		name: 'Assistant proposal adopted vs unadopted',
		threads: [
			{
				id: 'proposal-thread',
				prompts: buildPrompts(
					'Ridgeway pilot naming',
					[
						'I might call the pilot `Ridgeway Express`, but do not treat that as final yet.',
						'Actually, use `Ridgeway Rapid Intake` as the final pilot name and carry that forward.',
						'Ignore the earlier `Ridgeway Express` draft name unless we discuss discarded names.',
						'Final Ridgeway handoff: adopted name is `Ridgeway Rapid Intake`; `Ridgeway Express` was tentative only.',
					],
					45,
				),
			},
		],
		expectedActiveEpisodes: [
			{
				id: 'adopted-name',
				description: 'Adopted Ridgeway name',
				match: { all: ['Ridgeway Rapid Intake'] },
			},
		],
		staleFacts: [
			{
				id: 'unadopted-name',
				description: 'Unadopted draft name',
				match: {
					all: ['Ridgeway Express'],
					oneOf: [
						'final name is `Ridgeway Express`',
						'settled on `Ridgeway Express`',
						'use `Ridgeway Express`',
					],
				},
			},
		],
		forbiddenFacts: [],
		exactIdentifiers: ['Ridgeway Rapid Intake'],
		recallQueries: [
			{
				id: 'adopted-name-recall',
				prompt: 'Which Ridgeway pilot name did we previously settle on?',
				shouldCallRecallMemory: true,
				expectedFacts: ['adopted-name'],
				forbiddenFacts: ['unadopted-name'],
			},
		],
		finalQuestions: [],
	},
	{
		id: 'long-tail-identifiers',
		name: 'Long-tail identifiers, acronyms, channels, IDs',
		threads: [
			{
				id: 'identifier-thread',
				prompts: buildPrompts(
					'QBR recovery workflow identifiers',
					[
						'For the QBR recovery workflow, preserve these exact identifiers: `WF-QBR-4792`, `#qbr-war-room`, and acronym `RFO`.',
						'The file name is exactly `qbr_recovery_owner_matrix_v3.csv`, and the owner alias is `ops-qbr-rfo`.',
						'When recalling QBR recovery later, list the exact workflow ID, channel, acronym, filename, and owner alias verbatim.',
					],
					42,
				),
			},
		],
		expectedActiveEpisodes: [
			{
				id: 'qbr-identifiers',
				description: 'QBR long-tail identifiers',
				match: {
					all: [
						'WF-QBR-4792',
						'#qbr-war-room',
						'RFO',
						'qbr_recovery_owner_matrix_v3.csv',
						'ops-qbr-rfo',
					],
				},
			},
		],
		staleFacts: [],
		forbiddenFacts: [],
		exactIdentifiers: [
			'WF-QBR-4792',
			'#qbr-war-room',
			'RFO',
			'qbr_recovery_owner_matrix_v3.csv',
			'ops-qbr-rfo',
		],
		recallQueries: [
			{
				id: 'identifier-recall',
				prompt: 'List the exact prior identifiers we stored for the QBR recovery workflow.',
				shouldCallRecallMemory: true,
				expectedFacts: ['qbr-identifiers'],
				forbiddenFacts: [],
			},
		],
		finalQuestions: [],
	},
] satisfies EpisodicMemoryScenario[];

export function getScenariosForPreset(preset: 'smoke' | 'golden'): EpisodicMemoryScenario[] {
	return preset === 'smoke' ? episodicMemoryScenarios.slice(0, 2) : episodicMemoryScenarios;
}
