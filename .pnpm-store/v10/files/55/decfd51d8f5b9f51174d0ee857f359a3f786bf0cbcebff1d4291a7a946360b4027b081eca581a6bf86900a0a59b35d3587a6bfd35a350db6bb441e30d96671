import { createPaginator } from "@smithy/core";
import { ListUserProfilesCommand, } from "../commands/ListUserProfilesCommand";
import { SageMakerClient } from "../SageMakerClient";
export const paginateListUserProfiles = createPaginator(SageMakerClient, ListUserProfilesCommand, "NextToken", "NextToken", "MaxResults");
