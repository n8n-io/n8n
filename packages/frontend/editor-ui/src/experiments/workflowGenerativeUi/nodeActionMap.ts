import type { CatalogTypeName } from './catalog';

const triggerTypes = new Set([
	'scheduleTrigger',
	'webhook',
	'chatTrigger',
	'emailReadImap',
	'gmailTrigger',
	'googleDriveTrigger',
	'manualTrigger',
]);
const chatTypes = new Set(['slack', 'discord', 'telegram', 'microsoftTeams', 'whatsApp']);
const fileTransferTypes = new Set(['ftp', 'googleDrive', 'awsS3', 'dropbox']);
const spreadsheetTypes = new Set(['googleSheets', 'airtable']);
const databaseTypes = new Set(['postgres', 'mySql']);
const crmTypes = new Set(['hubspot', 'salesforce', 'pipedrive']);
const decisionTypes = new Set(['if', 'switch', 'filter']);
const aiTaskTypes = new Set([
	'agent',
	'chainSummarization',
	'textClassifier',
	'informationExtractor',
]);
const transformTypes = new Set(['set', 'code']);

export function hintCatalogType(input: {
	type: string;
	resource?: string;
	operation?: string;
}): CatalogTypeName | null {
	const nodeType = input.type.slice(input.type.lastIndexOf('.') + 1);

	if (nodeType === 'stickyNote') return null;
	if (nodeType === 'formTrigger') return 'Form';
	if (triggerTypes.has(nodeType)) return 'When';
	if (
		chatTypes.has(nodeType) &&
		(input.resource === 'message' ||
			input.operation === 'post' ||
			input.operation === 'send' ||
			input.operation === 'reply')
	) {
		return 'ChatMessage';
	}
	if (
		(nodeType === 'gmail' || nodeType === 'emailSend') &&
		(input.operation === undefined || input.operation === 'send')
	) {
		return 'Email';
	}
	if (
		(nodeType === 'twilio' || nodeType === 'messageBird') &&
		(input.operation === undefined || input.operation === 'send')
	) {
		return 'Sms';
	}
	if (nodeType === 'httpRequest') return 'HttpCall';
	if (nodeType === 'ssh' && (input.resource === 'command' || input.operation === 'execute')) {
		return 'Terminal';
	}
	if (
		fileTransferTypes.has(nodeType) &&
		(input.operation === 'upload' || input.operation === 'download' || input.operation === 'copy')
	) {
		return 'FileTransfer';
	}
	if (spreadsheetTypes.has(nodeType)) return 'Spreadsheet';
	if (databaseTypes.has(nodeType)) return 'Database';
	if (crmTypes.has(nodeType)) return 'Crm';
	if (nodeType === 'googleCalendar' && input.resource === 'event') return 'CalendarEvent';
	if (decisionTypes.has(nodeType)) return 'Decision';
	if (nodeType === 'wait') return 'Wait';
	if (input.type.includes('langchain') && aiTaskTypes.has(nodeType)) return 'AiTask';
	if (transformTypes.has(nodeType)) return 'Transform';

	return null;
}
