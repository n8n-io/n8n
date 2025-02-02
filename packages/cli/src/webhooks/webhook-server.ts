import { Service } from '@n8n/di';

import { AbstractServer } from '@/abstract-server';

@Service()
export class WebhookServer extends AbstractServer {}
