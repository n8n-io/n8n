import { iteratePathItems, handleSplit } from '../index';
import * as path from 'path';
import * as openapiCore from '@redocly/openapi-core';
import { ComponentsFiles } from '../types';
import { blue, green } from 'colorette';
import { loadConfigAndHandleErrors } from '../../../utils/__mocks__/miscellaneous';

import type { Config } from '@redocly/openapi-core';

const utils = require('../../../utils/miscellaneous');

jest.mock('../../../utils/miscellaneous', () => ({
  ...jest.requireActual('../../../utils/miscellaneous'),
  writeToFileByExtension: jest.fn(),
}));

jest.mock('@redocly/openapi-core', () => ({
  ...jest.requireActual('@redocly/openapi-core'),
  isRef: jest.fn(),
}));

describe('#split', () => {
  const openapiDir = 'test';
  const componentsFiles: ComponentsFiles = {};

  it('should split the file and show the success message', async () => {
    const filePath = 'packages/cli/src/commands/split/__tests__/fixtures/spec.json';
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await handleSplit({
      argv: {
        api: filePath,
        outDir: openapiDir,
        separator: '_',
      },
      config: loadConfigAndHandleErrors() as any as Config,
      version: 'cli-version',
    });

    expect(process.stderr.write).toBeCalledTimes(2);
    expect((process.stderr.write as jest.Mock).mock.calls[0][0]).toBe(
      `🪓 Document: ${blue(filePath!)} ${green('is successfully split')}
    and all related files are saved to the directory: ${blue(openapiDir)} \n`
    );
    expect((process.stderr.write as jest.Mock).mock.calls[1][0]).toContain(
      `${filePath}: split processed in <test>ms`
    );
  });

  it('should use the correct separator', async () => {
    const filePath = 'packages/cli/src/commands/split/__tests__/fixtures/spec.json';

    jest.spyOn(utils, 'pathToFilename').mockImplementation(() => 'newFilePath');

    await handleSplit({
      argv: {
        api: filePath,
        outDir: openapiDir,
        separator: '_',
      },
      config: loadConfigAndHandleErrors() as any as Config,
      version: 'cli-version',
    });

    expect(utils.pathToFilename).toBeCalledWith(expect.anything(), '_');
    utils.pathToFilename.mockRestore();
  });

  it('should have correct path with paths', () => {
    const openapi = require('./fixtures/spec.json');

    jest.spyOn(openapiCore, 'slash').mockImplementation(() => 'paths/test.yaml');
    jest.spyOn(path, 'relative').mockImplementation(() => 'paths/test.yaml');
    iteratePathItems(
      openapi.paths,
      openapiDir,
      path.join(openapiDir, 'paths'),
      componentsFiles,
      '_',
      undefined,
      'yaml'
    );

    expect(openapiCore.slash).toHaveBeenCalledWith('paths/test.yaml');
    expect(path.relative).toHaveBeenCalledWith('test', 'test/paths/test.yaml');
  });

  it('should have correct path with webhooks', () => {
    const openapi = require('./fixtures/webhooks.json');

    jest.spyOn(openapiCore, 'slash').mockImplementation(() => 'webhooks/test.yaml');
    jest.spyOn(path, 'relative').mockImplementation(() => 'webhooks/test.yaml');
    iteratePathItems(
      openapi.webhooks,
      openapiDir,
      path.join(openapiDir, 'webhooks'),
      componentsFiles,
      'webhook_',
      undefined,
      'yaml'
    );

    expect(openapiCore.slash).toHaveBeenCalledWith('webhooks/test.yaml');
    expect(path.relative).toHaveBeenCalledWith('test', 'test/webhooks/test.yaml');
  });

  it('should have correct path with x-webhooks', () => {
    const openapi = require('./fixtures/spec.json');

    jest.spyOn(openapiCore, 'slash').mockImplementation(() => 'webhooks/test.yaml');
    jest.spyOn(path, 'relative').mockImplementation(() => 'webhooks/test.yaml');
    iteratePathItems(
      openapi['x-webhooks'],
      openapiDir,
      path.join(openapiDir, 'webhooks'),
      componentsFiles,
      'webhook_',
      undefined,
      'yaml'
    );

    expect(openapiCore.slash).toHaveBeenCalledWith('webhooks/test.yaml');
    expect(path.relative).toHaveBeenCalledWith('test', 'test/webhooks/test.yaml');
  });

  it('should create correct folder name for code samples', async () => {
    const openapi = require('./fixtures/samples.json');

    const fs = require('fs');
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

    jest.spyOn(utils, 'escapeLanguageName');
    iteratePathItems(
      openapi.paths,
      openapiDir,
      path.join(openapiDir, 'paths'),
      componentsFiles,
      '_',
      undefined,
      'yaml'
    );

    expect(utils.escapeLanguageName).nthCalledWith(1, 'C#');
    expect(utils.escapeLanguageName).nthReturnedWith(1, 'C_sharp');

    expect(utils.escapeLanguageName).nthCalledWith(2, 'C/AL');
    expect(utils.escapeLanguageName).nthReturnedWith(2, 'C_AL');

    expect(utils.escapeLanguageName).nthCalledWith(3, 'Visual Basic');
    expect(utils.escapeLanguageName).nthReturnedWith(3, 'VisualBasic');

    expect(utils.escapeLanguageName).toBeCalledTimes(3);

    utils.escapeLanguageName.mockRestore();
  });
});
