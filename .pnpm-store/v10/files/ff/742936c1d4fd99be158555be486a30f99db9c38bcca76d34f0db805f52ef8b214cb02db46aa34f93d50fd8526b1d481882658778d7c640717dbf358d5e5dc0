import { createPaginator } from "@smithy/core";
import { ListPartsCommand } from "../commands/ListPartsCommand";
import { S3Client } from "../S3Client";
export const paginateListParts = createPaginator(S3Client, ListPartsCommand, "PartNumberMarker", "NextPartNumberMarker", "MaxParts");
