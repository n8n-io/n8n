import type { LinkedInstanceCredentials } from '../linked-instance.store';
import type { RemoteInstanceClient, RemoteInstanceClientFactory } from './remote-instance.client';

/** Opens one client for the work and always closes it, also when the work fails. */
export async function withRemoteClient<T>(
	factory: RemoteInstanceClientFactory,
	credentials: LinkedInstanceCredentials,
	work: (client: RemoteInstanceClient) => Promise<T>,
): Promise<T> {
	const client = factory.create(credentials);
	try {
		return await work(client);
	} finally {
		await client.close();
	}
}
