import type { Trigger } from '@n8n/node-sdk';
import { generatedTriggersOf, generatedTriggersOfEntry } from '@n8n/node-sdk/codegen';
import {
	checkAction,
	contractCatalogOf,
	lintContract,
	replyContractOf,
} from '@n8n/node-sdk/registry';

import { bundledIdsOf, FIRST_PARTY_PACKAGES, sourceOf } from './first-party';

const natives: Array<Awaited<ReturnType<typeof sourceOf>>['natives'][number]> = [];
const triggers: Trigger[] = [];

beforeAll(async () => {
	const found = await Promise.all(FIRST_PARTY_PACKAGES.map(async (pkg) => await sourceOf(pkg)));
	natives.push(...found.flatMap((pkg) => pkg.natives));
	triggers.push(...found.flatMap((pkg) => pkg.triggers));
});

describe('native contracts', () => {
	it('run as legacy nodes, so nothing bundles them', () => {
		expect(natives.map(({ id, native }) => [id, native?.type]).sort()).toEqual([
			['facebookTrigger.trigger', 'n8n-nodes-base.facebookTrigger'],
			['form.trigger', 'n8n-nodes-base.formTrigger'],
			['googleSheetsTrigger.trigger', 'n8n-nodes-base.googleSheetsTrigger'],
			['loop.batches', 'n8n-nodes-base.splitInBatches'],
			['manual.trigger', 'n8n-nodes-base.manualTrigger'],
			['schedule.trigger', 'n8n-nodes-base.scheduleTrigger'],
			['webhook.trigger', 'n8n-nodes-base.webhook'],
			['whatsAppTrigger.trigger', 'n8n-nodes-base.whatsAppTrigger'],
		]);
		const bundled = new Set(bundledIdsOf());
		expect(natives.filter(({ id }) => bundled.has(id))).toEqual([]);
	});

	it('pass the checks of n8n-node-next check, and their replies the contract lint', () => {
		const replies = natives.flatMap((native) => {
			const reply =
				'kind' in native && native.kind === 'native'
					? replyContractOf(native satisfies Trigger)
					: undefined;
			return reply ? [reply] : [];
		});
		expect(replies.map(({ id }) => id).sort()).toEqual(['form.page', 'webhook.respond']);
		expect([...natives.flatMap(checkAction), ...replies.flatMap(lintContract)]).toEqual([]);
	});

	it('give the same module factories from the catalog as from the source', () => {
		const { entries } = contractCatalogOf(FIRST_PARTY_PACKAGES);
		const sources = [
			...triggers,
			...natives.filter((native): native is Trigger => 'kind' in native),
		];
		expect(sources.length).toBeGreaterThan(8);
		const pairs = sources.map((trigger) => {
			const entry = entries.find(({ manifest }) => manifest.id === trigger.id);
			if (!entry) throw new Error(`${trigger.id} is not in the catalog`);
			return [generatedTriggersOfEntry(entry), generatedTriggersOf(trigger, entry.nodeType)];
		});
		expect(pairs.map(([fromCatalog]) => fromCatalog)).toEqual(
			pairs.map(([, fromSource]) => fromSource),
		);
	});
});
