import { createPaginator } from "@smithy/core";
import { ListObjectsV2Command, } from "../commands/ListObjectsV2Command";
import { S3Client } from "../S3Client";
export const paginateListObjectsV2 = createPaginator(S3Client, ListObjectsV2Command, "ContinuationToken", "NextContinuationToken", "MaxKeys");
