import type { ITag } from '@n8n/rest-api-client/api/tags';
import { Model } from 'miragejs';
import type { ModelDefinition } from 'miragejs/-types';

export const TagModel: ModelDefinition<ITag> = Model.extend({});
