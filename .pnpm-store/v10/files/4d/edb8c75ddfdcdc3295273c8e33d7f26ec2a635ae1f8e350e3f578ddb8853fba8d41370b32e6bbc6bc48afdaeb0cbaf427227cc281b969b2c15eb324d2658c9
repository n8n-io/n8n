import { createPaginator } from "@smithy/core";
import { ListExperiencesCommand, } from "../commands/ListExperiencesCommand";
import { KendraClient } from "../KendraClient";
export const paginateListExperiences = createPaginator(KendraClient, ListExperiencesCommand, "NextToken", "NextToken", "MaxResults");
