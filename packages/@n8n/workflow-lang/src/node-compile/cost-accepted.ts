export interface AcceptedCostRise {
	key: string;
	rise: number;
	reason: string;
}

const RESPONSE_BYTES =
	'The operation asks for response bytes. The request helper tracks the request for the run in the host at the file size limit of the runtime, and sends the accept header of v1.';
const GENERAL_ACCEPT =
	'The request helper sends the accept header of v1. This request keeps the general helper, which reads the json option at run time.';
const OWN_PROPERTY =
	'The own-property test with a key that is not a constant does not give true for a name of Object.prototype.';

const UPLOAD =
	'The upload of file bytes keeps the general request helper, which sends the accept header of v1 for each of its requests.';
const LENIENT =
	'The node sets `simple: false`, which the request honours; the request sends the accept header of v1.';

export const ACCEPTED_COST_RISES: AcceptedCostRise[] = [
	{ key: 'n8n-nodes-base.box@1:file.download', rise: 20, reason: RESPONSE_BYTES },
	{ key: 'n8n-nodes-base.googleDrive@3:file.download', rise: 11, reason: RESPONSE_BYTES },
	{ key: 'n8n-nodes-base.microsoftOutlook@1:message.getMime', rise: 11, reason: RESPONSE_BYTES },
	{
		key: 'n8n-nodes-base.nasa@1:astronomyPictureOfTheDay.get',
		rise: 13,
		reason: RESPONSE_BYTES,
	},
	{ key: 'n8n-nodes-base.quickbooks@1:estimate.get', rise: 13, reason: RESPONSE_BYTES },
	{ key: 'n8n-nodes-base.quickbooks@1:invoice.get', rise: 13, reason: RESPONSE_BYTES },
	{ key: 'n8n-nodes-base.quickbooks@1:payment.get', rise: 13, reason: RESPONSE_BYTES },
	{ key: 'n8n-nodes-base.telegram@1:file.get', rise: 23, reason: RESPONSE_BYTES },
	{ key: 'n8n-nodes-base.telegram@1.1:file.get', rise: 23, reason: RESPONSE_BYTES },
	{ key: 'n8n-nodes-base.telegram@1.2:file.get', rise: 23, reason: RESPONSE_BYTES },
	{ key: 'n8n-nodes-base.theHiveProject@1:case.getAttachment', rise: 11, reason: RESPONSE_BYTES },
	{ key: 'n8n-nodes-base.theHiveProject@1:case.addAttachment', rise: 4, reason: GENERAL_ACCEPT },
	{ key: 'n8n-nodes-base.theHiveProject@1:log.addAttachment', rise: 4, reason: GENERAL_ACCEPT },
	{ key: 'n8n-nodes-base.microsoftOutlook@1:*', rise: 8, reason: GENERAL_ACCEPT },
	{ key: 'n8n-nodes-base.github@1:pullRequest.getDiff', rise: 4, reason: GENERAL_ACCEPT },
	{ key: 'n8n-nodes-base.github@1:pullRequest.getPatch', rise: 4, reason: GENERAL_ACCEPT },
	{ key: 'n8n-nodes-base.github@1.1:pullRequest.getDiff', rise: 4, reason: GENERAL_ACCEPT },
	{ key: 'n8n-nodes-base.github@1.1:pullRequest.getPatch', rise: 4, reason: GENERAL_ACCEPT },
	{ key: 'n8n-nodes-base.slack@1:file.upload', rise: 4, reason: UPLOAD },
	{ key: 'n8n-nodes-base.slack@2:file.upload', rise: 4, reason: UPLOAD },
	{ key: 'n8n-nodes-base.slack@2.1:file.upload', rise: 4, reason: UPLOAD },
	{ key: 'n8n-nodes-base.slack@2.2:file.upload', rise: 15, reason: UPLOAD },
	{ key: 'n8n-nodes-base.slack@2.3:file.upload', rise: 15, reason: UPLOAD },
	{ key: 'n8n-nodes-base.slack@2.4:file.upload', rise: 15, reason: UPLOAD },
	{ key: 'n8n-nodes-base.slack@2.5:file.upload', rise: 15, reason: UPLOAD },
	{ key: 'n8n-nodes-base.slack@2.6:file.upload', rise: 15, reason: UPLOAD },
	{ key: 'n8n-nodes-base.slack@2.7:file.upload', rise: 15, reason: UPLOAD },
	{ key: 'n8n-nodes-base.slack@2.7:message.search', rise: 4, reason: LENIENT },
	{ key: 'n8n-nodes-base.magento2@1:customer.create', rise: 4, reason: OWN_PROPERTY },
	{ key: 'n8n-nodes-base.magento2@1:customer.update', rise: 4, reason: OWN_PROPERTY },
];
