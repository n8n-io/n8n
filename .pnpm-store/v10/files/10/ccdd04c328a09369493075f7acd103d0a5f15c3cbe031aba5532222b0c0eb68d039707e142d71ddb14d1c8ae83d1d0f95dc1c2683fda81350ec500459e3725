import { createPaginator } from "@smithy/core";
import { ListBucketsCommand } from "../commands/ListBucketsCommand";
import { S3Client } from "../S3Client";
export const paginateListBuckets = createPaginator(S3Client, ListBucketsCommand, "ContinuationToken", "ContinuationToken", "MaxBuckets");
