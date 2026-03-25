import { loadConfigAndHandleErrors, sendTelemetry } from '../utils/miscellaneous';
import * as process from 'process';
import { commandWrapper } from '../wrapper';
import { handleLint } from '../commands/lint';
import { Arguments } from 'yargs';
import { handlePush, PushOptions } from '../commands/push';
import { detectSpec } from '@redocly/openapi-core';

const mockFetch = jest.fn();
const originalFetch = global.fetch;

jest.mock('../utils/miscellaneous', () => ({
  sendTelemetry: jest.fn(),
  loadConfigAndHandleErrors: jest.fn(),
}));

beforeAll(() => {
  global.fetch = mockFetch;
});

afterAll(() => {
  jest.resetAllMocks();
  global.fetch = originalFetch;
});

jest.mock('../commands/lint', () => ({
  handleLint: jest.fn().mockImplementation(({ collectSpecData }) => {
    collectSpecData({ openapi: '3.1.0' });
  }),
  lintConfigCallback: jest.fn(),
}));

describe('commandWrapper', () => {
  it('should send telemetry if there is "telemetry: on" in the config', async () => {
    (loadConfigAndHandleErrors as jest.Mock).mockImplementation(() => {
      return { telemetry: 'on', styleguide: { recommendedFallback: true } };
    });
    (detectSpec as jest.Mock).mockImplementationOnce(() => {
      return 'oas3_1';
    });
    process.env.REDOCLY_TELEMETRY = 'on';

    const wrappedHandler = commandWrapper(handleLint);
    await wrappedHandler({} as any);
    expect(handleLint).toHaveBeenCalledTimes(1);
    expect(sendTelemetry).toHaveBeenCalledTimes(1);
    expect(sendTelemetry).toHaveBeenCalledWith({}, 0, false, 'oas3_1', 'openapi', '3.1.0');
  });

  it('should not collect spec version if the file is not parsed to json', async () => {
    (loadConfigAndHandleErrors as jest.Mock).mockImplementation(() => {
      return { telemetry: 'on', styleguide: { recommendedFallback: true } };
    });
    (handleLint as jest.Mock).mockImplementation(({ collectSpecData }) => {
      collectSpecData();
    });
    process.env.REDOCLY_TELEMETRY = 'on';

    const wrappedHandler = commandWrapper(handleLint);
    await wrappedHandler({} as any);
    expect(handleLint).toHaveBeenCalledTimes(1);
    expect(sendTelemetry).toHaveBeenCalledTimes(1);
    expect(sendTelemetry).toHaveBeenCalledWith({}, 0, false, undefined, undefined, undefined);
  });

  it('should NOT send telemetry if there is "telemetry: off" in the config', async () => {
    (loadConfigAndHandleErrors as jest.Mock).mockImplementation(() => {
      return { telemetry: 'off', styleguide: { recommendedFallback: true } };
    });
    process.env.REDOCLY_TELEMETRY = 'on';

    const wrappedHandler = commandWrapper(handleLint);
    await wrappedHandler({} as any);
    expect(handleLint).toHaveBeenCalledTimes(1);

    expect(sendTelemetry).toHaveBeenCalledTimes(0);
  });

  it('should pass files from arguments to config', async () => {
    const filesToPush = ['test1.yaml', 'test2.yaml'];

    const loadConfigMock = loadConfigAndHandleErrors as jest.Mock<any, any>;

    const argv = {
      files: filesToPush,
    } as Arguments<PushOptions>;

    await commandWrapper(handlePush)(argv);
    expect(loadConfigMock).toHaveBeenCalledWith(expect.objectContaining({ files: filesToPush }));
  });
});
