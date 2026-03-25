import { createPaginator } from "@smithy/core";
import { ListEmailTemplatesCommand, } from "../commands/ListEmailTemplatesCommand";
import { SESv2Client } from "../SESv2Client";
export const paginateListEmailTemplates = createPaginator(SESv2Client, ListEmailTemplatesCommand, "NextToken", "NextToken", "PageSize");
