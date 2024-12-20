import { Service } from 'typedi';

import { AbstractServer } from '@/abstract-server';

@Service()
export class WebhookServer extends AbstractServer {}
