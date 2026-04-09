import { Assertions } from '../common/assertions';
import { InfoContact } from '../common/info-contact';
import { Struct } from '../common/struct';

import type { Overlay1RuleSet } from '../../oas-types';
import type { Overlay1Rule } from '../../visitors';

export const rules: Overlay1RuleSet<'built-in'> = {
  'info-contact': InfoContact as Overlay1Rule,
  struct: Struct as Overlay1Rule,
  assertions: Assertions as Overlay1Rule,
};

export const preprocessors = {};
