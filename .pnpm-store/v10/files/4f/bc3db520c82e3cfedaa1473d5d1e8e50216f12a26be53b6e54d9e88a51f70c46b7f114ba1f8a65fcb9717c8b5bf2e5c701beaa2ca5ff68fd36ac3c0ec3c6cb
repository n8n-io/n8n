import recommended from './recommended';
import recommendedStrict from './recommended-strict';
import all from './all';
import minimal from './minimal';
import spec from './spec';
import { rules as oas3Rules, preprocessors as oas3Preprocessors } from '../rules/oas3';
import { rules as oas2Rules, preprocessors as oas2Preprocessors } from '../rules/oas2';
import { rules as async2Rules, preprocessors as async2Preprocessors } from '../rules/async2';
import { rules as async3Rules, preprocessors as async3Preprocessors } from '../rules/async3';
import { rules as arazzo1Rules, preprocessors as arazzoPreprocessors } from '../rules/arazzo';
import { decorators as oas3Decorators } from '../decorators/oas3';
import { decorators as oas2Decorators } from '../decorators/oas2';
import { decorators as async2Decorators } from '../decorators/async2';
import { decorators as async3Decorators } from '../decorators/async3';
import { decorators as arazzo1Decorators } from '../decorators/arazzo';

import type { StyleguideRawConfig, Plugin } from './types';

export const builtInConfigs: Record<string, StyleguideRawConfig> = {
  recommended,
  'recommended-strict': recommendedStrict,
  minimal,
  all,
  spec,
  'redocly-registry': {
    decorators: { 'registry-dependencies': 'on' },
  },
};

export const defaultPlugin: Plugin<'built-in'> = {
  id: '', // default plugin doesn't have id
  rules: {
    oas3: oas3Rules,
    oas2: oas2Rules,
    async2: async2Rules,
    async3: async3Rules,
    arazzo1: arazzo1Rules,
  },
  preprocessors: {
    oas3: oas3Preprocessors,
    oas2: oas2Preprocessors,
    async2: async2Preprocessors,
    async3: async3Preprocessors,
    arazzo1: arazzoPreprocessors,
  },
  decorators: {
    oas3: oas3Decorators,
    oas2: oas2Decorators,
    async2: async2Decorators,
    async3: async3Decorators,
    arazzo1: arazzo1Decorators,
  },
  configs: builtInConfigs,
};
