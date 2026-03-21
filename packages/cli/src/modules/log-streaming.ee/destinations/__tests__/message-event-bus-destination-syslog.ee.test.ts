import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import type { MessageEventBusDestinationSyslogOptions } from 'n8n-workflow';

import { MessageEventBusDestinationSyslog } from '../message-event-bus-destination-syslog.ee';

describe('MessageEventBusDestinationSyslog', () => {
	describe('isMessageEventBusDestinationSyslogOptions', () => {
		it('should identify valid syslog options', () => {
			const {
				isMessageEventBusDestinationSyslogOptions,
			} = require('../message-event-bus-destination-syslog.ee');

			const validOptions: MessageEventBusDestinationSyslogOptions = {
				__type: MessageEventBusDestinationTypeNames.syslog,
				host: 'localhost',
				port: 514,
				protocol: 'udp',
				label: 'Test Syslog',
				enabled: true,
				subscribedEvents: ['n8n.workflow.success'],
				credentials: {},
				anonymizeAuditMessages: false,
			};

			expect(isMessageEventBusDestinationSyslogOptions(validOptions)).toBe(true);
		});

		it('should reject invalid options', () => {
			const {
				isMessageEventBusDestinationSyslogOptions,
			} = require('../message-event-bus-destination-syslog.ee');

			expect(isMessageEventBusDestinationSyslogOptions({})).toBe(false);
			expect(isMessageEventBusDestinationSyslogOptions(null)).toBe(false);
			expect(isMessageEventBusDestinationSyslogOptions({ label: 'test' })).toBe(false);
		});
	});

	describe('deserialize', () => {
		it('should return null for invalid data', () => {
			const invalidOptions = {
				__type: 'invalid',
				id: 'syslog-1',
			} as any;

			const destination = MessageEventBusDestinationSyslog.deserialize(null as any, invalidOptions);

			expect(destination).toBeNull();
		});
	});
});
