import { TypedEmitter } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import type { PubSubEventMap } from './pubsub.event-map';

@Service()
export class PubSubEventBus extends TypedEmitter<PubSubEventMap> {}
