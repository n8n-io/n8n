import { eventNamesAll } from '../index';

/**
 * Every log-streaming event group in existence. The destination UI derives its
 * group checkboxes from the first two segments of the event name, and external
 * consumers (SIEM and compliance pipelines) filter the audit trail by the
 * `n8n.audit.` prefix.
 */
const KNOWN_EVENT_GROUPS = [
	'n8n.audit.',
	'n8n.workflow.',
	'n8n.node.',
	'n8n.worker.',
	'n8n.ai.',
	'n8n.runner.',
	'n8n.queue.',
	'n8n.execution.',
];

describe('log streaming event names', () => {
	it('should only contain names under a known event group prefix', () => {
		const offenders = eventNamesAll.filter(
			(eventName) => !KNOWN_EVENT_GROUPS.some((prefix) => eventName.startsWith(prefix)),
		);

		expect(
			offenders,
			'Event names are a public contract with log-streaming consumers and cannot be renamed once released. ' +
				'Events that record a user action belong under the `n8n.audit.` prefix: SIEM pipelines filter the ' +
				'audit trail by that prefix, and a new top-level prefix creates its own opt-in group in the ' +
				'destination UI (see `eventNamesMcp` for a group with its own payload shape named under the audit ' +
				'prefix). Only deliberately introduce a new operational group with sign-off from the owning team, ' +
				'then add its prefix to KNOWN_EVENT_GROUPS.',
		).toEqual([]);
	});
});
