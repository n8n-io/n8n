'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
require('reflect-metadata');
process.env.NODE_ENV = 'test';
process.env.N8N_LOG_LEVEL = 'silent';
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_DATABASE = ':memory:';
process.env.N8N_USER_MANAGEMENT_DISABLED = 'true';
process.env.N8N_METRICS = 'false';
process.env.QUEUE_HEALTH_CHECK_ACTIVE = 'false';
jest.setTimeout(30000);
const originalConsole = console;
global.console = {
	...originalConsole,
	log: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	info: jest.fn(),
	debug: jest.fn(),
};
jest.mock('@sentry/node', () => ({
	init: jest.fn(),
	configureScope: jest.fn(),
	addBreadcrumb: jest.fn(),
	captureException: jest.fn(),
	captureMessage: jest.fn(),
	withScope: jest.fn((cb) => cb({})),
	Severity: {
		Error: 'error',
		Warning: 'warning',
		Info: 'info',
		Debug: 'debug',
	},
}));
jest.mock('@sentry-internal/node-native-stacktrace', () => ({}), { virtual: true });
jest.mock('@n8n_io/license-sdk');
jest.mock('@/telemetry');
jest.mock('@/eventbus/message-event-bus/message-event-bus');
jest.mock('@/push');
jest.mock('node:fs');
jest.mock('node:fs/promises');
jest.mock('zod-class', () => {
	const actual = jest.requireActual('zod-class');
	return {
		...actual,
		Z: {
			...actual.Z,
			class: jest.fn((shape) => {
				if (!shape || typeof shape !== 'object') {
					return class MockDto {
						constructor(data = {}) {
							Object.assign(this, data);
						}
					};
				}
				return actual.Z.class(shape);
			}),
		},
	};
});
jest.mock('@n8n/di', () => {
	const actual = jest.requireActual('@n8n/di');
	const mockGlobalConfig = {
		database: {
			type: 'sqlite',
			sqliteDatabase: ':memory:',
			logging: false,
			tablePrefix: '',
		},
		credentials: {
			defaultName: 'My credentials',
		},
		workflows: {
			defaultName: 'My workflow',
			callerPolicyDefaultOption: 'workflowsFromSameOwner',
		},
		endpoints: {
			rest: 'rest',
			webhook: 'webhook',
			webhookWaiting: 'webhook-waiting',
			webhookTest: 'webhook-test',
		},
		path: {
			n8nPath: '/tmp/n8n',
		},
		nodes: {
			include: [],
			exclude: [],
			errorTriggerType: 'n8n-nodes-base.errorTrigger',
		},
		public: {
			path: '/tmp/n8n/public',
		},
		queue: {
			health: {
				active: false,
			},
		},
	};
	const mockContainer = {
		get: jest.fn((token) => {
			if (token && (token.name === 'GlobalConfig' || token.constructor?.name === 'GlobalConfig')) {
				return mockGlobalConfig;
			}
			if (typeof token === 'function' && token.name === 'GlobalConfig') {
				return mockGlobalConfig;
			}
			if (typeof token === 'string') {
				switch (token) {
					case 'Logger':
						return {
							verbose: jest.fn(),
							debug: jest.fn(),
							info: jest.fn(),
							warn: jest.fn(),
							error: jest.fn(),
						};
					default:
						return {};
				}
			}
			if (typeof token === 'function') {
				const tokenStr = token.toString();
				if (tokenStr.includes('GlobalConfig') || token.name === 'GlobalConfig') {
					return mockGlobalConfig;
				}
				return new (jest.fn(() => ({})))();
			}
			return {};
		}),
		set: jest.fn(),
		bind: jest.fn(() => ({ to: jest.fn() })),
		isBound: jest.fn(() => true),
	};
	return {
		...actual,
		Container: mockContainer,
	};
});
jest.mock('n8n-workflow', () => {
	const actual = jest.requireActual('n8n-workflow');
	return {
		...actual,
		LoggerProxy: {
			...actual.LoggerProxy,
			init: jest.fn(),
			verbose: jest.fn(),
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		},
	};
});
jest.mock('@/push/websocket.push', () => ({
	WebSocketPush: jest.fn().mockImplementation(() => ({
		bind: jest.fn(),
		unbind: jest.fn(),
		send: jest.fn(),
	})),
}));
jest.mock('@/workflows/workflow-execution.service', () => ({
	WorkflowExecutionService: jest.fn().mockImplementation(() => ({
		execute: jest.fn(),
		cancel: jest.fn(),
	})),
}));
jest.mock('fs/promises', () => ({
	readFile: jest.fn().mockResolvedValue('{}'),
	writeFile: jest.fn().mockResolvedValue(undefined),
	access: jest.fn().mockResolvedValue(undefined),
	stat: jest.fn().mockResolvedValue({
		isDirectory: () => false,
		isFile: () => true,
		size: 1024,
		mtime: new Date(),
		ctime: new Date(),
	}),
	mkdir: jest.fn().mockResolvedValue(undefined),
	readdir: jest.fn().mockResolvedValue([]),
	unlink: jest.fn().mockResolvedValue(undefined),
	rm: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@n8n/typeorm', () => ({
	getConnectionManager: jest.fn(() => ({
		connections: [],
		get: jest.fn(() => ({
			isConnected: true,
			query: jest.fn().mockResolvedValue([]),
			manager: {
				find: jest.fn().mockResolvedValue([]),
				findOne: jest.fn().mockResolvedValue(null),
				save: jest.fn().mockResolvedValue({}),
				remove: jest.fn().mockResolvedValue({}),
			},
		})),
	})),
	DataSource: jest.fn().mockImplementation(() => ({
		initialize: jest.fn().mockResolvedValue({}),
		destroy: jest.fn().mockResolvedValue({}),
		isInitialized: true,
		manager: {
			find: jest.fn().mockResolvedValue([]),
			findOne: jest.fn().mockResolvedValue(null),
			save: jest.fn().mockResolvedValue({}),
			remove: jest.fn().mockResolvedValue({}),
		},
	})),
	PrimaryColumn: jest.fn(() => jest.fn()),
	PrimaryGeneratedColumn: jest.fn(() => jest.fn()),
	Generated: jest.fn(() => jest.fn()),
	Column: jest.fn(() => jest.fn()),
	CreateDateColumn: jest.fn(() => jest.fn()),
	UpdateDateColumn: jest.fn(() => jest.fn()),
	DeleteDateColumn: jest.fn(() => jest.fn()),
	BeforeInsert: jest.fn(() => jest.fn()),
	BeforeUpdate: jest.fn(() => jest.fn()),
	BeforeRemove: jest.fn(() => jest.fn()),
	AfterLoad: jest.fn(() => jest.fn()),
	AfterInsert: jest.fn(() => jest.fn()),
	AfterUpdate: jest.fn(() => jest.fn()),
	AfterRemove: jest.fn(() => jest.fn()),
	Index: jest.fn(() => jest.fn()),
	Unique: jest.fn(() => jest.fn()),
	Entity: jest.fn(() => jest.fn()),
	ManyToOne: jest.fn(() => jest.fn()),
	OneToMany: jest.fn(() => jest.fn()),
	ManyToMany: jest.fn(() => jest.fn()),
	OneToOne: jest.fn(() => jest.fn()),
	JoinColumn: jest.fn(() => jest.fn()),
	JoinTable: jest.fn(() => jest.fn()),
	RelationId: jest.fn(() => jest.fn()),
	Repository: class MockRepository {
		constructor() {
			this.find = jest.fn().mockResolvedValue([]);
			this.findOne = jest.fn().mockResolvedValue(null);
			this.findOneBy = jest.fn().mockResolvedValue(null);
			this.save = jest.fn().mockResolvedValue({});
			this.remove = jest.fn().mockResolvedValue({});
			this.delete = jest.fn().mockResolvedValue({ affected: 1 });
			this.createQueryBuilder = jest.fn().mockReturnValue({
				select: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				orWhere: jest.fn().mockReturnThis(),
				orderBy: jest.fn().mockReturnThis(),
				groupBy: jest.fn().mockReturnThis(),
				having: jest.fn().mockReturnThis(),
				limit: jest.fn().mockReturnThis(),
				offset: jest.fn().mockReturnThis(),
				leftJoin: jest.fn().mockReturnThis(),
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				innerJoin: jest.fn().mockReturnThis(),
				innerJoinAndSelect: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue([]),
				getOne: jest.fn().mockResolvedValue(null),
				getRawMany: jest.fn().mockResolvedValue([]),
				getRawOne: jest.fn().mockResolvedValue(null),
			});
		}
	},
}));
jest.mock('@n8n/config', () => {
	const mockGlobalConfigInstance = {
		database: {
			type: 'sqlite',
			sqliteDatabase: ':memory:',
			logging: false,
			tablePrefix: '',
		},
		credentials: {
			defaultName: 'My credentials',
		},
		workflows: {
			defaultName: 'My workflow',
			callerPolicyDefaultOption: 'workflowsFromSameOwner',
		},
		endpoints: {
			rest: 'rest',
			webhook: 'webhook',
			webhookWaiting: 'webhook-waiting',
			webhookTest: 'webhook-test',
		},
		path: {
			n8nPath: '/tmp/n8n',
		},
		nodes: {
			include: [],
			exclude: [],
			errorTriggerType: 'n8n-nodes-base.errorTrigger',
		},
		public: {
			path: '/tmp/n8n/public',
		},
		queue: {
			health: {
				active: false,
			},
		},
	};
	const MockGlobalConfig = jest.fn().mockImplementation(() => mockGlobalConfigInstance);
	Object.defineProperty(MockGlobalConfig, 'name', {
		value: 'GlobalConfig',
		writable: false,
		enumerable: false,
		configurable: true,
	});
	return {
		GlobalConfig: MockGlobalConfig,
		Env: jest.fn(() => jest.fn()),
		Config: jest.fn(() => jest.fn()),
	};
});
jest.mock('@/events/event.service', () => ({
	EventService: jest.fn().mockImplementation(() => ({
		emit: jest.fn(),
		on: jest.fn(),
		off: jest.fn(),
		removeAllListeners: jest.fn(),
	})),
}));
jest.mock('@/license', () => ({
	License: {
		isFeatureEnabled: jest.fn(() => true),
		isWithinUsersLimit: jest.fn(() => true),
		getPlanName: jest.fn(() => 'community'),
	},
}));
//# sourceMappingURL=setup-mocks.js.map
