import { Service } from '@n8n/di';

import { TypedEmitter } from '@/typed-emitter.js';

import type { PubSubEventMap } from './pubsub.event-map.js';

@Service()
export class PubSubEventBus extends TypedEmitter<PubSubEventMap> {}
