import {IExecuteFunctions,} from 'n8n-core';

import {IDataObject, INodeExecutionData, INodeType, INodeTypeDescription,} from 'n8n-workflow';
import {
	CONSENT_EMAIL_CATEGORY,
	CONSENT_FROM_EMAIL,
	CONSENT_FROM_NAME,
	EMAIL_CHANNEL
} from './constants';
import {buildConsentUrl} from './helpers';
import {ConsentService} from './services/consent';
import {EmailNotificationService, SendEmailOnConsentService} from './services/email';
import {Gllue} from './services/gllue';

const helpers = require('./helpers');


export class GllueConsentLogic implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gllue Consent Logic',
		name: 'gllueConsentLogic',
		icon: 'file:gllue.svg',
		group: ['transform'],
		version: 1,
		description: 'check to send term or not',
		defaults: {
			name: 'Gllue Consent Logic',
			color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'gllueApi',
				required: true,
			},

		],
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const item = this.getInputData()[0].json;
		// @ts-ignore
		const resourceId = item.info.trigger_model_id;
		// @ts-ignore
		const resource = item.info.trigger_model_name;
		const credentials = await this.getCredentials('gllueApi') as IDataObject;
		const timestamp = helpers.getCurrentTimeStamp();
		const token = helpers.generateTokenWithAESKey(timestamp, credentials.apiUsername, credentials.apiAesKey);
		const gllue = new Gllue(credentials.apiHost as string, token, this.helpers.request);
		const simpleData = await gllue.getDetail(resource, resourceId,
			'id,jobsubmission__candidate__email,gllueext_send_terms_cv_sent');

		const candidateData = Gllue.extractIdAndEmail(simpleData);
		const source = item.source as string;
		const consentService = new ConsentService(this.helpers.request);
		const consented = await consentService.getConsented(candidateData.id, source, EMAIL_CHANNEL);
		const sent = await consentService.getSentIn30Days(candidateData.id, source, EMAIL_CHANNEL);
		const service = new SendEmailOnConsentService(consented, sent, resource, candidateData.cvsentField);

		let emailData = {};
		if (service.canSendEmail()) {
			const saved = await consentService.create(candidateData.id, source, EMAIL_CHANNEL);
			const emailService = new EmailNotificationService(this.helpers.request);
			const email = await emailService.saveConsentEmail(candidateData.email);
			const track_id = email.track_id;
			const updated = await consentService.updateTrackId(saved.id as string, track_id);
			const consentConfirmUrl = buildConsentUrl(saved.id as string);

			emailData = {
				senderEmail: CONSENT_FROM_EMAIL,
				senderName: CONSENT_FROM_NAME,
				recipientEmail: candidateData.email,
				dynamicTemplateFields: {consentLink: consentConfirmUrl},
				category: CONSENT_EMAIL_CATEGORY,
				trackId: track_id,
				emailId: email.id,
				consentId: saved.id,
				externalId: candidateData.id,

			};
		}
		const responseData = service.canSendEmail() ? emailData : [];
		return [this.helpers.returnJsonArray(responseData)];

	}

}

