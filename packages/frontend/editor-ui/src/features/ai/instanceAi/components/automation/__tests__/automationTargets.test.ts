import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
	LINKED_INSTANCE_STATUSES,
	LINKED_INSTANCE_TRANSFER_CREDENTIAL_STATUSES,
	type AutomationProposalCard as Proposal,
	type LinkedInstanceTransferPreflight,
} from '@n8n/api-types';

import { transferDialogState } from '@/features/linkedInstances/transfer/transferDialogState';
import type { RunTargetTranslate } from '../../../runTarget/runTargetOptions';
import {
	chosenTargetId,
	decisionFor,
	LINKED_REASON_KEY,
	placeOf,
	showsLocalCaveat,
} from '../automationProposal';
import {
	automationGate,
	credentialsUrl,
	initialTargetId,
	linkedTargetOf,
	offersTargetChoice,
	targetOptions,
} from '../automationTargets';
import {
	CLOUD_LINK_ID,
	LAB_LINK_ID,
	makeLinkedProposal,
	makeManualProposal,
	makeProposal,
} from './automationProposalFixtures';

/** Returns the key and its parameters, so the tests read which text each row gets. */
const translate: RunTargetTranslate = (key, params) =>
	params ? `${key}(${Object.values(params).join(',')})` : key;

function preflight(
	overrides: Partial<LinkedInstanceTransferPreflight> = {},
): LinkedInstanceTransferPreflight {
	return {
		workflowName: 'Digest builder',
		moves: { nodes: 2 },
		nodeTypeCheck: 'unknown',
		missingNodeTypes: [],
		credentials: [],
		targetProject: null,
		subWorkflowCalls: [],
		...overrides,
	};
}

const LOCAL_ONLY = makeLinkedProposal({
	recommended: { targetId: 'local', kind: 'local', reasons: ['needs-local-files'] },
});

describe('chosenTargetId', () => {
	it('sends the chosen target when the card offers it, else the default answer target', () => {
		const proposal = makeLinkedProposal();

		expect(chosenTargetId(proposal, 'local')).toBe('local');
		expect(chosenTargetId(proposal, CLOUD_LINK_ID)).toBe(CLOUD_LINK_ID);
		expect(chosenTargetId(proposal, LAB_LINK_ID)).toBe(CLOUD_LINK_ID);
		expect(chosenTargetId(proposal, undefined)).toBe(CLOUD_LINK_ID);
	});
});

describe('placeOf and showsLocalCaveat for a chosen target', () => {
	it('names the cloud with the reason that it keeps going', () => {
		expect(placeOf(makeLinkedProposal(), CLOUD_LINK_ID)).toEqual({
			linked: true,
			linkedLabel: 'Team cloud',
			reasonKey: LINKED_REASON_KEY,
			caveat: false,
		});
	});

	it('names this computer without the cloud reason, and adds the caveat, when the user picks it', () => {
		const proposal = makeLinkedProposal();

		expect(placeOf(proposal, 'local')).toEqual({ linked: false, caveat: true });
		expect(showsLocalCaveat(proposal, 'local')).toBe(true);
		expect(showsLocalCaveat(proposal, CLOUD_LINK_ID)).toBe(false);
	});

	it('gives a manual workflow in the cloud no reason, because nothing waits for an event', () => {
		const proposal = makeManualProposal({
			targets: makeLinkedProposal().targets,
			offered: { target: ['local', CLOUD_LINK_ID], activate: [false] },
		});

		expect(placeOf(proposal, CLOUD_LINK_ID)).toEqual({
			linked: true,
			linkedLabel: 'Team cloud',
			caveat: false,
		});
	});
});

describe('decisionFor a chosen target', () => {
	it('sends the chosen target with the activation of the button', () => {
		expect(decisionFor('activate', makeLinkedProposal(), 'local')).toEqual({
			kind: 'capabilityDecision',
			approved: true,
			values: { target: 'local', activate: true },
		});
		expect(decisionFor('save', makeLinkedProposal(), CLOUD_LINK_ID)).toEqual({
			kind: 'capabilityDecision',
			approved: true,
			values: { target: CLOUD_LINK_ID, activate: false },
		});
	});

	it('never sends an offline link that the card did not offer', () => {
		expect(decisionFor('activate', makeLinkedProposal(), LAB_LINK_ID)).toEqual({
			kind: 'capabilityDecision',
			approved: true,
			values: { target: CLOUD_LINK_ID, activate: true },
		});
	});
});

describe('targetOptions', () => {
	it('lists this computer, the online cloud and the offline lab with the reason it is off', () => {
		expect(targetOptions(makeLinkedProposal(), translate)).toEqual([
			{
				id: 'local',
				linked: false,
				label: 'instanceAi.automation.place.thisComputer',
				description: 'instanceAi.runTarget.local.description',
				disabled: false,
			},
			{
				id: CLOUD_LINK_ID,
				linked: true,
				label: 'Team cloud',
				description: 'instanceAi.runTarget.linked.description',
				disabled: false,
			},
			{
				id: LAB_LINK_ID,
				linked: true,
				label: 'instanceAi.runTarget.offline(Lab)',
				description: 'instanceAi.runTarget.checkConnection',
				disabled: true,
			},
		]);
	});

	it.each([
		['unauthorised', 'instanceAi.runTarget.refused(Lab)', 'instanceAi.runTarget.linkAgain'],
		['mcp-disabled', 'instanceAi.runTarget.mcpOff(Lab)', 'instanceAi.runTarget.turnOnMcp'],
		['unknown', 'instanceAi.runTarget.unchecked(Lab)', 'instanceAi.runTarget.checkConnection'],
	] as const)('says why a link with the status %s is off', (status, label, description) => {
		const proposal = makeLinkedProposal();
		proposal.targets[2] = { ...proposal.targets[2], status };

		expect(targetOptions(proposal, translate)[2]).toEqual({
			id: LAB_LINK_ID,
			linked: true,
			label,
			description,
			disabled: true,
		});
	});

	it('names a link without a label in words, and disables an online link that is not offered', () => {
		const proposal = makeLinkedProposal({ offered: { target: ['local'], activate: [true] } });
		proposal.targets[1] = { ...proposal.targets[1], label: '  ' };

		expect(targetOptions(proposal, translate)[1]).toMatchObject({
			label: 'instanceAi.automation.place.otherInstance',
			disabled: true,
		});
	});
});

describe('offersTargetChoice', () => {
	it('offers a choice only when the card offers more than one place', () => {
		expect(offersTargetChoice(makeLinkedProposal())).toBe(true);
		expect(offersTargetChoice(makeProposal())).toBe(false);
	});
});

describe('initialTargetId', () => {
	it('starts with the place of the chat when the card offers it', () => {
		expect(
			initialTargetId(
				makeLinkedProposal({ recommended: makeProposal().recommended }),
				CLOUD_LINK_ID,
			),
		).toBe(CLOUD_LINK_ID);
	});

	it('starts with the recommendation when the chat runs here or names a link that is not offered', () => {
		expect(initialTargetId(makeLinkedProposal(), undefined)).toBe(CLOUD_LINK_ID);
		expect(initialTargetId(makeLinkedProposal(), LAB_LINK_ID)).toBe(CLOUD_LINK_ID);
		expect(initialTargetId(makeLinkedProposal(), 'local')).toBe('local');
	});

	it('keeps this computer for a workflow that needs it, also in a cloud chat', () => {
		expect(initialTargetId(LOCAL_ONLY, CLOUD_LINK_ID)).toBe('local');
	});
});

describe('linkedTargetOf and credentialsUrl', () => {
	it('finds the linked target and opens its credentials list', () => {
		const target = linkedTargetOf(makeLinkedProposal(), CLOUD_LINK_ID);

		expect(target?.label).toBe('Team cloud');
		expect(target && credentialsUrl(target)).toBe('https://cloud.example.test/home/credentials');
	});

	it('finds no linked target for this computer or an unknown id', () => {
		expect(linkedTargetOf(makeLinkedProposal(), 'local')).toBeUndefined();
		expect(linkedTargetOf(makeLinkedProposal(), 'missing')).toBeUndefined();
	});

	it.each([
		['https://cloud.example.test/n8n/', 'https://cloud.example.test/n8n/home/credentials'],
		['javascript:alert(1)', undefined],
		['not a url', undefined],
		[undefined, undefined],
	])('builds the credentials link for %s', (baseUrl, expected) => {
		const target = {
			id: CLOUD_LINK_ID,
			kind: 'linked' as const,
			status: 'online' as const,
			baseUrl,
		};

		expect(credentialsUrl(target)).toBe(expected);
	});
});

describe('automationGate', () => {
	const ready = (overrides: Partial<LinkedInstanceTransferPreflight> = {}) =>
		automationGate(transferDialogState(preflight(overrides)));

	it('lets both buttons act without a check, and after a failed check', () => {
		for (const check of ['idle', 'failed'] as const) {
			expect(automationGate(check)).toEqual({
				needsSetUp: [],
				unchecked: [],
				canTurnOn: true,
				canSave: true,
			});
		}
	});

	it('holds both buttons while the check runs', () => {
		expect(automationGate('checking')).toMatchObject({ canTurnOn: false, canSave: false });
	});

	it('holds "Turn it on" while credentials arrive empty, and lists them', () => {
		const gate = ready({
			credentials: [
				{ name: 'Slack account', type: 'slackApi', status: 'needs-set-up' },
				{ name: 'Sheets', type: 'googleApi', status: 'matched' },
				{ name: 'Mail', type: 'smtp', status: 'unknown' },
			],
		});

		expect(gate).toEqual({
			needsSetUp: ['Slack account'],
			unchecked: ['Mail'],
			canTurnOn: false,
			canSave: true,
		});
	});

	it('lets "Turn it on" act when the credentials were not checked, and lists them', () => {
		expect(ready({ credentials: [{ name: 'Mail', type: 'smtp', status: 'unknown' }] })).toEqual({
			needsSetUp: [],
			unchecked: ['Mail'],
			canTurnOn: true,
			canSave: true,
		});
	});

	it.each([
		['calls other workflows by ID', { subWorkflowCalls: [{ id: 'wf-2', name: 'Send' }] }],
		['uses node types that the instance lacks', { missingNodeTypes: ['acme.widget@1'] }],
	])('holds both buttons when the workflow %s', (_label, overrides) => {
		expect(ready(overrides)).toMatchObject({ canTurnOn: false, canSave: false });
	});
});

describe('automation targets (property)', () => {
	const credentialArb = fc.record({
		name: fc.string({ minLength: 1, maxLength: 10 }),
		type: fc.constantFrom('slackApi', 'smtp'),
		status: fc.constantFrom(...LINKED_INSTANCE_TRANSFER_CREDENTIAL_STATUSES),
	});
	const preflightArb = fc.record({
		credentials: fc.array(credentialArb, { maxLength: 4 }),
		missingNodeTypes: fc.array(fc.constant('acme.widget@1'), { maxLength: 1 }),
		subWorkflowCalls: fc.array(fc.constant({ id: 'wf-2', name: null }), { maxLength: 1 }),
	});
	const statusArb = fc.constantFrom(...LINKED_INSTANCE_STATUSES);
	const targetIdArb = fc.constantFrom('local', CLOUD_LINK_ID, LAB_LINK_ID, 'missing', undefined);
	const proposalArb: fc.Arbitrary<Proposal> = fc
		.record({
			cloudStatus: statusArb,
			labStatus: statusArb,
			offered: fc.subarray(['local', CLOUD_LINK_ID, LAB_LINK_ID], { minLength: 1 }),
			recommended: fc.constantFrom('local', CLOUD_LINK_ID),
		})
		.map(({ cloudStatus, labStatus, offered, recommended }) => {
			const base = makeLinkedProposal();
			return makeLinkedProposal({
				recommended: recommended === 'local' ? makeProposal().recommended : base.recommended,
				targets: [
					base.targets[0],
					{ ...base.targets[1], status: cloudStatus },
					{ ...base.targets[2], status: labStatus },
				],
				offered: { target: offered, activate: [true, false] },
			});
		});

	it('answers only with an offered place, whatever the user or the chat picked', () => {
		fc.assert(
			fc.property(proposalArb, targetIdArb, targetIdArb, (proposal, picked, chat) => {
				const start = initialTargetId(proposal, chat);
				const body = decisionFor('activate', proposal, picked ?? start);

				expect(start === undefined || proposal.offered.target.includes(start)).toBe(true);
				if (body.kind !== 'capabilityDecision' || !body.approved) throw new Error('Wrong body');
				expect(proposal.offered.target).toContain(body.values?.target);
			}),
		);
	});

	it('disables exactly the places that the card did not offer or that are not online', () => {
		fc.assert(
			fc.property(proposalArb, (proposal) => {
				for (const option of targetOptions(proposal, translate)) {
					const target = proposal.targets.find(({ id }) => id === option.id);
					const usable =
						proposal.offered.target.includes(option.id) &&
						(target?.kind === 'local' || target?.status === 'online');
					expect(option.disabled).toBe(!usable);
				}
			}),
		);
	});

	it('never lets "Turn it on" act while a credential arrives empty or the workflow cannot move', () => {
		fc.assert(
			fc.property(preflightArb, (overrides) => {
				const gate = automationGate(transferDialogState(preflight(overrides)));
				const empty = overrides.credentials.some(({ status }) => status === 'needs-set-up');
				const blocked = overrides.missingNodeTypes.length + overrides.subWorkflowCalls.length > 0;

				expect(gate.canTurnOn).toBe(!empty && !blocked);
				expect(gate.canSave).toBe(!blocked);
				expect(gate.needsSetUp.length + gate.unchecked.length).toBe(
					overrides.credentials.filter(({ status }) => status !== 'matched').length,
				);
			}),
		);
	});
});
