import { createPaginator } from "@smithy/core";
import { GetSnapshotsCommand, } from "../commands/GetSnapshotsCommand";
import { KendraClient } from "../KendraClient";
export const paginateGetSnapshots = createPaginator(KendraClient, GetSnapshotsCommand, "NextToken", "NextToken", "MaxResults");
