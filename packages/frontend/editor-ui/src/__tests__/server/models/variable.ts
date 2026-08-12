import type { EnvironmentVariable } from '@/features/settings/environments.ee/environments.types';
import { Model } from 'miragejs';
import type { ModelDefinition } from 'miragejs/-types';

export const VariableModel: ModelDefinition<EnvironmentVariable> = Model.extend({});
