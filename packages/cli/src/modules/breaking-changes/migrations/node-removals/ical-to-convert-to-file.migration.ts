import type { NodeMigration } from '../node-migration';

/**
 * iCalendar to Convert to File (Convert to ICS).
 *
 * Does:
 * - Target: `convertToFile`, version 1.1, `operation` = `iCal`.
 * - Keeps: every other parameter with the same name and shape. Convert to File reuses
 *   the iCalendar `createEvent` description and executor.
 * - Changes: only `operation`, from `createEventFile` (the only old operation) to `iCal`.
 *
 * Refuses when:
 * - Never refuses.
 *
 * Accepted changes:
 * - None.
 */
export const icalToConvertToFile: NodeMigration = {
	ruleId: 'i-calendar-removed-v3',
	migrate: (node) => {
		const { operation: _operation, ...parameters } = node.parameters;

		return {
			node: {
				type: 'n8n-nodes-base.convertToFile',
				typeVersion: 1.1,
				parameters: { ...parameters, operation: 'iCal' },
			},
		};
	},
};
