/**
 * Plain data for the host catalog. It imports nothing, so the host reads it without the code of
 * this package.
 */

/**
 * The order of the contracts of this package in the assistant catalog, most used first within
 * each node. A contract that the list does not name comes after the listed ones, in id order.
 */
export const ACTION_ORDER: readonly string[] = [
	'httpRequest.get',
	'httpRequest.send',
	'httpRequest.download',
	'items.set',
	'items.renameKeys',
	'items.dateTime',
	'items.sort',
	'items.limit',
	'items.removeDuplicates',
	'items.aggregate',
	'items.splitOut',
	'items.summarize',
	'condition.if',
	'condition.switch',
	'condition.filter',
	'dataTable.row.insert',
	'dataTable.row.get',
	'dataTable.row.exists',
	'dataTable.row.update',
	'dataTable.row.upsert',
	'dataTable.row.delete',
	'dataTable.table.create',
	'dataTable.table.list',
	'dataTable.table.rename',
	'dataTable.table.clear',
	'dataTable.table.delete',
	'code.javaScript',
	'code.python',
	'merge.append',
	'merge.combine',
	'merge.combineByPosition',
	'wait.interval',
	'wait.until',
	'stopAndError.stop',
	'loopState.set',
	'ai.prompt',
	'ai.agent',
	'ai.classify',
	'extractFromFile.csv',
	'extractFromFile.xlsx',
	'extractFromFile.json',
	'extractFromFile.text',
	'extractFromFile.pdf',
	'noOp.pass',
	'webhook.trigger',
	'schedule.trigger',
	'form.trigger',
];
