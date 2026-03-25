import type { EndpointVariant } from "./EndpointVariant";
/**
 * The hash of partition with the information specific to that partition.
 * The information includes the list of regions belonging to that partition,
 * and the hostname to be used for the partition.
 *
 * @internal
 * @deprecated unused for endpointRuleSets.
 */
export type PartitionHash = Record<string, {
    regions: string[];
    regionRegex: string;
    variants: EndpointVariant[];
    endpoint?: string;
}>;
