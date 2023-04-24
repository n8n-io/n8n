import type { Registry } from 'miragejs';

// eslint-disable-next-line import/no-unresolved
import type Schema from 'miragejs/orm/schema';

import type { models } from './models';
import type { factories } from './factories';

type AppRegistry = Registry<typeof models, typeof factories>;
export type AppSchema = Schema<AppRegistry>;
