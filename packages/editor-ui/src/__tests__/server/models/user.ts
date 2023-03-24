import { IUser } from '@/Interface';
import { Model } from 'miragejs';
import type { ModelDefinition } from 'miragejs/-types';

export const UserModel: ModelDefinition<IUser> = Model.extend({});
