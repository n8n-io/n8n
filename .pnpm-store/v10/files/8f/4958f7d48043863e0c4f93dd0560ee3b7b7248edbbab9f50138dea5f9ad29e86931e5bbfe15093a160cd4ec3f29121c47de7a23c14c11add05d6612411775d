import { createPaginator } from "@smithy/core";
import { ListCustomVerificationEmailTemplatesCommand, } from "../commands/ListCustomVerificationEmailTemplatesCommand";
import { SESv2Client } from "../SESv2Client";
export const paginateListCustomVerificationEmailTemplates = createPaginator(SESv2Client, ListCustomVerificationEmailTemplatesCommand, "NextToken", "NextToken", "PageSize");
