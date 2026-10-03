import { checkAction, lintContract, replyContractOf } from '@n8n/node-sdk/registry';

import { actions, flowNatives, nativeTriggers, triggers } from '../index';

describe('native triggers', () => {
	it('run as legacy nodes, so nothing freezes or registers them', () => {
		expect(nativeTriggers.map((trigger) => [trigger.id, trigger.kind])).toEqual([
			['webhook.trigger', 'native'],
			['schedule.trigger', 'native'],
			['form.trigger', 'native'],
			['whatsAppTrigger.trigger', 'native'],
			['facebookTrigger.trigger', 'native'],
			['googleSheetsTrigger.trigger', 'native'],
		]);
		const frozen = new Set([...actions, ...triggers].map(({ id }) => id));
		expect(nativeTriggers.filter(({ id }) => frozen.has(id))).toEqual([]);
	});

	it('pass the checks of n8n-node-next check, and their replies the contract lint', () => {
		const replies = nativeTriggers.flatMap((trigger) => {
			const reply = trigger.kind === 'native' ? replyContractOf(trigger) : undefined;
			return reply ? [reply] : [];
		});
		expect(replies.map(({ id }) => id)).toContain('webhook.respond');
		expect([...nativeTriggers.flatMap(checkAction), ...replies.flatMap(lintContract)]).toEqual([]);
	});

	it('include the flow natives, which run as legacy nodes too', () => {
		expect(flowNatives.map(({ id, native }) => [id, native?.type])).toEqual([
			['manual.trigger', 'n8n-nodes-base.manualTrigger'],
			['loop.batches', 'n8n-nodes-base.splitInBatches'],
		]);
		const frozen = new Set([...actions, ...triggers].map(({ id }) => id));
		expect(flowNatives.filter(({ id }) => frozen.has(id))).toEqual([]);
		expect(flowNatives.flatMap(checkAction)).toEqual([]);
	});
});
