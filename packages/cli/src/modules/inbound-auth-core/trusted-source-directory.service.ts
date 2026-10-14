import { Service } from '@n8n/di';
import { deriveCapabilities, TrustedSourceStore } from '@n8n/inbound-auth';
import type {
	TrustedSourceDirectory,
	TrustedSourceFilter,
	TrustedSourceOption,
} from 'n8n-workflow';

/**
 * What a node sees of the trusted sources: id and name of the sources on a surface, narrowed
 * to the ones with the capability the node needs. Handed to nodes through `additionalData`,
 * so a node never touches DI.
 */
@Service()
export class TrustedSourceDbDirectory implements TrustedSourceDirectory {
	constructor(private readonly store: TrustedSourceStore) {}

	async listTrustedSources({
		surface,
		capability,
	}: TrustedSourceFilter): Promise<TrustedSourceOption[]> {
		const sources = await this.store.listBySurface(surface);
		return sources
			.filter(
				(source) =>
					capability === undefined ||
					deriveCapabilities(source.config, source.metadata).has(capability),
			)
			.map(({ id, name }) => ({ id, name }));
	}
}
