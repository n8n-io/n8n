import { GlobalConfig } from '@n8n/config';
import { Logger } from '@n8n/backend-common';
import { ApplicationError } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';

import { ScheduleValidationService, type ScheduleInterval } from '../schedule-validation.service';

describe('ScheduleValidationService', () => {
	let service: ScheduleValidationService;
	let globalConfig: ReturnType<typeof mock<GlobalConfig>>;
	let logger: ReturnType<typeof mock<Logger>>;

	beforeEach(() => {
		globalConfig = mock<GlobalConfig>({
			workflows: {
				minScheduleIntervalSeconds: 300, // 5 minutes default
			},
		});
		logger = mock<Logger>();
		service = new ScheduleValidationService(globalConfig, logger);
	});

	describe('getMinScheduleIntervalMs', () => {
		it('should return minimum interval in milliseconds', () => {
			globalConfig.workflows.minScheduleIntervalSeconds = 300;
			expect(service.getMinScheduleIntervalMs()).toBe(300000);
		});

		it('should throw error for invalid configuration (non-finite)', () => {
			globalConfig.workflows.minScheduleIntervalSeconds = Infinity;
			expect(() => service.getMinScheduleIntervalMs()).toThrow(ApplicationError);
		});

		it('should throw error for invalid configuration (zero)', () => {
			globalConfig.workflows.minScheduleIntervalSeconds = 0;
			expect(() => service.getMinScheduleIntervalMs()).toThrow(ApplicationError);
		});

		it('should throw error for invalid configuration (negative)', () => {
			globalConfig.workflows.minScheduleIntervalSeconds = -1;
			expect(() => service.getMinScheduleIntervalMs()).toThrow(ApplicationError);
		});
	});

	describe('getMinScheduleIntervalSeconds', () => {
		it('should return minimum interval in seconds', () => {
			globalConfig.workflows.minScheduleIntervalSeconds = 300;
			expect(service.getMinScheduleIntervalSeconds()).toBe(300);
		});
	});

	describe('validateScheduleInterval', () => {
		beforeEach(() => {
			globalConfig.workflows.minScheduleIntervalSeconds = 300; // 5 minutes
		});

		describe('seconds interval', () => {
			it('should pass validation for interval >= minimum', () => {
				const interval: ScheduleInterval = {
					field: 'seconds',
					secondsInterval: 300,
				};
				expect(() => service.validateScheduleInterval(interval)).not.toThrow();
			});

			it('should throw error for interval < minimum', () => {
				const interval: ScheduleInterval = {
					field: 'seconds',
					secondsInterval: 60,
				};
				expect(() => service.validateScheduleInterval(interval)).toThrow(ApplicationError);
				expect(() => service.validateScheduleInterval(interval)).toThrow(
					/Schedule interval too short/,
				);
			});
		});

		describe('minutes interval', () => {
			it('should pass validation for interval >= minimum', () => {
				const interval: ScheduleInterval = {
					field: 'minutes',
					minutesInterval: 5,
				};
				expect(() => service.validateScheduleInterval(interval)).not.toThrow();
			});

			it('should throw error for interval < minimum', () => {
				const interval: ScheduleInterval = {
					field: 'minutes',
					minutesInterval: 1,
				};
				expect(() => service.validateScheduleInterval(interval)).toThrow(ApplicationError);
			});
		});

		describe('hours interval', () => {
			it('should pass validation for any hour interval (always >= 5 minutes)', () => {
				const interval: ScheduleInterval = {
					field: 'hours',
					hoursInterval: 1,
				};
				expect(() => service.validateScheduleInterval(interval)).not.toThrow();
			});
		});

		describe('days interval', () => {
			it('should pass validation for any day interval (always >= 5 minutes)', () => {
				const interval: ScheduleInterval = {
					field: 'days',
					daysInterval: 1,
				};
				expect(() => service.validateScheduleInterval(interval)).not.toThrow();
			});
		});

		describe('weeks interval', () => {
			it('should pass validation for single day per week', () => {
				const interval: ScheduleInterval = {
					field: 'weeks',
					weeksInterval: 1,
					triggerAtDay: [1], // Monday only
				};
				expect(() => service.validateScheduleInterval(interval)).not.toThrow();
			});

			it('should pass validation for multiple days with sufficient spacing', () => {
				const interval: ScheduleInterval = {
					field: 'weeks',
					weeksInterval: 1,
					triggerAtDay: [1, 3], // Monday and Wednesday (2 days apart)
				};
				globalConfig.workflows.minScheduleIntervalSeconds = 86400; // 1 day
				expect(() => service.validateScheduleInterval(interval)).not.toThrow();
			});

			it('should throw error for multiple days with insufficient spacing', () => {
				const interval: ScheduleInterval = {
					field: 'weeks',
					weeksInterval: 1,
					triggerAtDay: [1, 2], // Monday and Tuesday (1 day apart)
				};
				globalConfig.workflows.minScheduleIntervalSeconds = 172800; // 2 days
				expect(() => service.validateScheduleInterval(interval)).toThrow(ApplicationError);
			});

			it('should handle wrap-around days correctly', () => {
				const interval: ScheduleInterval = {
					field: 'weeks',
					weeksInterval: 1,
					triggerAtDay: [6, 0], // Saturday and Sunday (1 day apart, wrap-around)
				};
				globalConfig.workflows.minScheduleIntervalSeconds = 172800; // 2 days
				expect(() => service.validateScheduleInterval(interval)).toThrow(ApplicationError);
			});

			it('should use minimum day interval when multiple days are specified', () => {
				const interval: ScheduleInterval = {
					field: 'weeks',
					weeksInterval: 1,
					triggerAtDay: [0, 1, 2, 3, 4, 5, 6], // Every day
				};
				globalConfig.workflows.minScheduleIntervalSeconds = 86400; // 1 day
				expect(() => service.validateScheduleInterval(interval)).not.toThrow();
			});
		});

		describe('months interval', () => {
			it('should pass validation for any month interval (always >= 5 minutes)', () => {
				const interval: ScheduleInterval = {
					field: 'months',
					monthsInterval: 1,
				};
				expect(() => service.validateScheduleInterval(interval)).not.toThrow();
			});
		});
	});

	describe('validateCronExpression', () => {
		beforeEach(() => {
			globalConfig.workflows.minScheduleIntervalSeconds = 300; // 5 minutes
		});

		it('should pass validation for cron expression with sufficient interval', () => {
			// Every 10 minutes
			expect(() => service.validateCronExpression('*/10 * * * *')).not.toThrow();
		});

		it('should throw error for cron expression with insufficient interval', () => {
			// Every minute
			expect(() => service.validateCronExpression('* * * * *')).toThrow(ApplicationError);
			expect(() => service.validateCronExpression('* * * * *')).toThrow(
				/Cron expression interval too short/,
			);
		});

		it('should throw error for invalid cron expression', () => {
			expect(() => service.validateCronExpression('invalid cron')).toThrow(ApplicationError);
			expect(() => service.validateCronExpression('invalid cron')).toThrow(
				/Invalid cron expression/,
			);
		});
	});
});
