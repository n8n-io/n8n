import { createPaginator } from "@smithy/core";
import { ListDomainDeliverabilityCampaignsCommand, } from "../commands/ListDomainDeliverabilityCampaignsCommand";
import { SESv2Client } from "../SESv2Client";
export const paginateListDomainDeliverabilityCampaigns = createPaginator(SESv2Client, ListDomainDeliverabilityCampaignsCommand, "NextToken", "NextToken", "PageSize");
