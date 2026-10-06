/**
 * Plain data for the host catalog: the order of the contracts, and which slots of a legacy node
 * version a contract action runs. It imports nothing, so the host reads it without the code of
 * this package.
 */

/**
 * The order of the contracts of this package in the assistant catalog, most used first within
 * each node. A contract that the list does not name comes after the listed ones, in id order.
 */
export const ACTION_ORDER: readonly string[] = [
	'notion.databasePage.getAll',
	'notion.user.get',
	'googleSheets.sheet.read',
	'googleSheets.sheet.append',
	'googleSheets.sheet.appendOrUpdate',
	'gmail.message.send',
	'gmail.message.getAll',
	'gmail.message.get',
	'googleGemini.text.message',
	'openAi.chatModel',
	'openAi.image.generate',
	'openAi.text.message',
	'googleGemini.chatModel',
	'anthropic.chatModel',
	'minimax.chatModel',
	'xAi.chatModel',
	'slack.message.send',
	'slack.message.update',
	'slack.message.delete',
	'slack.message.getPermalink',
	'slack.channel.history',
	'slack.channel.get',
	'slack.channel.getAll',
	'slack.channel.create',
	'slack.reaction.add',
	'slack.user.get',
	'slack.file.upload',
	'whatsApp.message.send',
	'whatsApp.message.sendTemplate',
	'github.issue.getAll',
	'github.issue.get',
	'github.issue.create',
	'googleDocs.document.get',
	'googleDocs.document.create',
	'googleDrive.file.upload',
	'supabase.row.getAll',
	'supabase.row.create',
	'supabase.row.delete',
	'github.issue.update',
	'github.issue.createComment',
	'googleDocs.document.update',
	'googleDrive.file.search',
	'googleDrive.file.delete',
	'googleDrive.folder.create',
	'supabase.row.get',
	'supabase.row.update',
	'notion.dataSource.pageAdded',
	'github.repository.event',
	'whatsAppTrigger.trigger',
	'facebookTrigger.trigger',
	'googleSheetsTrigger.trigger',
];

/** A slot of a legacy node version that a contract action runs. */
export interface MigratedSlotSpec {
	/** The action id. Its resource and operation are the `resource` and `operation` of the slot. */
	readonly action: string;
	/** The action major that this node version runs. It never changes for a node version. */
	readonly major: number;
}

/** A legacy node version where contract actions run some slots. */
export interface MigratedVersionSpec {
	/** The legacy version that runs every other slot. */
	readonly legacy: number;
	/** The slots that contract actions run. */
	readonly slots: readonly MigratedSlotSpec[];
}

/**
 * Legacy node versions where contract actions run some slots, by full node type and node
 * version. A slot that moves to a contract, or a new action major, needs a new node version.
 */
export const MIGRATED_NODES: Readonly<
	Record<string, Readonly<Record<number, MigratedVersionSpec>>>
> = {
	'n8n-nodes-base.notion': {
		4: { legacy: 3, slots: [{ action: 'notion.databasePage.getAll', major: 1 }] },
	},
};
