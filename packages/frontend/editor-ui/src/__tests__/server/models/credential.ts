import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { Model } from 'miragejs';
import type { ModelDefinition } from 'miragejs/-types';

export const CredentialModel: ModelDefinition<ICredentialsResponse> = Model.extend({});
