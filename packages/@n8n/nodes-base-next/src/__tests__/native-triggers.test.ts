import { lintContract, replyContractOf, toContract } from '@n8n/node-sdk';

import { actions, nativeTriggers, triggers } from '../index';

describe('native triggers', () => {
	it('run as built-in nodes, so nothing freezes or registers them', () => {
		expect(nativeTriggers.map((trigger) => [trigger.id, trigger.kind])).toEqual([
			['webhook.trigger', 'native'],
			['schedule.trigger', 'native'],
			['form.trigger', 'native'],
			['whatsAppTrigger.trigger', 'native'],
			['facebookTrigger.trigger', 'native'],
		]);
		const frozen = new Set([...actions, ...triggers].map(({ id }) => id));
		expect(nativeTriggers.filter(({ id }) => frozen.has(id))).toEqual([]);
	});

	it('keep the prose budgets of the contract format', () => {
		const contracts = nativeTriggers.flatMap((trigger) => {
			const reply = trigger.kind === 'native' ? replyContractOf(trigger) : undefined;
			return [toContract(trigger), ...(reply ? [reply] : [])];
		});
		expect(contracts.map(({ id }) => id)).toContain('webhook.respond');
		expect(contracts.flatMap(lintContract)).toEqual([]);
	});
});
