import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoTypeOnlyImportInDiRule } from './no-type-only-import-in-di.js';

const ruleTester = new RuleTester({
	languageOptions: {
		// Required to parse decorators and TS syntax
		parser: require('@typescript-eslint/parser'),
		parserOptions: {
			ecmaVersion: 2020,
			sourceType: 'module',
		},
	},
});

ruleTester.run('no-type-only-import-in-di', NoTypeOnlyImportInDiRule, {
	valid: [
		{
			code: `
        import { Service } from '@n8n/di';
        import { Publisher } from './publisher.service';

        @Service()
        class ProvisioningService {
          constructor(private readonly publisher: Publisher) {}
        }
      `,
			filename: '/test/provisioning.service.ts',
		},
		{
			code: `
        import { type Publisher } from './publisher.service';

        class RegularClass {
          constructor(private readonly publisher: Publisher) {}
        }
      `,
			filename: '/test/regular-class.ts',
		},
		{
			code: `
        import { Service } from '@n8n/di';

        @Service()
        class SimpleService {}
      `,
			filename: '/test/simple.service.ts',
		},
		{
			code: `
        import { Service } from '@n8n/di';

        @Service()
        class ConfigService {
          constructor(private readonly port: number) {}
        }
      `,
			filename: '/test/config.service.ts',
		},
	],
	invalid: [
		{
			// Test individual specifier fix: import { type Publisher } -> import { Publisher }
			code: `
        import { Service } from '@n8n/di';
        import { type Publisher } from './publisher.service';

        @Service()
        class ProvisioningService {
          constructor(private readonly publisher: Publisher) {}
        }
      `,
			output: `
        import { Service } from '@n8n/di';
        import { Publisher } from './publisher.service';

        @Service()
        class ProvisioningService {
          constructor(private readonly publisher: Publisher) {}
        }
      `,
			filename: '/test/provisioning.service.ts',
			errors: [
				{
					messageId: 'noTypeOnlyImportInDi',
					data: {
						paramName: 'publisher',
						typeName: 'Publisher',
						importStyle: '{ type Publisher }',
						suggestedImportStyle: '{ Publisher }',
					},
				},
			],
		},
		{
			// Test declaration-level fix: import type { EventService } -> import { EventService }
			code: `
        import { Service } from '@n8n/di';
        import type { EventService } from './event.service';

        @Service()
        class NotificationService {
          constructor(private readonly eventService: EventService) {}
        }
      `,
			output: `
        import { Service } from '@n8n/di';
        import { EventService } from './event.service';

        @Service()
        class NotificationService {
          constructor(private readonly eventService: EventService) {}
        }
      `,
			filename: '/test/notification.service.ts',
			errors: [
				{
					messageId: 'noTypeOnlyImportInDi',
					data: {
						paramName: 'eventService',
						typeName: 'EventService',
						importStyle: '{ type EventService }',
						suggestedImportStyle: '{ EventService }',
					},
				},
			],
		},
		{
			// Multiple invalid imports handled in one pass
			code: `
        import { Service } from '@n8n/di';
        import { type Publisher } from './publisher.service';
        import { type Logger } from './logger';

        @Service()
        class ProvisioningService {
          constructor(
            private readonly publisher: Publisher,
            private readonly logger: Logger,
          ) {}
        }
      `,
			output: `
        import { Service } from '@n8n/di';
        import { Publisher } from './publisher.service';
        import { Logger } from './logger';

        @Service()
        class ProvisioningService {
          constructor(
            private readonly publisher: Publisher,
            private readonly logger: Logger,
          ) {}
        }
      `,
			filename: '/test/provisioning.service.ts',
			errors: [
				{
					messageId: 'noTypeOnlyImportInDi',
					data: {
						paramName: 'publisher',
						typeName: 'Publisher',
						importStyle: '{ type Publisher }',
						suggestedImportStyle: '{ Publisher }',
					},
				},
				{
					messageId: 'noTypeOnlyImportInDi',
					data: {
						paramName: 'logger',
						typeName: 'Logger',
						importStyle: '{ type Logger }',
						suggestedImportStyle: '{ Logger }',
					},
				},
			],
		},
		{
			// Test with multiple spaces after 'type' keyword
			code: `
        import { Service } from '@n8n/di';
        import { type  Publisher } from './publisher.service';

        @Service()
        class ProvisioningService {
          constructor(private readonly publisher: Publisher) {}
        }
      `,
			output: `
        import { Service } from '@n8n/di';
        import { Publisher } from './publisher.service';

        @Service()
        class ProvisioningService {
          constructor(private readonly publisher: Publisher) {}
        }
      `,
			filename: '/test/provisioning.service.ts',
			errors: [
				{
					messageId: 'noTypeOnlyImportInDi',
					data: {
						paramName: 'publisher',
						typeName: 'Publisher',
					},
				},
			],
		},
		{
			// Test multi-specifier import where only one is used in DI
			// Should convert to inline type syntax for other specifiers
			code: `
        import { Service } from '@n8n/di';
        import type { IPublisher, Publisher } from './publisher.service';

        @Service()
        class ProvisioningService {
          constructor(private readonly publisher: Publisher) {}
        }
      `,
			output: `
        import { Service } from '@n8n/di';
        import { type IPublisher, Publisher } from './publisher.service';

        @Service()
        class ProvisioningService {
          constructor(private readonly publisher: Publisher) {}
        }
      `,
			filename: '/test/provisioning.service.ts',
			errors: [
				{
					messageId: 'noTypeOnlyImportInDi',
					data: {
						paramName: 'publisher',
						typeName: 'Publisher',
					},
				},
			],
		},
		{
			// Test multi-specifier import with multiple type-only specifiers
			code: `
        import { Service } from '@n8n/di';
        import type { ILogger, Logger, IConfig } from './types';

        @Service()
        class MyService {
          constructor(private readonly logger: Logger) {}
        }
      `,
			output: `
        import { Service } from '@n8n/di';
        import { type ILogger, Logger, type IConfig } from './types';

        @Service()
        class MyService {
          constructor(private readonly logger: Logger) {}
        }
      `,
			filename: '/test/my.service.ts',
			errors: [
				{
					messageId: 'noTypeOnlyImportInDi',
					data: {
						paramName: 'logger',
						typeName: 'Logger',
					},
				},
			],
		},
	],
});
