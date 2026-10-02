import { t, validate, type JsonSchema, type Trigger } from '@n8n/node-sdk';
import { replyContractOf } from '@n8n/node-sdk/registry';
import { FacebookTrigger } from 'n8n-nodes-base/dist/nodes/Facebook/FacebookTrigger.node';
import { Form } from 'n8n-nodes-base/dist/nodes/Form/Form.node';
import { FormTrigger } from 'n8n-nodes-base/dist/nodes/Form/FormTrigger.node';
import { addFormResponseDataToReturnItem } from 'n8n-nodes-base/dist/nodes/Form/utils/utils';
import { RespondToWebhook } from 'n8n-nodes-base/dist/nodes/RespondToWebhook/RespondToWebhook.node';
import { ScheduleTrigger } from 'n8n-nodes-base/dist/nodes/Schedule/ScheduleTrigger.node';
import { Webhook } from 'n8n-nodes-base/dist/nodes/Webhook/Webhook.node';
import { WhatsAppTrigger } from 'n8n-nodes-base/dist/nodes/WhatsApp/WhatsAppTrigger.node';
import { createHmac } from 'node:crypto';
import {
	NodeHelpers,
	type IDataObject,
	type INodeExecutionData,
	type INodeParameters,
	type INodeType,
	type INodeTypeDescription,
	type INodeProperties,
} from 'n8n-workflow';

import { facebookEvent } from '../../nodes/facebook-trigger/actions/trigger';
import { formTrigger } from '../../nodes/form/actions/trigger';
import { scheduleTrigger } from '../../nodes/schedule/actions/trigger';
import { webhookTrigger } from '../../nodes/webhook/actions/trigger';
import { whatsAppEvent } from '../../nodes/whats-app-trigger/actions/trigger';

/** The description n8n uses for `version` of a built-in node. */
const descriptionAt = (
	type: { description: INodeTypeDescription } | { getNodeType(version: number): INodeType },
	version: number,
) => ('getNodeType' in type ? type.getNodeType(version).description : type.description);

/** The parameters n8n keeps, with defaults: n8n drops unknown and hidden ones when it loads a node. */
const keptBy = (description: INodeTypeDescription, version: number, parameters: INodeParameters) =>
	NodeHelpers.getNodeParameters(
		description.properties,
		parameters,
		true,
		false,
		{ typeVersion: version },
		description,
	);

/** The option values of the legacy parameter `name` that n8n shows at `version` by default. */
function legacyOptions(description: INodeTypeDescription, version: number, name: string) {
	const defaults = keptBy(description, version, {}) ?? {};
	const shown = description.properties.filter(
		(property: INodeProperties) =>
			property.name === name &&
			NodeHelpers.displayParameter(defaults, property, { typeVersion: version }, description),
	);
	return shown.flatMap((property) =>
		(property.options ?? []).flatMap((option) => ('value' in option ? [option.value] : [])),
	);
}

const enumOf = (schema: JsonSchema | undefined) => schema?.enum ?? [];

const inputOf = (trigger: Trigger) => t.obj(trigger.input).json;
const replyInput =
	(webhookTrigger.kind === 'native' && replyContractOf(webhookTrigger)?.input) || {};
const pageContract = formTrigger.kind === 'native' ? replyContractOf(formTrigger) : undefined;

describe('native trigger contracts against the built-in nodes', () => {
	const webhook = descriptionAt(new Webhook(), 2.2);
	const respond = descriptionAt(new RespondToWebhook(), 1.5);
	const schedule = descriptionAt(new ScheduleTrigger(), 1.4);
	const form = descriptionAt(new FormTrigger(), 2.6);

	it('name the built-in node types and versions', () => {
		const targets = [webhookTrigger, scheduleTrigger, formTrigger].map((trigger: Trigger) =>
			trigger.kind === 'native' ? [trigger.native.type, trigger.native.version] : [],
		);
		expect(targets).toEqual([
			['n8n-nodes-base.webhook', 2.2],
			['n8n-nodes-base.scheduleTrigger', 1.4],
			['n8n-nodes-base.formTrigger', 2.6],
		]);
		expect([webhook.name, schedule.name, form.name, respond.name]).toEqual([
			'webhook',
			'scheduleTrigger',
			'formTrigger',
			'respondToWebhook',
		]);
		expect([webhook.version, schedule.version, form.version]).toEqual(
			expect.arrayContaining([expect.arrayContaining([2.2])]),
		);
	});

	it.each<[string, INodeTypeDescription, number, INodeParameters, JsonSchema]>([
		[
			'webhook, reply by node',
			descriptionAt(new Webhook(), 2.2),
			2.2,
			{ httpMethod: 'POST', path: 'incidents', responseMode: 'responseNode' },
			inputOf(webhookTrigger),
		],
		[
			'webhook, reply with the last node',
			descriptionAt(new Webhook(), 2.2),
			2.2,
			{
				httpMethod: 'POST',
				path: 'files',
				responseMode: 'lastNode',
				responseData: 'firstEntryBinary',
				responseBinaryPropertyName: 'data',
				options: { binaryPropertyName: 'data', rawBody: true },
			},
			inputOf(webhookTrigger),
		],
		[
			'webhook, reply at once',
			descriptionAt(new Webhook(), 2.2),
			2.2,
			{ httpMethod: 'POST', path: 'p', options: { responseData: 'ok', ipWhitelist: '10.0.0.1' } },
			inputOf(webhookTrigger),
		],
		[
			'respond with JSON',
			descriptionAt(new RespondToWebhook(), 1.5),
			1.5,
			{ respondWith: 'json', responseBody: { ok: true }, options: { responseCode: 201 } },
			replyInput,
		],
		[
			'respond with a redirect',
			descriptionAt(new RespondToWebhook(), 1.5),
			1.5,
			{ respondWith: 'redirect', redirectURL: 'https://acme.dev' },
			replyInput,
		],
		[
			'schedule rules',
			descriptionAt(new ScheduleTrigger(), 1.4),
			1.4,
			{
				rule: {
					interval: [
						{ field: 'days', triggerAtHour: 8, triggerAtMinute: 0 },
						{ field: 'weeks', triggerAtDay: [5], triggerAtHour: 17 },
						{ field: 'cronExpression', expression: '0 9 * * 1-5' },
					],
				},
				misfirePolicy: 'skip',
			},
			inputOf(scheduleTrigger),
		],
		[
			'form fields',
			descriptionAt(new FormTrigger(), 2.6),
			2.6,
			{
				formTitle: 'Sign up',
				formFields: {
					values: [
						{ fieldType: 'email', fieldLabel: 'Email', requiredField: true },
						{ fieldType: 'text', fieldLabel: 'Company', fieldName: 'company' },
						{
							fieldType: 'dropdown',
							fieldLabel: 'Plan',
							fieldOptions: { values: [{ option: 'Free' }, { option: 'Pro' }] },
						},
					],
				},
				responseMode: 'onReceived',
				options: { buttonLabel: 'Join' },
			},
			inputOf(formTrigger),
		],
		[
			'form page',
			new Form().description,
			2.5,
			{
				formFields: {
					values: [
						{ fieldType: 'number', fieldLabel: 'Seats', requiredField: true },
						{ fieldType: 'textarea', fieldLabel: 'Notes' },
					],
				},
				limitWaitTime: true,
				limitType: 'afterTimeInterval',
				resumeAmount: 2,
				resumeUnit: 'hours',
				options: { formTitle: 'Step 2', buttonLabel: 'Next' },
			},
			pageContract?.input ?? {},
		],
		[
			'WhatsApp events',
			descriptionAt(new WhatsAppTrigger(), 1),
			1,
			{ updates: ['messages'], options: { messageStatusUpdates: ['read'] } },
			inputOf(whatsAppEvent),
		],
		[
			'Facebook page events',
			descriptionAt(new FacebookTrigger(), 1),
			1,
			{
				authType: 'accessToken',
				appId: '123',
				object: 'page',
				fields: ['feed'],
				options: { includeValues: true },
			},
			inputOf(facebookEvent),
		],
	])(
		'keep every parameter the contract emits: %s',
		(_name, description, version, parameters, input) => {
			expect(validate(parameters, input)).toEqual([]);
			expect(keptBy(description, version, parameters)).toMatchObject(parameters);
		},
	);

	it('offer only option values the built-in nodes have', () => {
		const reply = replyContractOf(
			webhookTrigger.kind === 'native' ? webhookTrigger : (undefined as never),
		);
		const input = t.obj(webhookTrigger.input).json.properties ?? {};
		const pairs: Array<[readonly unknown[], unknown[]]> = [
			[enumOf(input.httpMethod), legacyOptions(webhook, 2.2, 'httpMethod')],
			[enumOf(input.responseMode), legacyOptions(webhook, 2.2, 'responseMode')],
			[enumOf(input.authentication), legacyOptions(webhook, 2.2, 'authentication')],
			[
				(reply?.input.oneOf ?? []).map(({ properties }) => properties?.respondWith?.const),
				legacyOptions(respond, 1.5, 'respondWith'),
			],
			[
				enumOf(t.obj(formTrigger.input).json.properties?.responseMode),
				legacyOptions(form, 2.6, 'responseMode'),
			],
			[
				enumOf(t.obj(formTrigger.input).json.properties?.authentication),
				legacyOptions(form, 2.6, 'authentication'),
			],
		];
		for (const [contract, legacy] of pairs) {
			expect(contract.length).toBeGreaterThan(0);
			expect(legacy).toEqual(expect.arrayContaining([...contract]));
		}
		// Streaming needs a streaming node, and n8n OAuth2 a user token; the contract leaves them out.
		expect(legacyOptions(webhook, 2.2, 'responseMode')).toContain('streaming');
		expect(legacyOptions(webhook, 2.2, 'authentication')).toContain('n8nOAuth2');
	});

	it('type the item the Webhook node emits', async () => {
		const parameters: IDataObject = { httpMethod: 'POST', path: 'incidents', options: {} };
		const request = {
			method: 'POST',
			body: { severity: 'critical' },
			headers: { 'content-type': 'application/json' },
			params: {},
			query: { source: 'pager' },
			ips: [],
			ip: '10.0.0.1',
			contentType: 'application/json',
		};
		const context = {
			getNode: () => ({
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2.2,
				parameters,
			}),
			getNodeParameter: (name: string, fallback?: unknown) => parameters[name] ?? fallback,
			getRequestObject: () => request,
			getResponseObject: () => ({}),
			getChildNodes: () => [],
			getNodeWebhookUrl: () => 'https://n8n.example.com/webhook/incidents',
			getMode: () => 'trigger',
			getCredentials: async () => await Promise.resolve({}),
		};
		const result = await new Webhook().webhook(context as never);
		const [[item]] = result.workflowData ?? [[]];
		expect(item?.json).toEqual({
			headers: request.headers,
			params: {},
			query: request.query,
			body: request.body,
			webhookUrl: 'https://n8n.example.com/webhook/incidents',
			executionMode: 'production',
		});
		expect(validate(item?.json, webhookTrigger.output.json)).toEqual([]);
	});

	it('type the item the Schedule Trigger node emits', async () => {
		const emitted: INodeExecutionData[][][] = [];
		const context = {
			getNode: () => ({ id: 'n1', name: 'Schedule', typeVersion: 1.4 }),
			getNodeParameter: () => ({
				interval: [{ field: 'days', triggerAtHour: 8, triggerAtMinute: 0 }],
			}),
			getTimezone: () => 'Europe/Berlin',
			getWorkflowStaticData: () => ({}),
			getWorkflow: () => ({ id: 'w1' }),
			getMode: () => 'manual',
			emit: (data: INodeExecutionData[][]) => emitted.push(data),
			helpers: { returnJsonArray: (items: IDataObject[]) => items.map((json) => ({ json })) },
		};
		const { manualTriggerFunction } = await new ScheduleTrigger().trigger.call(context as never);
		await manualTriggerFunction?.();
		const item = emitted[0]?.[0]?.[0];
		expect(validate(item?.json, scheduleTrigger.output.json)).toEqual([]);
	});

	/** A webhook context for a Meta trigger: the delivery is signed with the app secret. */
	function metaDelivery(body: IDataObject, parameters: IDataObject, signature: string) {
		const rawBody = Buffer.from(JSON.stringify(body));
		const [algorithm, header] = signature.split(':');
		const digest = createHmac(algorithm ?? '', 'secret')
			.update(rawBody)
			.digest('hex');
		return {
			getBodyData: () => body,
			getQueryData: () => ({}),
			getHeaderData: () => ({ [header ?? '']: `${algorithm}=${digest}` }),
			getRequestObject: () => ({ rawBody }),
			getResponseObject: () => ({}),
			getWebhookName: () => 'default',
			getNode: () => ({ id: 'n1' }),
			getNodeParameter: (name: string, fallback?: unknown) => parameters[name] ?? fallback,
			getCredentials: async () =>
				await Promise.resolve({ clientSecret: 'secret', appSecret: 'secret' }),
			helpers: { returnJsonArray: (items: IDataObject[]) => items.map((json) => ({ json })) },
		};
	}

	it('type the items the WhatsApp and Facebook Trigger nodes emit', async () => {
		const value = {
			messaging_product: 'whatsapp',
			metadata: { display_phone_number: '15550001111', phone_number_id: '42' },
			contacts: [{ profile: { name: 'Ada' }, wa_id: '4915112345678' }],
			messages: [
				{
					from: '4915112345678',
					id: 'wamid.1',
					timestamp: '1700000000',
					type: 'text',
					text: { body: 'Please renew my plan' },
				},
			],
		};
		const whatsApp = await new WhatsAppTrigger().webhook.call(
			metaDelivery(
				{
					object: 'whatsapp_business_account',
					entry: [{ id: 'w1', changes: [{ field: 'messages', value }] }],
				},
				{ options: {} },
				'sha256:x-hub-signature-256',
			) as never,
		);
		const [whatsAppItem] = whatsApp.workflowData?.[0] ?? [];
		expect(whatsAppItem?.json).toEqual({ ...value, field: 'messages' });
		expect(validate(whatsAppItem?.json, whatsAppEvent.output.json)).toEqual([]);

		const entry = {
			id: 'page1',
			time: 1700000000,
			changes: [
				{
					field: 'feed',
					value: {
						item: 'comment',
						verb: 'add',
						from: { id: 'u1', name: 'Ada' },
						message: 'Nice post',
						post_id: 'page1_1',
						comment_id: 'page1_1_2',
						created_time: 1700000000,
					},
				},
			],
		};
		const facebook = await new FacebookTrigger().webhook.call(
			metaDelivery(
				{ object: 'page', entry: [entry] },
				{ authType: 'accessToken' },
				'sha1:x-hub-signature',
			) as never,
		);
		const [facebookItem] = facebook.workflowData?.[0] ?? [];
		expect(facebookItem?.json).toEqual(entry);
		expect(validate(facebookItem?.json, facebookEvent.output.json)).toEqual([]);
	});

	it('name and type each form field as the contract output does', () => {
		const formFields: Array<{
			fieldType: string;
			fieldLabel: string;
			fieldName?: string;
			requiredField?: boolean;
			multipleFiles?: boolean;
		}> = [
			{ fieldType: 'email', fieldLabel: 'Email', requiredField: true },
			{ fieldType: 'text', fieldLabel: 'Company name', fieldName: 'company' },
			{ fieldType: 'number', fieldLabel: 'Seats' },
			{ fieldType: 'checkbox', fieldLabel: 'Topics' },
			{ fieldType: 'text', fieldLabel: 'Note' },
			{ fieldType: 'file', fieldLabel: 'Resume', multipleFiles: true },
			{ fieldType: 'file', fieldLabel: 'Photo', multipleFiles: false },
		];
		const file = { filename: 'cv.pdf', mimetype: 'application/pdf', size: 3 };
		const item: INodeExecutionData = { json: {} };
		addFormResponseDataToReturnItem(
			item,
			formFields,
			{
				'field-0': 'ada@acme.dev',
				'field-1': ' Acme ',
				'field-2': '3',
				'field-3': '["AI"]',
				'field-5': file,
				'field-6': file,
			},
			2.6,
		);
		expect(item.json).toEqual({
			Email: 'ada@acme.dev',
			company: 'Acme',
			Seats: 3,
			Topics: ['AI'],
			Note: null,
			Resume: [file],
			Photo: file,
		});
		const entries = formTrigger.output.json['x-n8n-entry-fields'];
		expect(entries?.key).toEqual(['fieldName', 'fieldLabel', 'elementName']);
		// Each value matches the type that `FormTriggerFields` gives its entry.
		const issues = formFields.flatMap((field) => {
			const key = field.fieldName ?? field.fieldLabel;
			const type = entries?.types[field.fieldType] ?? entries?.fallback ?? {};
			const value = item.json[key];
			return field.requiredField || value !== null ? validate(value, type, { path: key }) : [];
		});
		expect(issues).toEqual([]);
	});

	it('emit a form page as the built-in Form node: next page, fields typed as the trigger types them', () => {
		const description = new Form().description;
		expect([description.name, description.version]).toEqual([
			'form',
			expect.arrayContaining([2.5]),
		]);
		expect(keptBy(description, 2.5, {})).toMatchObject({ operation: 'page' });
		expect(pageContract?.id).toBe('form.page');
		const formFields = [
			{ fieldType: 'number', fieldLabel: 'Seats', requiredField: true },
			{ fieldType: 'text', fieldLabel: 'Notes' },
		];
		const item: INodeExecutionData = { json: {} };
		addFormResponseDataToReturnItem(item, formFields, { 'field-0': '4' }, 2.5);
		const json: IDataObject = {
			...item.json,
			submittedAt: '2026-01-01T00:00:00.000Z',
			formMode: 'test',
		};
		expect(json).toEqual({
			Seats: 4,
			Notes: null,
			submittedAt: json.submittedAt,
			formMode: 'test',
		});
		const { Seats, Notes, ...base } = json;
		expect(validate(base, pageContract?.output ?? {})).toEqual([]);
		const entries = pageContract?.output['x-n8n-entry-fields'];
		expect(validate(Seats, entries?.types.number ?? {})).toEqual([]);
		expect(Notes).toBeNull();
		expect(pageContract?.output['x-n8n-entry-fields']).toEqual(
			formTrigger.output.json['x-n8n-entry-fields'],
		);
	});
});
