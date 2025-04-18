import type { IWorkflowDb } from '@/Interface';
import { Model } from 'miragejs';
import type { ModelDefinition } from 'miragejs/-types';

export const WorkflowModel: ModelDefinition<IWorkflowDb> = Model.extend({});
