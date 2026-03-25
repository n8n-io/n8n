import { createPaginator } from "@smithy/core";
import { ListDirectoryBucketsCommand, } from "../commands/ListDirectoryBucketsCommand";
import { S3Client } from "../S3Client";
export const paginateListDirectoryBuckets = createPaginator(S3Client, ListDirectoryBucketsCommand, "ContinuationToken", "ContinuationToken", "MaxDirectoryBuckets");
