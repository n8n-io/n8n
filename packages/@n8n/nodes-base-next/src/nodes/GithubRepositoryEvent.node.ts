import { toTriggerNodeType } from '@n8n/node-sdk';

import { repositoryEvent } from './github/repository.event';

export class GithubRepositoryEvent extends toTriggerNodeType(repositoryEvent) {}
