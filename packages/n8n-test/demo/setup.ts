import 'reflect-metadata';
import nock from 'nock';
import { afterEach } from 'vitest';

import { clearNodeMocks } from 'n8n-test';

// Any HTTP call without a matching mock must fail loudly, never hit the network.
nock.disableNetConnect();
nock.emitter.on('no match', (req) => {
	console.error('No mock for network request:', req);
});

afterEach(() => {
	nock.cleanAll();
	clearNodeMocks();
});
