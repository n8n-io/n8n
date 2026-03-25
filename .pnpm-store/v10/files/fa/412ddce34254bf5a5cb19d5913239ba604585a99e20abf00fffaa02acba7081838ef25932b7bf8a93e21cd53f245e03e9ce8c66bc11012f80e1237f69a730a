import path = require('path');
import { existsSync, readFileSync } from 'fs';
import { spawn } from 'child_process';
import { PRODUCT_NAMES, PRODUCT_PACKAGES } from './constants';
import { getPlatformSpawnArgs } from '../../utils/platform';

import type { PreviewProjectOptions, Product } from './types';
import type { CommandArgs } from '../../wrapper';

export const previewProject = async ({ argv }: CommandArgs<PreviewProjectOptions>) => {
  const { plan, port } = argv;
  const projectDir = argv['project-dir'];

  const product = argv.product || tryGetProductFromPackageJson(projectDir);

  if (!isValidProduct(product)) {
    process.stderr.write(`Invalid product ${product}.`);
    throw new Error(`Project preview launch failed.`);
  }

  const productName = PRODUCT_NAMES[product];
  const packageName = PRODUCT_PACKAGES[product];

  process.stdout.write(`\nLaunching preview of ${productName} ${plan} using NPX.\n\n`);
  const { npxExecutableName, shell } = getPlatformSpawnArgs();

  const child = spawn(
    npxExecutableName,
    ['-y', packageName, 'preview', `--plan=${plan}`, `--port=${port || 4000}`],
    {
      stdio: 'inherit',
      cwd: projectDir,
      shell,
    }
  );

  child.on('error', (error) => {
    process.stderr.write(`Project preview launch failed: ${error.message}`);
    throw new Error(`Project preview launch failed.`);
  });
};

const isValidProduct = (product: string | undefined): product is Product => {
  if (!product) {
    return false;
  }

  return !!PRODUCT_NAMES[product as Product];
};

const tryGetProductFromPackageJson = (projectDir: string): Product => {
  const packageJsonPath = path.join(process.cwd(), projectDir, 'package.json');

  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const packageJsonDeps = packageJson.dependencies || {};

      for (const [product, packageName] of Object.entries(PRODUCT_PACKAGES)) {
        if (packageJsonDeps[packageName]) {
          process.stdout.write(`\n${packageName} detected in project's 'package.json'`);
          return product as Product;
        }
      }
    } catch (error) {
      process.stdout.write(`Invalid 'package.json': ${packageJsonPath}. Using Realm.`);
    }
  }

  return 'realm';
};
