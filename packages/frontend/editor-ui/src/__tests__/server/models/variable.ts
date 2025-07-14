import type { EnvironmentVariable } from '@/Interface';
import { Model } from 'miragejs';
import type { ModelDefinition } from 'miragejs/-types';

export const VariableModel: ModelDefinition<EnvironmentVariable> = Model.extend({});
