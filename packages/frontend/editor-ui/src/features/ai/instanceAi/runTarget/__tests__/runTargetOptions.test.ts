import type { LinkedInstanceStatus, LinkedInstanceSummary } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import {
	isLinkedRunTarget,
	LINK_CLOUD_MENU_ID,
	LOCAL_RUN_TARGET_ID,
	optionalRunTarget,
	runTargetChipName,
	runTargetOptions,
	runTargetPlace,
	type RunTargetTranslate,
} from '../runTargetOptions';

const OFFICE_ID = '3f1c2b6e-8a4d-4e2b-9c1a-7d5e6f8a9b0c';
const CLOUD_ID = '0b9a8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d';

/** Returns each key with its parameters, so that a test can see which copy was chosen. */
const translate: RunTargetTranslate = (key, params) =>
	params ? `${key} ${JSON.stringify(params)}` : key;

function link(
	id: string,
	name: string,
	status: LinkedInstanceStatus = 'online',
): LinkedInstanceSummary {
	return {
		id,
		name,
		baseUrl: 'https://cloud.example.test',
		status,
		lastVerifiedAt: null,
		createdAt: '2026-10-01T00:00:00.000Z',
		defaultRemoteProject: null,
	};
}

describe('runTargetOptions', () => {
	it('offers only this computer when there are no links', () => {
		expect(runTargetOptions([], translate)).toEqual([
			{
				id: LOCAL_RUN_TARGET_ID,
				target: { kind: 'local' },
				label: 'instanceAi.automation.place.thisComputer',
				description: 'instanceAi.runTarget.local.description',
				disabled: false,
			},
		]);
	});

	it('lists this computer first and then each link in the order it was given', () => {
		const options = runTargetOptions(
			[link(CLOUD_ID, 'Cloud'), link(OFFICE_ID, 'Office')],
			translate,
		);

		expect(options.map(({ id }) => id)).toEqual([LOCAL_RUN_TARGET_ID, CLOUD_ID, OFFICE_ID]);
	});

	it('makes an online link selectable under its name', () => {
		const [, office] = runTargetOptions([link(OFFICE_ID, 'Office')], translate);

		expect(office).toEqual({
			id: OFFICE_ID,
			target: { kind: 'linked', instanceId: OFFICE_ID },
			label: 'Office',
			description: 'instanceAi.runTarget.linked.description',
			disabled: false,
		});
	});

	it.each([
		['offline', 'instanceAi.runTarget.offline', 'instanceAi.runTarget.checkConnection'],
		['unauthorised', 'instanceAi.runTarget.refused', 'instanceAi.runTarget.linkAgain'],
		['mcp-disabled', 'instanceAi.runTarget.mcpOff', 'instanceAi.runTarget.turnOnMcp'],
		['unknown', 'instanceAi.runTarget.unchecked', 'instanceAi.runTarget.checkConnection'],
	] as const)(
		'disables a link whose status is %s and gives its name, status and next step',
		(status, labelKey, hintKey) => {
			const [, office] = runTargetOptions([link(OFFICE_ID, 'Office', status)], translate);

			expect(office.disabled).toBe(true);
			expect(office.label).toBe(`${labelKey} {"name":"Office"}`);
			expect(office.description).toBe(hintKey);
			expect(office.target).toEqual({ kind: 'linked', instanceId: OFFICE_ID });
		},
	);

	it('never gives a link the id of this computer', () => {
		const options = runTargetOptions([link(OFFICE_ID, 'Office')], translate);

		expect(options.filter(({ id }) => id === LOCAL_RUN_TARGET_ID)).toHaveLength(1);
		expect(options[0].target).toEqual({ kind: 'local' });
	});
});

describe('runTargetPlace', () => {
	const links = [link(OFFICE_ID, 'Office')];

	it('names this computer for a local target', () => {
		expect(runTargetPlace({ kind: 'local' }, links, translate)).toBe(
			'instanceAi.automation.place.thisComputer',
		);
	});

	it('names the chosen link', () => {
		expect(runTargetPlace({ kind: 'linked', instanceId: OFFICE_ID }, links, translate)).toBe(
			'Office',
		);
	});

	it('falls back to another instance when the chosen link is not in the list', () => {
		expect(runTargetPlace({ kind: 'linked', instanceId: CLOUD_ID }, links, translate)).toBe(
			'instanceAi.automation.place.otherInstance',
		);
	});
});

describe('runTargetChipName', () => {
	const linked = { kind: 'linked' as const, instanceId: OFFICE_ID, name: 'Office' };

	it('names the linked instance of a chat that runs there', () => {
		expect(runTargetChipName(linked, false)).toBe('Office');
	});

	it('shows no chip for a chat that runs on this computer', () => {
		expect(runTargetChipName({ kind: 'local' }, false)).toBeUndefined();
	});

	it('shows no chip for a chat without a stored target', () => {
		expect(runTargetChipName(undefined, false)).toBeUndefined();
	});

	it('shows no chip for a shared chat, which always runs here', () => {
		expect(runTargetChipName(linked, true)).toBeUndefined();
	});
});

describe('optionalRunTarget', () => {
	it('sends no run target when the user chose none', () => {
		expect(optionalRunTarget(undefined)).toEqual({});
		expect(Object.keys(optionalRunTarget(undefined))).toEqual([]);
	});

	it('sends the chosen run target as it is', () => {
		const target = { kind: 'linked', instanceId: OFFICE_ID } as const;

		expect(optionalRunTarget(target)).toEqual({ runTarget: target });
	});

	it('sends this computer as a choice, since it is a target too', () => {
		expect(optionalRunTarget({ kind: 'local' })).toEqual({ runTarget: { kind: 'local' } });
	});
});

describe('isLinkedRunTarget', () => {
	it('accepts a run target on a linked instance', () => {
		expect(isLinkedRunTarget({ kind: 'linked', instanceId: OFFICE_ID })).toBe(true);
	});

	it.each([
		['this computer', { kind: 'local' }],
		['no target', undefined],
		['a link id that is not a uuid', { kind: 'linked', instanceId: 'office' }],
		['a link without an id', { kind: 'linked' }],
		['an unknown kind', { kind: 'remote', instanceId: OFFICE_ID }],
		['a string', 'linked'],
	])('rejects %s', (_label, value) => {
		expect(isLinkedRunTarget(value)).toBe(false);
	});
});

describe('menu ids', () => {
	it('keeps the id of the link item apart from this computer and every link id', () => {
		expect(LINK_CLOUD_MENU_ID).not.toBe(LOCAL_RUN_TARGET_ID);
		expect(
			runTargetOptions([link(OFFICE_ID, 'Office')], translate).map(({ id }) => id),
		).not.toContain(LINK_CLOUD_MENU_ID);
	});
});
