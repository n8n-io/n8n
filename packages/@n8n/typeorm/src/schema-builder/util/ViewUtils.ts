import { EntityMetadata } from '../../metadata/EntityMetadata';

export class ViewUtils {
	/**
	 * Comparator for .sort() that will order views bases on dependencies in creation order
	 */
	static viewMetadataCmp(
		metadataA: EntityMetadata | undefined,
		metadataB: EntityMetadata | undefined,
	): number {
		if (!metadataA || !metadataB) {
			return 0;
		}
		if (
			metadataA.dependsOn &&
			(metadataA.dependsOn.has(metadataB.target) || metadataA.dependsOn.has(metadataB.name))
		) {
			return 1;
		}
		if (
			metadataB.dependsOn &&
			(metadataB.dependsOn.has(metadataA.target) || metadataB.dependsOn.has(metadataA.name))
		) {
			return -1;
		}
		return 0;
	}
}
