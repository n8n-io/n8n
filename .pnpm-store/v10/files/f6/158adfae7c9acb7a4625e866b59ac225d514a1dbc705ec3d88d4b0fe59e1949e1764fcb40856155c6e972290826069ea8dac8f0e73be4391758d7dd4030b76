import { createPaginator } from "@smithy/core";
import { ListRecommendationsCommand, } from "../commands/ListRecommendationsCommand";
import { SESv2Client } from "../SESv2Client";
export const paginateListRecommendations = createPaginator(SESv2Client, ListRecommendationsCommand, "NextToken", "NextToken", "PageSize");
