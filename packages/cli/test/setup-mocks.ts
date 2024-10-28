import 'reflect-metadata';

jest.mock('@sentry/node');
jest.mock('@n8n_io/license-sdk');
jest.mock('@/telemetry');
jest.mock('@/eventbus/MessageEventBus/MessageEventBus');
jest.mock('@/push');
